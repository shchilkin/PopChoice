import React from 'react';
import Image from 'next/image';

import { Rubik_Gemstones } from 'next/font/google';

const rubik_Gemstones = Rubik_Gemstones({
  subsets: ['latin', 'cyrillic'],
  weight: '400',
});

export const Branding = () => {
  return (
    <section id="branding" className="flex flex-col gap-4 mb-8 sm:mb-16 items-center">
      <Image src="/popcorn.png" alt="PopChoice Logo" width={180} height={180} priority />
      <h1 className={`${rubik_Gemstones.className} font-bold text-5xl text-center`}>PopChoice</h1>
    </section>
  );
};
