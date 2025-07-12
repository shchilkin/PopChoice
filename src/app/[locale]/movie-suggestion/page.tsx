'use client';

import { Branding, Button, LocaleSwitcher } from '@/components';
import { SuggestionCard } from '@/components/SuggestionCard';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function MovieSuggestionPage() {
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations('recommendation');
  const tButtons = useTranslations('buttons');
  const tErrors = useTranslations('errors');

  const [title, setTitle] = useState(t('title'));
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const rec = localStorage.getItem('popchoice_recommendation');
      if (rec) {
        try {
          const parsed = JSON.parse(rec);
          setTitle(parsed.title || t('title'));
          setDescription(parsed.description || t('noDescription'));
        } catch {
          setTitle(t('title'));
          setDescription(rec);
        }
      } else {
        setTitle(t('title'));
        setDescription(tErrors('noRecommendation'));
      }
    }
  }, [t, tErrors]);

  return (
    <div className="flex flex-col items-center justify-items-center min-h-screen p-4 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)] relative">
      <LocaleSwitcher />
      <main className="flex flex-col w-full items-center max-w-md mx-auto">
        <Branding />
        <SuggestionCard title={title} description={description} />
        <Link href={`/${locale}`} passHref className="w-full">
          <Button
            className="w-full"
            onClick={() => {
              localStorage.removeItem('popchoice_recommendation');
            }}
          >
            {tButtons('tryAgain')}
          </Button>
        </Link>
      </main>
    </div>
  );
}
