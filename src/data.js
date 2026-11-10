// Placeholder catalogue. Every pair is the house "GH-Runner" silhouette in a
// different colorway, rendered from the 3D model (see tools/render-shots.mjs).
export const products = [
  { id: 'midnight-0', variant: 'midnight', hue: 0, sat: 1, name: 'GH-Runner', cw: '"Wave"', price: 540, chg: 18.2, tags: ['DS', 'Drop 027'], bg: '#dbe6ee' },
  { id: 'street-0', variant: 'street', hue: 0, sat: 1, name: 'GH-Runner', cw: '"Bred"', price: 610, chg: 24.5, tags: ['DS', 'Raffle'], bg: '#ecdcd8' },
  { id: 'midnight-235', variant: 'midnight', hue: 235, sat: 1.25, name: 'GH-Runner', cw: '"Volt"', price: 720, chg: 31.0, tags: ['DS', '1 of 50'], bg: '#e4ecd2' },
  { id: 'beach-0', variant: 'beach', hue: 0, sat: 1, name: 'GH-Runner', cw: '"Rose"', price: 385, chg: -4.1, tags: ['VNDS'], bg: '#efe0e2' },
  { id: 'street-130', variant: 'street', hue: 130, sat: 1.15, name: 'GH-Runner', cw: '"Toxic"', price: 655, chg: 12.9, tags: ['DS'], bg: '#dde8d8' },
  { id: 'midnight-150', variant: 'midnight', hue: 150, sat: 1.2, name: 'GH-Runner', cw: '"Infrared"', price: 575, chg: -2.6, tags: ['VNDS'], bg: '#eedcda' },
  { id: 'beach-200', variant: 'beach', hue: 200, sat: 1.3, name: 'GH-Runner', cw: '"Ice"', price: 455, chg: 6.8, tags: ['DS'], bg: '#dde7ee' },
  { id: 'street-220', variant: 'street', hue: 220, sat: 1, name: 'GH-Runner', cw: '"Royal"', price: 498, chg: 9.4, tags: ['DS'], bg: '#d9e0ee' },
];

// Main colour hue of each base model texture, so the lab can name the result.
export const baseHue = { midnight: 200, beach: 350, street: 0 };
export const baseName = { midnight: 'Wave', beach: 'Rose', street: 'Bred' };

// Colour names for the lab's generated colorway title, by hue band.
export const hueNames = [
  [0, 'Infrared'], [18, 'Ember'], [40, 'Solar'], [62, 'Volt'], [95, 'Toxic'], [140, 'Mint'],
  [170, 'Glacier'], [195, 'Wave'], [225, 'Royal'], [255, 'Grape'], [285, 'Orchid'], [320, 'Rose'], [348, 'Infrared'],
];

export const sizes = [7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 14];
export const soldOut = [7, 8.5, 12.5, 14];
