/**
 * Brand color palette — single source of truth for all accent colors.
 *
 * These are theme-independent "bright" colors used for genre chips, feature cards,
 * badges, star fills, and decorative elements.
 *
 * For theme-adaptive gold/amber (muted in light, bright in dark), use the CSS
 * custom properties `var(--pc-gold)` and `var(--pc-amber)` instead.
 *
 * Hex alpha suffixes: append to palette value for transparent variants.
 *   `${palette.gold}18` ≈ 9%   `${palette.gold}25` ≈ 15%
 *   `${palette.gold}30` ≈ 19%  `${palette.gold}50` ≈ 31%
 */
export const palette = {
  gold: '#F5C518',
  amber: '#FF9F1C',
  purple: '#8B5CF6',
  purpleLight: '#A78BFA',
  teal: '#14B8A6',
  red: '#EF4444',
  pink: '#EC4899',
  gray: '#6B7280',
  green: '#10B981',
  blue: '#60A5FA',
} as const;
