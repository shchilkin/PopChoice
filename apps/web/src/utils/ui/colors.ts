// Color pairs for person identification - each person gets a unique color combination
export const COLOR_PAIRS = [
  { first: '#f20000', second: '#fff' }, // Classic red and white
  { first: '#0066cc', second: '#ffeb3b' }, // Blue and yellow
  { first: '#4caf50', second: '#e91e63' }, // Green and pink
  { first: '#ff9800', second: '#9c27b0' }, // Orange and purple
  { first: '#795548', second: '#00bcd4' }, // Brown and cyan
  { first: '#607d8b', second: '#ff5722' }, // Blue-grey and deep orange
  { first: '#3f51b5', second: '#cddc39' }, // Indigo and lime
  { first: '#e91e63', second: '#ffc107' }, // Pink and amber
  { first: '#009688', second: '#ff1744' }, // Teal and red accent
  { first: '#673ab7', second: '#8bc34a' }, // Deep purple and light green
];

// Generate consistent colors for a person based on their index
export const getPersonColors = (personIndex: number) => {
  return COLOR_PAIRS[personIndex % COLOR_PAIRS.length];
};
