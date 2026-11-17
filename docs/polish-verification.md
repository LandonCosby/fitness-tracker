# Release polish verification

Implemented November 7, 2026 on `redesign-and-features`.

| Task | Implementation | Verification and remaining work |
| --- | --- | --- |
| 2: Type and spacing | Shared sizes, weights, variants, spacing and radii; screens and components migrated; system fonts retained | `npm run check:design` rejects raw type sizes/weights in screens and components |
| 6: Motion and haptics | Animated button, chip and linked-card presses; set completion fill/pop; row insertion/removal; saved haptics toggle; Start/Finish feedback | Typechecked and bundled; timing and physical haptic feel require a phone |
| 7: Charts | Orange series, gradient, line reveal, growing rounded columns, crosshair/point labels, selection haptics, contextual empty-state actions | Data tables and screen-reader labels retained; native chart dragging requires a phone |
| 10: Older screens | Grouped field cards, shared buttons, detail cards/chips, exercise-browser cards and explicit workout reorder mode | Typechecked; no new gesture dependency needed |
| 11: Navigation/forms | Icon close controls, consistent Save/Finish pills, short form sheets, unsaved-change guard on workout/ingredient/recipe forms | Uses the installed Expo Router SDK 58 `usePreventRemove` API; native swipe/back behavior still requires device testing |
| 12: Store assets | Reproducible 1024 × 500 RGB feature graphic and a capture-framing script | Feature graphic generated and visually inspected; genuine iOS/Android captures still needed (see store-assets.md) |
| 13: Accessibility | Larger tap targets, named inputs/actions, visible food options, wrapping cards/controls, horizontally scrollable logger at larger font scales, improved muted colors | Automated contrast passes for dark text/surfaces; no claim of completed VoiceOver/TalkBack or largest-text device testing |
| 14: Nutrition | Calorie ring, distinct labeled macros, category icons, keyboard-safe expandable amount modal, swipeable day heading/date strip | Typechecked; amount-sheet keyboard/Done behavior needs native confirmation |
| 16: Tablets | `ios.supportsTablet: false` for this phone-focused release | Config checked; scaled iPhone compatibility is not a native iPad layout |

The new code preserves existing database schemas. Haptic preferences use the existing settings table. A real SQLite harness verified that fresh release initialization leaves workout/food/weight logs empty while seeding the exercise and food catalogs, that developer initialization still seeds demo sessions exactly once, and that haptic preferences persist.

Device acceptance pass:

1. Start a workout, enter values, complete/uncomplete sets, add/remove sets and exercises, then finish. Repeat with haptics disabled and Reduce Motion enabled.
2. Change each chart range; drag across the data; compare the readout with Show data. Include empty, one-point and many-point ranges.
3. Edit a workout, ingredient and recipe; try Close, Back and swipe dismissal. Keep editing must preserve input; saving must leave without an extra discard prompt. Open a picker and return without losing the parent draft.
4. Log food in grams and ounces with the keyboard open. Test expand/collapse, Done and Add on both platforms.
5. At maximum text size, inspect Home, the logger, recipe rows, segmented controls, rank requirements and all forms. Use VoiceOver/TalkBack to complete a set, edit a meal and read chart data.
6. Capture the five finished screens on each native platform for store assets. No native emulator/SDK or attached device is available in this workspace, so these checks are explicitly pending.

Fast-food nutrition provenance remains a separate release item in the original prompt file; it was not re-verified as part of this visual polish pass.
