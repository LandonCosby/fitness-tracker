// The app is dark-only (also set by "userInterfaceStyle": "dark" in app.json, which keeps
// native alerts and keyboards dark). Colors.light is kept so a light mode can return later:
// read React Native's useColorScheme() here again to follow the phone setting.
export const useColorScheme = (): 'light' | 'dark' => 'dark';
