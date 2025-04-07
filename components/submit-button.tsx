'use client';

import { LoaderIcon } from '@/components/icons';
import { Button } from './ui/button';

export function SubmitButton({
  children,
  isSuccessful,
  disabled,
}: {
  children: React.ReactNode;
  isSuccessful: boolean;
  disabled?: boolean;
}) {
  return (
    <Button
      type={disabled ? 'button' : 'submit'}
      aria-disabled={disabled || isSuccessful}
      disabled={disabled || isSuccessful}
      className="relative"
    >
      {children}

      {(disabled || isSuccessful) && (
        <span className="animate-spin absolute right-4">
          <LoaderIcon />
        </span>
      )}

      <output aria-live="polite" className="sr-only">
        {disabled || isSuccessful ? 'Loading' : 'Submit form'}
      </output>
    </Button>
  );
}