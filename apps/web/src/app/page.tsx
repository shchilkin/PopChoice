'use client';

import { FAQSection } from './about/components/FAQSection';
import { HowItWorksSection } from './about/components/HowItWorksSection';
import { CtaSection } from './components/CtaSection';
import { FeaturesSection } from './components/FeaturesSection';
import { HeroSection } from './components/HeroSection';
import { ModesSection } from './components/ModesSection';

export default function LandingPage() {
  return (
    <div style={{ fontFamily: "var(--font-manrope), 'Manrope', 'Inter', sans-serif" }}>
      <HeroSection />
      <ModesSection />
      <FeaturesSection />
      <section id="how-it-works" className="px-5 py-20 max-w-3xl mx-auto w-full">
        <HowItWorksSection />
      </section>
      <section className="px-5 pb-20 max-w-3xl mx-auto w-full">
        <FAQSection />
      </section>
      <CtaSection />
    </div>
  );
}
