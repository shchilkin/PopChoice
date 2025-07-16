import { Rubik_Gemstones } from 'next/font/google';

import { Mascot } from '../Mascot/Maskot';

const rubik_Gemstones = Rubik_Gemstones({
  subsets: ['latin', 'cyrillic'],
  weight: '400',
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
    <section id="branding" className="flex flex-col gap-4 mb-8 sm:mb-16 items-center">
      <div className={`w-[${mascotSize}px] h-[${mascotSize}px] flex items-center justify-center`}>
        <Mascot
          firstStripeColor={firstStripeColor}
          secondStripeColor={secondStripeColor}
          width={mascotSize}
          height={mascotSize}
        />
      </div>
      <h1 className={`${rubik_Gemstones.className} font-bold text-5xl text-center`}>PopChoice</h1>
    </section>
  );
};
