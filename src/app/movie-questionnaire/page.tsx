import { Branding } from '@/components';
import { QuestionsForm } from '@/components/QuestionsForm/StretchGoals/QuestionsForm';
export default function QuestionsPage() {
  return (
    <div className="flex flex-col items-center justify-items-center min-h-screen p-4 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col w-full items-center max-w-md mx-auto">
        <Branding />
        <QuestionsForm />
      </main>
    </div>
  );
}
