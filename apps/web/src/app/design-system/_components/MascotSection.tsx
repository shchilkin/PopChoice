'use client';

import { Mascot } from '@/components/Mascot';
import { useLanguage } from '@/i18n';

export function MascotSection() {
  const { t } = useLanguage();
  const m = t.styleGuide.mascotSection;
  return (
    <div className="grid gap-12 sm:grid-cols-2 items-start">
      <div className="flex items-start gap-6">
        <div className="shrink-0">
          <Mascot width={110} height={110} />
        </div>
        <div>
          <p className="text-sm font-bold mb-2" style={{ color: 'var(--pc-t1)' }}>
            {m.name}
          </p>
          <p className="text-sm" style={{ color: 'var(--pc-t2)', lineHeight: 1.7 }}>
            {m.desc}
          </p>
          <p
            className="mt-4 text-xs font-semibold uppercase tracking-widest"
            style={{ color: 'var(--pc-t4)' }}
          >
            {m.clickIt}
          </p>
        </div>
      </div>

      <div>
        {[
          { label: m.stripeColorsLabel, value: m.stripeColorsValue },
          { label: m.kernelFillLabel, value: m.kernelFillValue },
          { label: m.interactionLabel, value: m.interactionValue },
          { label: m.usageLabel, value: m.usageValue },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="flex gap-4 py-4"
            style={{ borderBottom: '1px solid var(--pc-bd1)' }}
          >
            <span
              className="text-xs font-semibold shrink-0 mt-0.5"
              style={{ color: 'var(--pc-t3)', width: '7rem' }}
            >
              {label}
            </span>
            <span className="text-sm" style={{ color: 'var(--pc-t2)', lineHeight: 1.6 }}>
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
