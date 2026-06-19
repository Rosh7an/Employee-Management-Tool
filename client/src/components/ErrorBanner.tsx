import { AxiosError } from 'axios';

interface Props {
  error: unknown;
  message?: string;
}

function extractMessage(error: unknown): string {
  if (!error) return 'An error occurred.';
  const axErr = error as AxiosError<{ error?: { message?: string } }>;
  return axErr.response?.data?.error?.message || (error as Error).message || 'An error occurred.';
}

export function ErrorBanner({ error, message }: Props) {
  return (
    <div className="error-banner" role="alert">
      {message || extractMessage(error)}
    </div>
  );
}
