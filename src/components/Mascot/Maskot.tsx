import confetti from 'canvas-confetti';
import React, { useCallback, useMemo, useRef } from 'react';
import ReactCanvasConfetti from 'react-canvas-confetti';

import { MascotSVG, MascotSVGProps } from './MascotSVG';

export const Mascot: React.FC<MascotSVGProps> = (props) => {
  const mascotRef = useRef<HTMLDivElement>(null);
  const refAnimationInstance = useRef<confetti.CreateTypes | null>(null);

  const getInstance = useCallback((params: { confetti: confetti.CreateTypes }) => {
    refAnimationInstance.current = params.confetti;
  }, []);

  // Optimized confetti colors - golden popcorn theme
  const confettiColors = useMemo(() => ['#F7B017', '#de9e15', '#f9c85d', '#fbd88b'], []);

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      const rect = mascotRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = event.clientX / window.innerWidth;
      const y = event.clientY / window.innerHeight;

      if (refAnimationInstance.current) {
        refAnimationInstance.current({
          particleCount: 150,
          spread: 180,
          origin: { x, y },
          colors: confettiColors,
          shapes: ['circle'],
          scalar: 1.5,
          gravity: 0.8,
          drift: 0.1,
          ticks: 300,
          startVelocity: 30,
          disableForReducedMotion: true,
        });
      }
    },
    [confettiColors],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        const syntheticMouseEvent = {
          clientX:
            event.currentTarget.getBoundingClientRect().left +
            event.currentTarget.getBoundingClientRect().width / 2,
          clientY:
            event.currentTarget.getBoundingClientRect().top +
            event.currentTarget.getBoundingClientRect().height / 2,
        } as React.MouseEvent;
        handleClick(syntheticMouseEvent);
      }
    },
    [handleClick],
  );

  return (
    <>
      <ReactCanvasConfetti
        onInit={getInstance}
        style={{
          position: 'fixed',
          pointerEvents: 'none',
          width: '100%',
          height: '100%',
          top: 0,
          left: 0,
          zIndex: 1000,
        }}
      />
      <div
        ref={mascotRef}
        onClick={handleClick}
        style={{ cursor: 'pointer', display: 'inline-block' }}
        role="button"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        aria-label="Click for confetti celebration!"
      >
        <MascotSVG {...props} />
      </div>
    </>
  );
};
