// App palette. Dark is the primary look: a near-black base, filled card surfaces,
// one bold accent (tint) and green for completed sets.
//
// Text on a tint-filled button uses `background` (see Chip, the Start buttons, etc.),
// so `background` must stay readable on `tint` in both modes.
//
// Surfaces, from back to front: background → card → cardRaised (inputs, pills inside cards).

const accentDark = '#FF6A1F';
// Darker in light mode so tint text on white and light text on tint both stay readable.
const accentLight = '#C2410C';

export default {
  light: {
    text: '#0B0B0F',
    background: '#F2F2F5',
    tint: accentLight,
    tintSoft: 'rgba(194, 65, 12, 0.12)',
    tabIconDefault: '#9A9AA2',
    tabIconSelected: accentLight,
    muted: '#6B6B74',
    border: '#E1E1E6',
    inputBorder: '#D6D6DC',
    card: '#FFFFFF',
    cardRaised: '#EDEDF1',
    bodyIdle: '#C9C9D1',
    danger: '#D70015',
    success: '#1F9D55',
    successSoft: 'rgba(31, 157, 85, 0.14)',
    // Charts: series blue validated against this surface (dataviz palette slot 1).
    chartSeries: '#2a78d6',
    chartGrid: '#e1e0d9',
    chartAxis: '#c3c2b7',
    textSecondary: '#52514e',
  },
  dark: {
    text: '#F5F5F7',
    background: '#0A0A0C',
    tint: accentDark,
    tintSoft: 'rgba(255, 106, 31, 0.16)',
    tabIconDefault: '#6B6B73',
    tabIconSelected: accentDark,
    muted: '#8E8E96',
    border: '#26262C',
    inputBorder: 'transparent',
    card: '#16161A',
    cardRaised: '#24242A',
    bodyIdle: '#3A3A44',
    danger: '#FF5A5F',
    success: '#34D399',
    successSoft: 'rgba(52, 211, 153, 0.15)',
    chartSeries: '#3987e5',
    chartGrid: '#2c2c2a',
    chartAxis: '#383835',
    textSecondary: '#c3c2b7',
  },
};
