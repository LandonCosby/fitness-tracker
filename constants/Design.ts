import type { TextStyle } from 'react-native';

export const FontSize = { caption: 13, body: 15, headline: 17, title: 22, display: 30, hero: 34 } as const;
export const FontWeight = { regular: '400', medium: '500', semibold: '600', bold: '700', heavy: '800' } as const;
export const Space = { none: 0, micro: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, bottom: 48 } as const;
export const Radius = { small: 8, input: 12, button: 16, card: 20, pill: 999 } as const;
export const Typography = {
  display: { fontSize: FontSize.display, fontWeight: FontWeight.heavy, letterSpacing: -0.5 },
  title: { fontSize: FontSize.title, fontWeight: FontWeight.heavy },
  headline: { fontSize: FontSize.headline, fontWeight: FontWeight.bold },
  body: { fontSize: FontSize.body, fontWeight: FontWeight.regular },
  bodyStrong: { fontSize: FontSize.body, fontWeight: FontWeight.semibold },
  label: { fontSize: FontSize.caption, fontWeight: FontWeight.bold, letterSpacing: 0.8 },
  caption: { fontSize: FontSize.caption, fontWeight: FontWeight.regular },
  numeric: { fontSize: FontSize.display, fontWeight: FontWeight.heavy, fontVariant: ['tabular-nums'] },
} satisfies Record<string, TextStyle>;
