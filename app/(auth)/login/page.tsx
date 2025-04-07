'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from '@/components/toast';
import { AuthForm } from '@/components/auth-form';
import { SubmitButton } from '@/components/submit-button';
import { login, type LoginActionState } from '../actions';

export default function Page() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isSuccessful, setIsSuccessful] = useState(false);
  const [state, setState] = useState<LoginActionState>({ status: 'idle' });

  const formAction = async (formData: FormData) => {
    try {
      setState({ status: 'in_progress' });
      const result = await login(formData);
      console.log('Login result:', result); // Debug log
      setState(result);
    } catch (error) {
      console.error('Login error:', error);
      setState({ status: 'failed' });
    }
  };

  useEffect(() => {
    const handleLoginState = async () => {
      console.log('Current state:', state); // Debug state
      console.log('State chatId:', state.chatId);
      if (state.status === 'success' && state.chatId) {
        try {
          setIsSuccessful(true);
          console.log('Login successful, attempting navigation to chat:', state.chatId);

          // Validate chat ID
          if (!state.chatId || !/^[0-9a-fA-F-]{36}$/.test(state.chatId)) {
            console.error('Invalid chat ID:', state.chatId);
            toast({
              type: 'error',
              description: 'Invalid chat ID received!',
            });
            return;
          }

          // Direct navigation without API check
          console.log('Navigating to:', `/chat/${state.chatId}`);
          router.push(`/chat/${state.chatId}`);
          
        } catch (error) {
          console.error('Navigation error:', error);
          toast({
            type: 'error',
            description: 'Error accessing chat page. Please try again.',
          });
        }
      } else if (state.status === 'failed') {
        toast({
          type: 'error',
          description: 'Invalid credentials!',
        });
      } else if (state.status === 'invalid_data') {
        toast({
          type: 'error',
          description: 'Failed validating your submission!',
        });
      } else if (state.status === 'user_not_found') {
        toast({
          type: 'error',
          description: 'User not found!',
        });
      } else if (state.status === 'not_authorized') {
        toast({
          type: 'error',
          description: 'Incorrect username or password!',
        });
      } else if (state.status !== 'idle' && state.status !== 'in_progress') {
        console.error('Unexpected state:', state);
        toast({
          type: 'error',
          description: 'An unexpected error occurred!',
        });
      }
    };

    handleLoginState();
  }, [state, router]);

  const handleSubmit = (formData: FormData) => {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
      toast({
        type: 'error',
        description: 'Email and password are required!',
      });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({
        type: 'error',
        description: 'Invalid email format!',
      });
      return;
    }

    setEmail(email);
    formAction(formData);
  };

  return (
    <div className="flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
      <div className="w-full max-w-md overflow-hidden rounded-2xl flex flex-col gap-12">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="text-xl font-semibold dark:text-zinc-50">Sign In</h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Use your email and password to sign in
          </p>
        </div>
        <AuthForm action={handleSubmit} defaultEmail={email}>
          <SubmitButton
            isSuccessful={isSuccessful}
            disabled={state.status === 'in_progress'}
          >
            Sign in
          </SubmitButton>
          <p className="text-center text-sm text-gray-600 mt-4 dark:text-zinc-400">
            {"Don't have an account? "}
            <Link
              href="/register"
              className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
            >
              Sign up
            </Link>
            {' for free.'}
          </p>
        </AuthForm>
      </div>
    </div>
  );
}