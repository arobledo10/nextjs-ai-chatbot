"use server";

import { CognitoIdentityProviderClient, SignUpCommand, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import { z } from 'zod';
import crypto from 'crypto'; 
import { getUser, createUser, saveChat } from '@/lib/db/queries';
import { v4 as uuidv4 } from 'uuid';

console.log("COGNITO_CLIENT_ID", process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID);
console.log("COGNITO_REGION", process.env.NEXT_PUBLIC_COGNITO_REGION);
console.log("COGNITO_CLIENT_SECRET", process.env.NEXT_PUBLIC_COGNITO_CLIENT_SECRET);

// Validación de variables de entorno
if (!process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID) {
  throw new Error('Missing COGNITO_CLIENT_ID environment variable');
}
if (!process.env.NEXT_PUBLIC_COGNITO_REGION) {
  throw new Error('Missing COGNITO_REGION environment variable');
}
if (!process.env.NEXT_PUBLIC_COGNITO_CLIENT_SECRET) {
  throw new Error('Missing COGNITO_CLIENT_SECRET environment variable');
}

const authFormSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[@$!%*?&#]/, 'Password must contain at least one special character'),
});

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.NEXT_PUBLIC_COGNITO_REGION,
});
const USER_POOL_CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!;
const CLIENT_SECRET = process.env.NEXT_PUBLIC_COGNITO_CLIENT_SECRET!;

// Función para calcular el SECRET_HASH
function calculateSecretHash(username: string): string {
  const hmac = crypto.createHmac('sha256', CLIENT_SECRET);
  hmac.update(username + USER_POOL_CLIENT_ID);
  return hmac.digest('base64');
}

// Define RegisterActionState
export type RegisterActionState = {
  status: 'idle' | 'in_progress' | 'success' | 'failed' | 'invalid_data' | 'user_exists';
  message?: string;
};

// Acción de registro
export const register = async (formData: FormData): Promise<RegisterActionState> => {
  try {
    const validatedData = authFormSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
    });

    const command = new SignUpCommand({
      ClientId: USER_POOL_CLIENT_ID,
      Username: validatedData.email,
      Password: validatedData.password,
      SecretHash: calculateSecretHash(validatedData.email), // Incluye el SECRET_HASH aquí
    });

    await cognitoClient.send(command);

    return { status: 'success', message: 'Account created successfully!' };
  } catch (error: any) {
    if (error.name === 'UsernameExistsException') {
      return { status: 'user_exists', message: 'This email is already registered' };
    } else if (error.name === 'InvalidPasswordException') {
      return { status: 'invalid_data', message: error.message };
    } else if (error.name === 'InvalidParameterException') {
      return { status: 'invalid_data', message: error.message };
    }

    console.error('Error during Cognito registration:', error);
    return { status: 'failed', message: error.message || 'An unknown error occurred' };
  }
};

// Define LoginActionState
export type LoginActionState = {
  status: 'idle' | 'in_progress' | 'success' | 'failed' | 'invalid_data' | 'user_not_found' | 'not_authorized';
  chatId?: string;
  message?: string;
  accessToken?: string;
  idToken?: string;
  refreshToken?: string;
};

// Acción de login
export const login = async (formData: FormData): Promise<LoginActionState> => {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { status: 'invalid_data', message: 'Email and password are required' };
  }

  try {
    const command = new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: USER_POOL_CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
        SECRET_HASH: calculateSecretHash(email),
      },
    });

    const response = await cognitoClient.send(command);

    if (response.AuthenticationResult) {
      // Verifica si el usuario ya existe
      let user = await getUser(email);
      let userId: string;

      if (!user) {
        // Si el usuario no existe, créalo
        userId = await createUser(email, password);
      } else {
        userId = user.id;
      }

      // Crea un nuevo chat para el usuario
      const chatId = uuidv4();
      await saveChat({
        id: chatId,
        userId,
        title: 'New Chat',
      });

      return {
        status: 'success',
        chatId,
        accessToken: response.AuthenticationResult.AccessToken,
        idToken: response.AuthenticationResult.IdToken,
        refreshToken: response.AuthenticationResult.RefreshToken,
      };
    }

    return { status: 'failed', message: 'Authentication failed' };
  } catch (error: any) {
    if (error.name === 'NotAuthorizedException') {
      return { status: 'not_authorized', message: 'Incorrect username or password' };
    } else if (error.name === 'UserNotFoundException') {
      return { status: 'user_not_found', message: 'User not found' };
    }

    console.error('Error during Cognito login:', error);
    return { status: 'failed', message: error.message || 'An unknown error occurred' };
  }
};