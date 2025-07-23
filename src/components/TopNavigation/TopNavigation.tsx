import { Rubik_Gemstones } from 'next/font/google';
import Link from 'next/link';

import { Mascot } from '../Mascot/Maskot';

const rubik_Gemstones = Rubik_Gemstones({
  subsets: ['latin', 'cyrillic'],
  weight: '400',
});

interface TopNavigationProps {
  firstStripeColor?: string;
  secondStripeColor?: string;
  logoSize?: number;
}

export const TopNavigation = ({
  firstStripeColor = '#f20000',
  secondStripeColor = '#fff',
  logoSize = 60,
}: TopNavigationProps) => {
  return (
    <nav className="w-full flex items-center justify-start gap-1 mb-8 sm:mb-12">
      <div
        className={`w-[${logoSize}px] h-[${logoSize}px] flex items-center justify-center flex-shrink-0`}
      >
        <Mascot
          firstStripeColor={firstStripeColor}
          secondStripeColor={secondStripeColor}
          width={logoSize}
          height={logoSize}
        />
      </div>
      <Link href="/" className="block">
        <h1
          className={`${rubik_Gemstones.className} font-bold text-4xl hover:opacity-80 transition-opacity`}
        >
          PopChoice
        </h1>
      </Link>
    </nav>
  );
};
