import React from 'react';

/**
 * ColorSwatch — renders a square swatch with a label below it.
 *
 * @param token   CSS custom property name, e.g. '--pc-bg'. When provided the
 *                swatch background is `var(token)` so it responds to the
 *                Storybook theme toggle.
 * @param hex     Optional fixed hex fallback (used when the colour is not a
 *                CSS var, e.g. genre pill colours).
 * @param label   Short human-readable name shown below the swatch.
 * @param description  Optional second line (e.g. token name or hex value).
 */
export interface ColorSwatchProps {
  token?: string;
  hex?: string;
  label: string;
  description?: string;
  size?: number;
  borderRadius?: number | string;
}

export const ColorSwatch: React.FC<ColorSwatchProps> = ({
  token,
  hex,
  label,
  description,
  size = 80,
  borderRadius = 8,
}) => {
  const bg = token ? `var(${token})` : (hex ?? 'transparent');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        minWidth: size,
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius,
          background: bg,
          border: '1px solid rgba(128,128,128,0.2)',
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: 'var(--pc-t1)',
          textAlign: 'center',
          maxWidth: size + 20,
        }}
      >
        {label}
      </span>
      {description && (
        <span
          style={{
            fontSize: '0.65rem',
            color: 'var(--pc-t3)',
            textAlign: 'center',
            maxWidth: size + 20,
          }}
        >
          {description}
        </span>
      )}
    </div>
  );
};

/**
 * SectionHeader — consistent H2 for design-system story sections.
 */
export const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2
    style={{
      fontFamily: 'Oswald, sans-serif',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.07em',
      fontSize: '1.4rem',
      color: 'var(--pc-t1)',
      margin: '2.5rem 0 1rem',
      borderBottom: '2px solid var(--pc-gold)',
      paddingBottom: '0.4rem',
    }}
  >
    {children}
  </h2>
);

/**
 * SwatchRow — a flex row that wraps swatches neatly.
 */
export const SwatchRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'flex-start' }}>
    {children}
  </div>
);

/**
 * GradientSwatch — like ColorSwatch but for gradient backgrounds.
 */
export interface GradientSwatchProps {
  gradient: string;
  label: string;
  token?: string;
  width?: number;
  height?: number;
}

export const GradientSwatch: React.FC<GradientSwatchProps> = ({
  gradient,
  label,
  token,
  width = 140,
  height = 60,
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: width }}>
    <div
      style={{
        width,
        height,
        borderRadius: 8,
        background: gradient,
        border: '1px solid rgba(128,128,128,0.2)',
      }}
    />
    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--pc-t1)' }}>{label}</span>
    {token && (
      <code
        style={{
          fontSize: '0.65rem',
          color: 'var(--pc-t3)',
          background: 'var(--pc-surface-deep)',
          padding: '2px 4px',
          borderRadius: 4,
        }}
      >
        {token}
      </code>
    )}
  </div>
);
