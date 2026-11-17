# Store assets

`powershell -ExecutionPolicy Bypass -File scripts/generate-store-assets.ps1` creates the original 1024 × 500 RGB Google Play feature graphic at `assets/store/feature-graphic.png`. It reuses the generated Forge logo. No extra packages are required on Windows.

For screenshots, capture the actual final build with realistic demo data and no debug overlays. Use iOS captures for the App Store and Android captures for Google Play. Place them in a directory with this structure:

```text
captures/
  ios/home.png
  ios/workout.png
  ios/strength.png
  ios/nutrition.png
  ios/progress.png
  android/home.png
  android/workout.png
  android/strength.png
  android/nutrition.png
  android/progress.png
```

Then run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/generate-store-assets.ps1 -ScreenshotDirectory ./captures
```

The script preserves the capture's aspect ratio and frames it with a caption on the Forge background. It produces five PNGs each for 1320 × 2868 (6.9-inch iPhone), 1242 × 2688 (6.5-inch iPhone), and 1080 × 1920 (Android phone). The app is configured for phones, so iPad images are not included. The script validates every input before producing screenshots and never substitutes invented screens.

Specifications checked against [Apple screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications) and [Google Play preview assets](https://support.google.com/googleplay/android-developer/answer/9866151).

Actual app captures are still required. This Windows workspace has no Android emulator/SDK, attached device or iOS simulator. The feature graphic is generated; screenshot capture and native visual verification remain device tasks.
