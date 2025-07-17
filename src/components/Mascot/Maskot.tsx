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

  const popcornShape = useMemo(() => {
    // Extract the path from the provided SVG and normalize it for confetti
    const popcornPath =
      'M517.707,270.612L516.752,265.695L517.92,258.202L520.394,253.265L524.87,248.347C528.143,245.633 533.465,243.028 539.989,241.437C548.875,239.271 560.827,238.528 566.134,238.187C575.058,237.612 584.264,240.004 592.759,243.811C595.36,244.977 598.317,246.473 601.154,247.98C601.921,245.529 602.596,243.214 602.961,241.59C603.906,237.381 606.22,232.266 609.816,227.07C615.641,218.654 625.135,209.35 632.269,203.944C640.646,197.594 668.773,189.583 681.571,189.583C697.032,189.583 714.418,195.629 726.886,202.552C738.857,209.198 748.109,219.007 758.739,235.981C763.606,243.752 766.255,254.017 767.244,264.584C767.851,271.08 767.951,279.61 767.922,285.881C790.89,294.454 806.181,312.361 812.114,333.909C821.424,367.716 805.268,397.816 803.821,400.413L803.646,401.893L801.899,406.822C800.423,409.936 797.548,414.135 793.346,418.557C782.514,429.954 761.733,443.969 746.164,446.314C741.411,447.03 733.128,445.876 723.508,442.399C712.125,438.284 697.063,430.631 687.369,428.143C685.859,429.125 683.465,430.717 681.701,432.064C676.936,435.702 671.75,440.013 666.608,443.846C656.9,451.084 646.875,456.275 638.919,457.217C629.533,458.329 617.192,453.875 604.946,445.821C598.829,441.798 592.525,437.035 586.568,432.985C583.533,430.921 580.763,428.92 578.228,427.814C576.704,428.595 573.805,430.116 571.955,431.304C567.059,434.445 561.984,437.928 557.019,440.524C548.923,444.756 540.783,446.718 533.353,445.787L528.299,444.71L523.353,442.707L514.853,436.364C498.589,419.618 499.198,404.145 503.417,390.599C504.792,386.183 507.526,379.736 508.956,376.457C506.71,376.163 503.736,375.761 502.167,375.495L494.392,373.143L487.358,367.961L484.679,364.285L482.823,360.078L481.845,355.068L482.186,348.671C482.934,344.502 485.348,338.068 491.419,328.813C498.641,317.806 494.888,311.065 494.11,305.109C493.126,297.584 493.645,290.476 497.706,282.804L501.145,277.943L505.703,274.16L510.497,271.864L514.831,270.788C515.622,270.663 516.608,270.611 517.707,270.612Z';

    // Scale down the path for confetti use - the original is quite large
    const scaledPath = popcornPath.replace(/(\d+\.?\d*)/g, (match) => {
      const num = parseFloat(match);
      return (num * 0.05).toString(); // Scale down by 95%
    });

    return confetti.shapeFromPath({ path: scaledPath });
  }, []);

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      const rect = mascotRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Calculate the click position relative to the viewport
      const x = event.clientX / window.innerWidth;
      const y = event.clientY / window.innerHeight;

      if (refAnimationInstance.current) {
        // First burst - custom popcorn shapes
        refAnimationInstance.current({
          particleCount: 50,
          spread: 70,
          origin: { x, y },
          colors: ['#F7B017', '#F7B017', '#F7B017', '#F7B017'],
          shapes: [popcornShape],
          scalar: 1.5,
          gravity: 0.8,
          drift: 0.1,
          ticks: 300,
        });
      }
    },
    [popcornShape],
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

export default Mascot;
