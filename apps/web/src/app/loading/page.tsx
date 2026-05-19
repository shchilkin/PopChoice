import { redirect } from 'next/navigation';

export default function LegacyLoadingPage() {
  redirect('/quiz');
}
