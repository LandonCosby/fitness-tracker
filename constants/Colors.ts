const tintColorLight = '#2f95dc';
const tintColorDark = '#fff';

export default {
  light: {
    text: '#000',
    background: '#fff',
    tint: tintColorLight,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorLight,
    muted: '#6e6e73',
    border: '#d1d1d6',
    card: '#f2f2f7',
    danger: '#d70015',
    success: '#248a3d',
    // Charts: series blue validated against this surface (dataviz palette slot 1).
    chartSeries: '#2a78d6',
    chartGrid: '#e1e0d9',
    chartAxis: '#c3c2b7',
    textSecondary: '#52514e',
  },
  dark: {
    text: '#fff',
    background: '#000',
    tint: tintColorDark,
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorDark,
    muted: '#98989d',
    border: '#3a3a3c',
    card: '#1c1c1e',
    danger: '#ff6961',
    success: '#30d158',
    chartSeries: '#3987e5',
    chartGrid: '#2c2c2a',
    chartAxis: '#383835',
    textSecondary: '#c3c2b7',
  },
};
