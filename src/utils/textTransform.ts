export type TextModifier = 'U' | 'L' | 'P';

export function applyTextModifier(text: string, modifier?: TextModifier): string {
  if (!modifier) return text;
  switch (modifier) {
    case 'U': return text.toUpperCase();
    case 'L': return text.toLowerCase();
    case 'P': return toProperCase(text);
    default: return text;
  }
}

function toProperCase(text: string): string {
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
