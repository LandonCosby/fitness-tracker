# Release polish prompts (for Codex)

Visual polish tasks to finish before Forge goes public. Each prompt is self-contained: paste one into Codex at a time, in this repo, on its own branch. They're ordered roughly by impact; 2 (type scale) is worth doing early because later prompts build on it.

Every prompt ends with the same ground rules, so it still works when pasted alone.

**Implementation status (2026-11-07):** The remaining code work for 2, 6, 7, 10, 11, 13, 14 and 16 is implemented. 16 uses the phone-only launch option. 12 now has a generated Google Play feature graphic and a script that composes store screenshots from real captures; those captures remain pending because this workspace has no native emulator or attached phone. Accessibility and native gesture behavior still require device verification before release. Do not interpret bundling or contrast checks as a completed VoiceOver/TalkBack audit.

Shared additions: `constants/Design.ts` (typography/spacing/radii), `MotionPressable`, `MotionRow`, `HeaderAction`, `useUnsavedChanges`, `useFeedback`, and the components in `components/nutrition/`. `npm run check:design` checks typography-token use and dark-theme text contrast. All haptics go through the saved Settings preference. Release database initialization no longer seeds demo history; development builds still do.

See [polish verification](polish-verification.md) for evidence and remaining device checks, and [store assets](store-assets.md) for the capture workflow. The numbered prompts below are retained as the original task specifications, so their descriptions of the old code are historical.

---

## 1. Launch experience (splash + first-run loading)

```
You're working in the Forge fitness app (Expo SDK 58, Expo Router, expo-sqlite). Read AGENTS.md and CLAUDE.md first.

Problem: the app's launch looks unfinished. Testers see a plain white screen with "fitness-tracker" before the app appears. The real splash is configured in app.json (expo-splash-screen plugin: assets/images/splash-icon.png on #0A0A0C, app name "Forge"), but:
- app/_layout.tsx still loads an unused font (SpaceMono) before hiding the splash, which delays launch for nothing.
- <SQLiteProvider onInit={initDatabase}> runs migrations and seeds 739 exercises, ~300 foods and sample data on first launch (db/init.ts). Nothing is shown while that runs.
- Expo Go shows its own loading screen, not ours, so the native splash can only be checked in a development build.

Do this:
1. Remove the SpaceMono font loading (and assets/fonts/SpaceMono-Regular.ttf if nothing else uses it). Keep SplashScreen.preventAutoHideAsync() and hide the splash only when the database is ready.
2. Make the native splash and the first JS frame match exactly (same #0A0A0C background, same centered logo at the same size), so there's no flash or jump when the native splash hides. Check the current expo-splash-screen docs for SDK 58 (https://docs.expo.dev/versions/v58.0.0/sdk/splash-screen/) for fade/duration options.
3. If first-launch setup takes noticeably long, keep a branded in-app loading view (logo, "Forge" wordmark in the accent #FF6A1F, a subtle progress indicator) until onInit finishes, then fade into the Home tab. Use react-native-reanimated (already installed) for the fade; respect reduced motion.
4. Document in a short comment how to see the real splash (development build: `npx expo run:ios|android` or `npx eas-cli@latest build --profile development`), since Expo Go won't show it.

Done when: cold start goes dark splash → (optional branded loader) → Home with no white frame, no layout jump and no unused font load.

Ground rules: read the matching SDK 58 docs before touching Expo APIs; add packages only with `npx expo install`; never create or edit ios/ or android/; the app is dark-only, so use tokens from constants/Colors.ts and components in components/ui.tsx rather than raw colors; run `npx expo lint` and `npx tsc --noEmit` and fix everything before finishing; don't commit or push.
```

---

## 2. Typography scale and spacing tokens

```
You're working in the Forge fitness app (Expo SDK 58, React Native). Read AGENTS.md and CLAUDE.md first.

Problem: text styles are hand-written in every StyleSheet: 16 different fontSize values (11–34) and 5 font weights, with similar elements styled slightly differently from screen to screen (section titles, card titles, labels, hints, numbers). Spacing is also ad hoc (gaps of 6/8/10/12/14/16/18/20/22/24/28).

Do this:
1. Create a small type scale in constants/ (e.g. constants/Typography.ts): display, title, headline, body, bodyStrong, label (uppercase eyebrow, letter-spaced), caption, and a `numeric` variant with fontVariant tabular-nums for stats, timers and weights. Pick sizes from what the app already uses most (13/15/17/22/30) so the look doesn't shift.
2. Add a spacing scale (4/8/12/16/24/32) and card radius tokens next to it.
3. Optionally add a `variant` prop to the Themed <Text> in components/Themed.tsx so screens write <Text variant="title">.
4. Migrate every screen in app/ and every component in components/ to the tokens. Keep the current look; this is consolidation, not a redesign. Big numbers (calories, timers, streaks, rank names) should use the numeric/display styles consistently.
5. Consider one brand display font for big numbers and screen titles only (for example a condensed sans from @expo-google-fonts). If you add one, load it without delaying launch noticeably and keep the system font for body text.

Done when: no screen uses a raw fontSize/fontWeight except inside the token file, and side-by-side screenshots of Home, Workouts, a workout in progress, Nutrition and Progress look the same or more consistent than before.

Ground rules: read the matching SDK 58 docs before touching Expo APIs; add packages only with `npx expo install`; never create or edit ios/ or android/; the app is dark-only, so use tokens from constants/Colors.ts and components in components/ui.tsx rather than raw colors; run `npx expo lint` and `npx tsc --noEmit` and fix everything before finishing; don't commit or push.
```

---

## 3. Loading states and skeletons

```
You're working in the Forge fitness app (Expo SDK 58, Expo Router, expo-sqlite). Read AGENTS.md and CLAUDE.md first.

Problem: about 10 screens render an empty <View style={styles.container} /> (or <ModalScreen>{null}</ModalScreen>) while their data loads, then pop the content in. Find them with: grep -rn "return <View style={styles.container} />\|{null}</ModalScreen>" app. Lists that load on focus (Add food, exercise picker, Your lifts) also flash empty-state text before results arrive.

Do this:
1. Build a reusable skeleton component in components/ (rounded rectangles in the cardRaised token with a gentle shimmer or pulse via react-native-reanimated; static when the OS "reduce motion" setting is on).
2. Give each of those screens a skeleton that matches the final layout: Home (start button, two streak cards, stats card, body card), Workouts (cards), workout in progress (summary card + exercise cards), Nutrition (calorie card + meal cards), Progress (rank card + charts), and the modals.
3. Don't show "Nothing matches" / empty-state copy until the first load has finished.
4. Fade content in when it arrives (short, 150–200 ms) instead of popping.

Done when: no screen shows a blank frame or a false empty state while loading, and layout doesn't jump when data arrives.

Ground rules: read the matching SDK 58 docs before touching Expo APIs; add packages only with `npx expo install`; never create or edit ios/ or android/; the app is dark-only, so use tokens from constants/Colors.ts and components in components/ui.tsx rather than raw colors; run `npx expo lint` and `npx tsc --noEmit` and fix everything before finishing; don't commit or push.
```

---

## 4. Replace native alerts with themed confirmation sheets

```
You're working in the Forge fitness app (Expo SDK 58, Expo Router). Read AGENTS.md and CLAUDE.md first.

Problem: the app uses the system Alert.alert 15 times (grep -rn "Alert.alert" app components): finishing or discarding a workout, deleting sets, exercises, foods, meals and weigh-ins, replacing a workout with a preset, and choosing Edit/Remove on a custom meal. The system dialogs look generic next to the dark, orange-accented UI.

Do this:
1. Build a themed bottom-sheet dialog in components/ (title, optional message, stacked full-width buttons using the existing Button variants: primary, secondary, danger; a Cancel button; dimmed backdrop that closes on tap; slides up with react-native-reanimated; respects safe area and reduced motion). Expose a simple imperative API, e.g. `confirm({ title, message, actions })` returning a promise, provided from app/_layout.tsx so any screen can call it.
2. Replace every Alert.alert with it, keeping the same wording, choices and destructive styling.
3. Make sure it works above native-stack modals (Add food, recipe form, settings) on both iOS and Android, and that screen readers announce it and focus moves into it.

Done when: there are no Alert.alert calls left, every confirmation looks like part of the app, and Back/Escape and backdrop taps cancel safely.

Ground rules: read the matching SDK 58 docs before touching Expo APIs; add packages only with `npx expo install`; never create or edit ios/ or android/; the app is dark-only, so use tokens from constants/Colors.ts and components in components/ui.tsx rather than raw colors; run `npx expo lint` and `npx tsc --noEmit` and fix everything before finishing; don't commit or push.
```

---

## 5. Workout complete screen and personal-record celebration

```
You're working in the Forge fitness app (Expo SDK 58, Expo Router, expo-sqlite). Read AGENTS.md and CLAUDE.md first.

Problem: finishing a workout (finish() in app/session/[id].tsx) just goes back, and new personal records are announced in a plain system alert listing "Exercise: Heaviest 185 lb". This is the most rewarding moment in a lifting app and it currently has no payoff.

Do this:
1. Add a "Workout complete" screen (new route, presented as a full-screen modal) shown after Finish. Show: workout name, duration, total sets, total volume (weight × reps, in the user's unit from hooks/useWeightUnit), exercises done, and the muscles worked on the existing BodyMap (components/body/BodyMap.tsx, primary muscles in the accent).
2. If getNewRecords() (db/progress.ts) returns records, show each as a card with the record type, new value and the previous best, with a short celebratory animation (react-native-reanimated: scale/fade in, and a tasteful confetti or glow; skip animation when reduce motion is on) and a success haptic (install expo-haptics with `npx expo install expo-haptics`).
3. Buttons: "Done" (to Home) and "View workout" (to the finished session).
4. Remove the PR Alert.alert.

Done when: finishing a workout always lands on the summary screen, records feel like a celebration, and nothing else in the finish flow changes (unchecked sets are still removed, an empty workout can still be discarded).

Ground rules: read the matching SDK 58 docs before touching Expo APIs; add packages only with `npx expo install`; never create or edit ios/ or android/; the app is dark-only, so use tokens from constants/Colors.ts and components in components/ui.tsx rather than raw colors; run `npx expo lint` and `npx tsc --noEmit` and fix everything before finishing; don't commit or push.
```

---

## 6. Micro-interactions and haptics in the workout logger

```
You're working in the Forge fitness app (Expo SDK 58, React Native, react-native-reanimated 4). Read AGENTS.md and CLAUDE.md first.

Problem: nothing in the app moves. Every press is an opacity change, and ticking a set (SetRow in app/session/[id].tsx) just swaps colors instantly. The logger is where users spend the most time, so it should feel tactile.

Do this:
1. Install expo-haptics with `npx expo install expo-haptics` and add light haptics to: ticking a set done (success), unticking (light), adding a set or exercise (light), long-press delete (warning), and the Start/Finish buttons (medium).
2. Animate the set check button (quick scale pop and fill) and the row's background turning green with react-native-reanimated.
3. Animate adding and removing sets and exercises (layout animations: fade/slide in, collapse out).
4. Give the shared Button/Chip/card presses a subtle scale-down (about 0.97) instead of only opacity, in components/ui.tsx and components/Chip.tsx.
5. Make the "sets done" counter and live timer in the summary card tick smoothly (no layout shift; tabular numbers).
6. Respect the OS reduce-motion setting everywhere (reanimated's useReducedMotion) and keep haptics optional via a toggle in app/settings.tsx (stored with db/settings.ts).

Done when: logging a full workout feels responsive and tactile on a real device, with no dropped frames while typing weights and reps.

Ground rules: read the matching SDK 58 docs before touching Expo APIs; add packages only with `npx expo install`; never create or edit ios/ or android/; the app is dark-only, so use tokens from constants/Colors.ts and components in components/ui.tsx rather than raw colors; run `npx expo lint` and `npx tsc --noEmit` and fix everything before finishing; don't commit or push.
```

---

## 7. Charts restyled to match the brand

```
You're working in the Forge fitness app (Expo SDK 58, react-native-svg). Read AGENTS.md and CLAUDE.md first.

Problem: the Progress charts (components/charts/LineChart.tsx, BarChart.tsx, ChartFrame.tsx) still use the pre-redesign blue series color (chartSeries #3987e5 in constants/Colors.ts) and dashed-border empty boxes, so they look like they belong to a different app from the orange, card-based UI around them.

Do this:
1. Restyle the series to the brand: accent line (#FF6A1F) with a soft vertical gradient fill under the line chart, rounded bar tops, and the current/selected point emphasized. Keep gridlines very quiet. Check contrast of the series against the card surface (#16161A); text labels must stay readable (at least 4.5:1).
2. Replace the dashed empty states with a centered icon plus a one-line message and, where it makes sense, an action (e.g. "Log weight" for body weight, "Start a workout" for weekly training).
3. Improve the touch readout: a vertical guide line and a small floating label on the touched point, with a light haptic as the selection moves (expo-haptics, via `npx expo install` if it isn't installed yet).
4. Animate the line drawing and bars growing on first render and on range change (1M/3M/6M/1Y/All), skipping animation when reduce motion is on.
5. Keep the existing "Show data" table and the accessibility labels; those are how screen-reader users read the charts.

Done when: every chart on the Progress tab looks native to the app, works with 1 point, many points and no points, and the data table still matches the chart.

Ground rules: read the matching SDK 58 docs before touching Expo APIs; add packages only with `npx expo install`; never create or edit ios/ or android/; the app is dark-only, so use tokens from constants/Colors.ts and components in components/ui.tsx rather than raw colors; run `npx expo lint` and `npx tsc --noEmit` and fix everything before finishing; don't commit or push.
```

---

## 8. Body diagram refinement

```
You're working in the Forge fitness app (Expo SDK 58, react-native-svg). Read AGENTS.md and CLAUDE.md first.

Problem: the front/back body diagram (components/body/bodyShapes.ts and BodyMap.tsx) is built from straight-edged mirrored polygons. It reads clearly but looks low-poly and a bit crude next to the rest of the UI, and it's now on Home (muscle recovery), the workout form ("Muscles worked") and the strength rank card.

Do this:
1. Redraw the figure as smooth SVG paths (cubic curves) with more natural proportions: rounded shoulders, tapered waist, defined pecs, separate abs blocks and obliques, deltoid caps, biceps/triceps, forearms, quads with a visible teardrop, hamstrings, glutes, calves. Keep the same 11 muscle groups (db/exerciseTags.ts) and the 120 × 240 per-figure viewBox so existing callers keep working. It must be an original drawing.
2. Keep a separate silhouette layer (head, hands, feet, joints) in the base color, with muscles on top separated by a thin gap in the card color.
3. Animate fill color changes (e.g. when switching muscles in the strength rank, or when recovery colors update).
4. When BodyMap gets onMusclePress, give pressed muscles a visible highlight and enlarge tap areas for small muscles (forearms, calves).
5. Check it at the three sizes used (about 170, 200 and 230 px tall) and on a small phone width (360 px).

Done when: the diagram looks polished at all three sizes, every muscle group is clearly identifiable on the front or back view, and Home, the workout form and the strength rank still color the right regions.

Ground rules: read the matching SDK 58 docs before touching Expo APIs; add packages only with `npx expo install`; never create or edit ios/ or android/; the app is dark-only, so use tokens from constants/Colors.ts and components in components/ui.tsx rather than raw colors; run `npx expo lint` and `npx tsc --noEmit` and fix everything before finishing; don't commit or push.
```

---

## 9. Empty states with purpose

```
You're working in the Forge fitness app (Expo SDK 58, expo-symbols). Read AGENTS.md and CLAUDE.md first.

Problem: empty states are mostly a single grey sentence, e.g. "Finished workouts will show up here." (Workouts history), "Finish a workout to see your progress here." (Progress), "Nothing matches." (Add food, ingredient picker), "Ingredients and meals you create are saved here…" (Custom foods), "No saved workouts yet" (Start a workout). A new user's first launch is almost entirely empty states, so they set the first impression.

Do this:
1. Create a reusable EmptyState component in components/: an icon in a soft accent circle (SF Symbols / Material via expo-symbols), a short title, one line of body text, and an optional primary action button.
2. Use it everywhere a list or section can be empty, with a specific action for each: create a workout, start a workout, log food for this meal, create an ingredient or meal, log body weight, set your profile for strength ranks, clear the search ("No results for 'xyz'").
3. Keep copy short, friendly and specific to the screen; no generic "No data".

Done when: a brand-new install (clear app data) shows a helpful, on-brand empty state on every screen, each with a clear next step.

Ground rules: read the matching SDK 58 docs before touching Expo APIs; add packages only with `npx expo install`; never create or edit ios/ or android/; the app is dark-only, so use tokens from constants/Colors.ts and components in components/ui.tsx rather than raw colors; run `npx expo lint` and `npx tsc --noEmit` and fix everything before finishing; don't commit or push.
```

---

## 10. Bring the older screens up to the new design

```
You're working in the Forge fitness app (Expo SDK 58, Expo Router). Read AGENTS.md and CLAUDE.md first.

Problem: the main tabs were redesigned (filled cards, Button/Card/SegmentedControl in components/ui.tsx and components/SegmentedControl.tsx), but several screens still use the old look: hairline-separated rows, bordered or dashed "add" buttons, plain labels, small chevron icon buttons and bordered delete buttons. They are:
- app/exercise/[id].tsx (exercise detail: facts, records, recent sessions, instructions)
- app/workout-form.tsx (exercise cards, the dashed "+ Add exercises", up/down reorder chevrons, delete button)
- app/food-entry.tsx (create ingredient / edit entry form, delete button)
- app/exercise-form.tsx and app/weigh-in.tsx
- components/ExerciseBrowser.tsx (search, filter panel, exercise rows inside the exercise picker)

Do this:
1. Restyle each screen with the shared components: grouped fields inside Cards, Button variants for actions (soft for add, danger for delete), SegmentedControl for either/or choices, consistent section headers.
2. Exercise detail: a header card with the primary muscle, equipment and level as chips; record tiles; recent sessions as cards; numbered instruction steps with comfortable line height.
3. Workout form: replace the up/down chevrons with drag-to-reorder (react-native-reanimated + react-native-gesture-handler, installed with `npx expo install` if missing) or a clear reorder mode, and give each exercise card a sets/reps stepper that matches the logger.
4. Exercise browser: card-style rows with a muscle chip and equipment icon, plus a clearer filter panel.

Done when: moving between any two screens in the app, nothing looks like it's from an older version.

Ground rules: read the matching SDK 58 docs before touching Expo APIs; add packages only with `npx expo install`; never create or edit ios/ or android/; the app is dark-only, so use tokens from constants/Colors.ts and components in components/ui.tsx rather than raw colors; run `npx expo lint` and `npx tsc --noEmit` and fix everything before finishing; don't commit or push.
```

---

## 11. Consistent headers, navigation and modals

```
You're working in the Forge fitness app (Expo SDK 58, Expo Router native stack). Read AGENTS.md and CLAUDE.md first.

Problem: there are three header styles that don't quite agree:
- Tabs: large left-aligned bold titles with round icon buttons (app/(tabs)/_layout.tsx).
- Pushed screens (workout form, workout in progress, exercise detail): default native headers, with Save/Finish styled differently on each screen.
- Modals: a custom bar from components/ModalScreen.tsx with a text "Close" on the left and a centered title.
Modals stack on modals in places (Add food → Create meal → Add ingredient; Create workout → Add exercises → New exercise), and the Android back behaviour and swipe-to-dismiss haven't been tuned.

Do this:
1. Define one header pattern for pushed screens and one for modals, and apply it everywhere: same title size, same back/close affordance (icon button, not text), and primary actions as a consistent pill (like Finish in the workout logger).
2. Use form-sheet presentation with detents for short modals (weigh-in, nutrition goals, exercise picker) where the SDK 58 Expo Router docs support it, and keep full-screen for long forms.
3. Warn before dismissing a modal with unsaved changes (recipe form, workout form, create ingredient), using swipe-dismiss prevention where supported.
4. Check iOS 26 header behaviour (content sits under translucent headers; see contentInsetAdjustmentBehavior use in the pushed screens) and Android edge-to-edge (status bar, navigation bar color #0A0A0C).

Done when: every screen's header follows one of the two patterns, nested modals feel intentional, and no form can lose input to an accidental swipe.

Ground rules: read the matching SDK 58 docs before touching Expo APIs; add packages only with `npx expo install`; never create or edit ios/ or android/; the app is dark-only, so use tokens from constants/Colors.ts and components in components/ui.tsx rather than raw colors; run `npx expo lint` and `npx tsc --noEmit` and fix everything before finishing; don't commit or push.
```

---

## 12. App icon set and store listing assets

```
You're working in the Forge fitness app (Expo SDK 58). Read AGENTS.md and CLAUDE.md first.

Problem: the icon and splash were regenerated as a simple orange tilted dumbbell (scripts/generate-brand-assets.mjs, output in assets/images/), but:
- assets/images/favicon.png is still the old Expo template favicon.
- There's no iOS dark or tinted icon variant (iOS 18+ home screen modes).
- The Android monochrome icon hasn't been checked with themed icons on.
- There are no App Store / Google Play screenshots or a feature graphic.

Do this:
1. Refine the logo for small sizes (check it legibly at 29, 40 and 60 pt; consider a slightly thicker bar and fewer plates), keeping it original. Update the generator script rather than hand-editing PNGs, so the assets stay reproducible.
2. Add iOS dark and tinted icon variants using the app.json fields documented for SDK 58 (check https://docs.expo.dev/versions/v58.0.0/config/app/ for the exact keys), regenerate the favicon, and verify the Android adaptive foreground stays inside the safe zone.
3. Add a script that captures or composes store screenshots for the required sizes (6.9" and 6.5" iPhone, 13" iPad if tablets stay supported, Android phone), framed with a short caption on the brand background: Home with recovery body, workout logger, strength rank, nutrition, progress charts. Use realistic data, not empty screens.
4. Produce a 1024 × 500 Google Play feature graphic.

Done when: every icon slot in app.json points to a real, sharp asset, and a folder of store-ready screenshots exists.

Ground rules: read the matching SDK 58 docs before touching Expo APIs; add packages only with `npx expo install`; never create or edit ios/ or android/; the app is dark-only, so use tokens from constants/Colors.ts and components in components/ui.tsx rather than raw colors; run `npx expo lint` and `npx tsc --noEmit` and fix everything before finishing; don't commit or push.
```

---

## 13. Accessibility and large text

```
You're working in the Forge fitness app (Expo SDK 58, React Native). Read AGENTS.md and CLAUDE.md first.

Problem: the layout was designed at default text size. Several places use fixed-width columns that will clip or overflow when the user turns on larger text or bold text: the set table in the workout logger (app/session/[id].tsx: 32 / flex / 72 / 60 / 36 px columns), the strength rank requirements table (components/StrengthRank.tsx), streak cards on Home, the four-option SegmentedControl in Add food, and the recipe ingredient rows. Some tap targets are small (28 px set-number pill, 34 px check button, chips around 30 px tall), and muted text (#8E8E96) on raised surfaces needs a contrast check.

Do this:
1. Test every screen at the largest accessibility text sizes on iOS and Android. Let rows wrap or stack instead of clipping; cap scaling with maxFontSizeMultiplier only where a fixed layout truly needs it (for example the set table), and keep it at least 1.5.
2. Make every interactive element at least 44 × 44 pt (hitSlop is fine where the visual must stay small).
3. Audit text and icon contrast against the surface each sits on (background #0A0A0C, card #16161A, cardRaised #24242A). Raise any muted color that falls under 4.5:1 for text.
4. Review screen reader labels and roles on custom controls (set check buttons, segmented controls, steppers, body diagram, chart readouts, swipe or long-press actions, which also need a visible or accessibility-action alternative).
5. Respect reduce motion and bold text system settings.

Done when: the app is fully usable at the largest text size with VoiceOver/TalkBack on, and every text/background pair meets WCAG AA.

Ground rules: read the matching SDK 58 docs before touching Expo APIs; add packages only with `npx expo install`; never create or edit ios/ or android/; the app is dark-only, so use tokens from constants/Colors.ts and components in components/ui.tsx rather than raw colors; run `npx expo lint` and `npx tsc --noEmit` and fix everything before finishing; don't commit or push.
```

---

## 14. Nutrition visuals

```
You're working in the Forge fitness app (Expo SDK 58, react-native-svg). Read AGENTS.md and CLAUDE.md first.

Problem: the Nutrition tab (app/(tabs)/nutrition.tsx) shows calories as a big number with a thin progress bar and macros as three small bars, all in the same orange. Foods in Add food (app/food-add.tsx) are text-only rows across four tabs, so ingredients, fast food, meals and custom foods look identical, and the amount sheet at the bottom covers much of the list.

Do this:
1. Replace the calorie bar with a ring (react-native-svg) showing eaten vs target, with "left" or "over" in the center, and give protein, carbs and fat their own distinct, accessible colors used consistently in the ring legend, macro bars, food rows and the recipe totals. Add the colors as tokens in constants/Colors.ts and check contrast on the card surface.
2. Give food rows a leading icon by category (ingredient, fast food, meal, custom; restaurant initial or icon for fast food), and show calories as the strongest element.
3. Redesign the "add amount" panel as a proper bottom sheet that can expand and collapse, with the macro preview as small colored pills and a large Add button; make sure it never hides the keyboard's Done bar.
4. Make the day switcher feel like a date strip (swipe between days, today highlighted).

Done when: you can tell macros apart at a glance anywhere in the app, and the Add food flow feels like one smooth sheet rather than a list with a panel stuck to the bottom.

Ground rules: read the matching SDK 58 docs before touching Expo APIs; add packages only with `npx expo install`; never create or edit ios/ or android/; the app is dark-only, so use tokens from constants/Colors.ts and components in components/ui.tsx rather than raw colors; run `npx expo lint` and `npx tsc --noEmit` and fix everything before finishing; don't commit or push.
```

---

## 15. Strength rank badges

```
You're working in the Forge fitness app (Expo SDK 58, react-native-svg). Read AGENTS.md and CLAUDE.md first.

Problem: strength ranks (Bronze III through Olympian, db/strength.ts) are a headline feature, but each rank is shown as the system trophy icon in a colored ring (components/StrengthRank.tsx), and the 18-rung ladder is plain bars. Nothing makes reaching a new rank feel earned.

Do this:
1. Design an original badge family in react-native-svg: one shape per tier (Bronze, Silver, Gold, Platinum, Diamond, Elite, World Class, Olympian) using the existing TIER_COLORS, with the division (III/II/I) shown as pips or a numeral. Higher tiers should look progressively more elaborate. No copied game or sports-league emblems.
2. Use the badge in the rank card, the "What each rank needs" table, and a compact version on the strength muscle chips so the user can see every muscle's rank at a glance.
3. Animate the progress bar fill and add a subtle shine on the badge when the card appears (skipped when reduce motion is on).
4. If a finished workout moves a muscle up a rank, surface it on the workout-complete screen (or the existing PR alert if that screen doesn't exist yet).

Done when: each tier is instantly recognisable by its badge alone, at both the large and compact sizes.

Ground rules: read the matching SDK 58 docs before touching Expo APIs; add packages only with `npx expo install`; never create or edit ios/ or android/; the app is dark-only, so use tokens from constants/Colors.ts and components in components/ui.tsx rather than raw colors; run `npx expo lint` and `npx tsc --noEmit` and fix everything before finishing; don't commit or push.
```

---

## 16. Tablet layout (or turn tablets off)

```
You're working in the Forge fitness app (Expo SDK 58). Read AGENTS.md and CLAUDE.md first.

Problem: app.json sets "ios.supportsTablet": true, so the app will be listed for iPad, but every screen is a single phone-width column that stretches edge to edge on a tablet (huge cards, the body diagram floating in space, long lines of text). App Store review also requires iPad screenshots when tablets are supported.

Do this (pick one, and explain the choice in your summary):
A. Support tablets properly: cap content width (around 640–720 pt) and center it; on wide screens show Home's streak, stats and recovery cards in two columns, show the workout logger with the exercise list beside the active exercise, and lay out Progress charts in a grid. Check landscape if orientation is unlocked.
B. Or, if tablet support isn't worth it for launch, set supportsTablet to false and note that iPad users will get the scaled phone layout.

Done when: the app looks deliberate on an iPad simulator (option A), or is configured as phone-only (option B).

Ground rules: read the matching SDK 58 docs before touching Expo APIs; add packages only with `npx expo install`; never create or edit ios/ or android/; the app is dark-only, so use tokens from constants/Colors.ts and components in components/ui.tsx rather than raw colors; run `npx expo lint` and `npx tsc --noEmit` and fix everything before finishing; don't commit or push.
```

---

### Not visual, but needed before release

- Demo data is now gated by `__DEV__` in `db/init.ts`; verify a fresh release build starts with empty logs. Existing development installs keep their test history.
- Re-check the fast-food and meal nutrition values in `db/seedFoods.ts` against the chains' current published data.
