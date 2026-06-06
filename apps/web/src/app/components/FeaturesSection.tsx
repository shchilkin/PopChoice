'use client';

import { Play, Sparkles, Users, Zap } from 'lucide-react';
import { motion } from 'motion/react';

import { useLanguage } from '@/i18n';
import { palette } from '@/styles/designTokens';

import type { ElementType } from 'react';

// Asymmetric 12-column grid: breaks identical card geometry while keeping group mode prominent
const COL_SPANS = [
  'md:col-span-7', // AI-Powered: wider — the "why"
  'md:col-span-5', // 5 Questions: narrower — the "how"
  'md:col-span-5', // Group Mode: narrower but featured — the "who"
  'md:col-span-7', // Instant Results: wider — the "outcome"
] as const;

export function FeaturesSection() {
  const { t } = useLanguage();

  const features: FeatureCardData[] = [
    {
      icon: Sparkles,
      title: t.features.aiPowered.title,
      desc: t.features.aiPowered.desc,
      color: palette.gold,
      featured: false,
    },
    {
      icon: Play,
      title: t.features.fiveQuestions.title,
      desc: t.features.fiveQuestions.desc,
      color: palette.amber,
      featured: false,
    },
    {
      icon: Users,
      title: t.features.groupMode.title,
      desc: t.features.groupMode.desc,
      color: palette.purple,
      featured: true,
    },
    {
      icon: Zap,
      title: t.features.instantResults.title,
      desc: t.features.instantResults.desc,
      color: palette.teal,
      featured: false,
    },
  ];

  return (
    <section id="features" className="px-5 py-20 max-w-5xl mx-auto w-full">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-14"
      >
        <h2
          className="mb-3"
          style={{
            fontFamily: "var(--font-oswald), 'Oswald', sans-serif",
            fontWeight: '600',
            textTransform: 'uppercase',
            fontSize: 'clamp(2rem, 5vw, 3rem)',
            letterSpacing: '0.05em',
            color: 'var(--pc-t1)',
          }}
        >
          {t.features.headline}
        </h2>
        <p style={{ color: 'var(--pc-t2)', fontSize: '1rem' }}>{t.features.subheadline}</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {features.map((feature, index) => (
          <FeatureCard
            key={feature.title}
            columnClass={COL_SPANS[index]}
            feature={feature}
            index={index}
            worksFor={t.features.groupMode.worksFor}
          />
        ))}
      </div>
    </section>
  );
}

type FeatureCardData = {
  color: string;
  desc: string;
  featured: boolean;
  icon: ElementType;
  title: string;
};

function FeatureCard({
  columnClass,
  feature,
  index,
  worksFor,
}: {
  columnClass: string;
  feature: FeatureCardData;
  index: number;
  worksFor: string;
}) {
  const Icon = feature.icon;
  const styles = getFeatureCardStyles(feature);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={`col-span-1 ${columnClass} rounded-2xl flex flex-col gap-4`}
      style={styles.card}
    >
      <div className="rounded-xl flex items-center justify-center" style={styles.icon}>
        <Icon size={feature.featured ? 24 : 20} />
      </div>
      <div>
        <h3 className="mb-1" style={styles.title}>
          {feature.title}
        </h3>
        <p style={{ color: 'var(--pc-t3)', fontSize: '0.85rem', lineHeight: 1.6 }}>
          {feature.desc}
        </p>
      </div>
      {feature.featured && (
        <p className="mt-auto text-xs font-semibold" style={{ color: feature.color }}>
          {worksFor}
        </p>
      )}
    </motion.div>
  );
}

function getFeatureCardStyles(feature: FeatureCardData) {
  return {
    card: getFeatureCardContainerStyle(feature),
    icon: getFeatureIconStyle(feature),
    title: getFeatureTitleStyle(feature),
  };
}

function getFeatureCardContainerStyle(feature: FeatureCardData) {
  return {
    background: getFeatureCardBackground(feature),
    border: `1px solid ${getFeatureCardBorderColor(feature)}`,
    padding: getFeaturedValue(feature, '2rem', '1.5rem'),
    transition: 'background 0.3s, border-color 0.3s',
  };
}

function getFeatureIconStyle(feature: FeatureCardData) {
  const size = getFeaturedValue(feature, '3rem', '2.5rem');

  return {
    background: `${feature.color}18`,
    color: feature.color,
    height: size,
    width: size,
  };
}

function getFeatureTitleStyle(feature: FeatureCardData) {
  return {
    color: 'var(--pc-t1)',
    fontSize: getFeaturedValue(feature, '1.05rem', '0.95rem'),
    fontWeight: 600,
  };
}

function getFeatureCardBackground(feature: FeatureCardData) {
  return getFeaturedValue(feature, `${feature.color}0d`, 'var(--pc-surface)');
}

function getFeatureCardBorderColor(feature: FeatureCardData) {
  return getFeaturedValue(feature, `${feature.color}30`, 'var(--pc-bd1)');
}

function getFeaturedValue<T>(feature: FeatureCardData, featuredValue: T, defaultValue: T) {
  return feature.featured ? featuredValue : defaultValue;
}
