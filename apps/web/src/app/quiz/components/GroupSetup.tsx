'use client';

import { Plus, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

import { useLanguage } from '@/i18n';
import { palette } from '@/styles/designTokens';

interface GroupSetupProps {
  groupNames: string[];
  onGroupNamesChange: (names: string[]) => void;
  onBack: () => void;
  onStart: () => void;
}

export function GroupSetup({ groupNames, onGroupNamesChange, onBack, onStart }: GroupSetupProps) {
  const { t } = useLanguage();
  const namedPeopleCount = groupNames.filter((name) => name.trim().length > 0).length;
  const canStart = namedPeopleCount >= 2;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-5 py-12 min-h-[80vh]">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">👥</div>
          <h2
            style={{
              fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
              fontWeight: '600',
              textTransform: 'uppercase',
              fontSize: '2rem',
              letterSpacing: '0.05em',
              color: 'var(--pc-t1)',
            }}
          >
            {t.quiz.groupSetup.title}
          </h2>
          <p style={{ color: 'var(--pc-t3)', fontSize: '0.85rem', marginTop: 6 }}>
            {t.quiz.groupSetup.subtitle}
          </p>
        </div>

        <div className="flex flex-col gap-3 mb-6">
          {groupNames.map((name, i) => (
            <div key={i} className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs"
                style={{
                  background: `${palette.purple}33`,
                  color: palette.purpleLight,
                  fontWeight: 700,
                }}
              >
                {i + 1}
              </div>
              <input
                value={name}
                onChange={(e) =>
                  onGroupNamesChange(groupNames.map((n, j) => (j === i ? e.target.value : n)))
                }
                placeholder={t.quiz.groupSetup.personPlaceholder.replace('{n}', String(i + 1))}
                className="flex-1 px-4 py-3 rounded-xl outline-none transition-all duration-200"
                style={{
                  background: 'var(--pc-surface)',
                  border: '1px solid var(--pc-bd2)',
                  color: 'var(--pc-t1)',
                  fontSize: '0.95rem',
                }}
                onFocus={(e) => {
                  (e.currentTarget as HTMLInputElement).style.borderColor = `${palette.purple}80`;
                }}
                onBlur={(e) => {
                  (e.currentTarget as HTMLInputElement).style.borderColor = 'var(--pc-bd2)';
                }}
              />
              {groupNames.length > 2 && (
                <button
                  onClick={() => onGroupNamesChange(groupNames.filter((_, j) => j !== i))}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200"
                  style={{ color: 'var(--pc-t3)' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = palette.red;
                    (e.currentTarget as HTMLElement).style.background = `${palette.red}1a`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = 'var(--pc-t3)';
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>

        {groupNames.length < 6 && (
          <button
            onClick={() => onGroupNamesChange([...groupNames, ''])}
            className="w-full flex items-center gap-2 justify-center py-3 rounded-xl mb-6 text-sm transition-all duration-200"
            style={{
              border: '1px dashed var(--pc-bd4)',
              color: 'var(--pc-t3)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.color = palette.purpleLight;
              (e.currentTarget as HTMLElement).style.borderColor = `${palette.purple}66`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = 'var(--pc-t3)';
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--pc-bd4)';
            }}
          >
            <Plus size={15} /> {t.quiz.groupSetup.addPerson}
          </button>
        )}

        {!canStart && (
          <p className="mb-4 text-center text-xs" style={{ color: 'var(--pc-t4)' }}>
            {t.quiz.groupSetup.twoNamesHint}
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 py-3 rounded-xl text-sm transition-all duration-200"
            style={{
              background: 'var(--pc-ghost)',
              border: '1px solid var(--pc-bd2)',
              color: 'var(--pc-t2)',
            }}
          >
            {t.quiz.groupSetup.back}
          </button>
          <button
            onClick={onStart}
            disabled={!canStart}
            className="flex-1 py-3 rounded-xl text-sm transition-all duration-200"
            style={{
              background: 'var(--pc-cta)',
              color: 'var(--pc-cta-text)',
              fontWeight: 700,
              opacity: canStart ? 1 : 0.5,
              cursor: canStart ? 'pointer' : 'not-allowed',
            }}
          >
            {t.quiz.groupSetup.letsGo}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
