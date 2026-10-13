import { LoaderCircle } from 'lucide-react';

export default function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return <LoaderCircle className={`animate-spin ${className}`} aria-hidden="true" />;
}
