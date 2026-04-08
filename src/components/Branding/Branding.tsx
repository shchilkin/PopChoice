import { Bebas_Neue } from 'next/font/google';

import { Mascot } from '../Mascot/Maskot';

const bebasNeue = Bebas_Neue({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-bebas-neue-branding',
});

interface BrandingProps {
  firstStripeColor?: string;
  secondStripeColor?: string;
  mascotSize?: number;
}

export const Branding = ({
  firstStripeColor = '#f20000',
  secondStripeColor = '#fff',
  mascotSize = 180,
}: BrandingProps) => {
  return (
    <section id="branding" className="flex flex-col gap-4 mt-8 mb-4 sm:mb-8 items-center">
      <div
        className={`flex items-center justify-center`}
        style={{ width: mascotSize, height: mascotSize }}
      >
        <Mascot
          firstStripeColor={firstStripeColor}
          secondStripeColor={secondStripeColor}
          width={mascotSize}
          height={mascotSize}
        />
      </div>
      <h1
        className={`${bebasNeue.className} pc-gradient-text text-center`}
        style={{ fontSize: '3rem', letterSpacing: '0.08em' }}
      >
        PopChoice
      </h1>
    </section>
  );
};
