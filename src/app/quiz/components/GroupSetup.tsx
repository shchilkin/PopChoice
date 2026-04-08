'use client';

import { Plus, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

import { usePCTheme } from '@/hooks/usePCTheme';

interface GroupSetupProps {
  groupNames: string[];
  onGroupNamesChange: (names: string[]) => void;
  onBack: () => void;
  onStart: () => void;
}

export function GroupSetup({ groupNames, onGroupNamesChange, onBack, onStart }: GroupSetupProps) {
  const { isDark } = usePCTheme();
  const ghostBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';

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
              fontFamily: "var(--font-bebas-neue), 'Bebas Neue', sans-serif",
              fontSize: '2rem',
              letterSpacing: '0.05em',
              color: 'var(--pc-t1)',
            }}
          >
            Who&apos;s watching?
          </h2>
          <p style={{ color: 'var(--pc-t3)', fontSize: '0.85rem', marginTop: 6 }}>
            Add everyone&apos;s name so we can tailor the quiz
          </p>
        </div>

        <div className="flex flex-col gap-3 mb-6">
          {groupNames.map((name, i) => (
            <div key={i} className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs"
                style={{
                  background: 'rgba(139,92,246,0.2)',
                  color: '#A78BFA',
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
                placeholder={`Person ${i + 1}'s name`}
                className="flex-1 px-4 py-3 rounded-xl outline-none transition-all duration-200"
                style={{
                  background: 'var(--pc-surface)',
                  border: '1px solid var(--pc-bd2)',
                  color: 'var(--pc-t1)',
                  fontSize: '0.95rem',
                }}
                onFocus={(e) => {
                  (e.currentTarget as HTMLInputElement).style.borderColor = 'rgba(139,92,246,0.5)';
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
                    (e.currentTarget as HTMLElement).style.color = '#EF4444';
                    (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)';
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
              (e.currentTarget as HTMLElement).style.color = '#A78BFA';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.4)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.color = 'var(--pc-t3)';
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--pc-bd4)';
            }}
          >
            <Plus size={15} /> Add another person
          </button>
        )}

        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 py-3 rounded-xl text-sm transition-all duration-200"
            style={{
              background: ghostBg,
              border: '1px solid var(--pc-bd2)',
              color: 'var(--pc-t2)',
            }}
          >
            Back
          </button>
          <button
            onClick={onStart}
            className="flex-1 py-3 rounded-xl text-sm transition-all duration-200"
            style={{
              background: 'var(--pc-cta)',
              color: '#09090F',
              fontWeight: 700,
            }}
          >
            Let&apos;s go!
          </button>
        </div>
      </motion.div>
    </div>
  );
}
