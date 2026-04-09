'use client';

import { CtaSection } from './components/CtaSection';
import { FeaturesSection } from './components/FeaturesSection';
import { HeroSection } from './components/HeroSection';

export default function LandingPage() {
  return (
    <div style={{ fontFamily: "var(--font-dm-sans), 'DM Sans', 'Inter', sans-serif" }}>
      <HeroSection />
      <FeaturesSection />
      <CtaSection />
    </div>
  );
}
