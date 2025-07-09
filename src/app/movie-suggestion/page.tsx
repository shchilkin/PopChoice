import { Branding, Button } from '@/components';
import { SuggestionCard } from '@/components/SuggestionCard';
import Link from 'next/link';

export default function MovieSuggestionPage() {
  return (
    <div className="flex flex-col items-center justify-items-center min-h-screen p-4 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col w-full items-center max-w-md mx-auto">
        <Branding />
        <SuggestionCard title="Movie title" description="Description of the movie goes here." />
        <Link href="/" passHref className="w-full">
          <Button className="w-full">Try again</Button>
        </Link>
      </main>
    </div>
  );
}
