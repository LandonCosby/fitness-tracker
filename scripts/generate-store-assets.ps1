param([string]$ScreenshotDirectory)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$projectRoot = Split-Path $PSScriptRoot -Parent
$outputRoot = Join-Path $projectRoot 'assets/store'
New-Item -ItemType Directory -Force -Path $outputRoot | Out-Null

function Brush([string]$Hex) { return [Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml($Hex)) }
function Canvas([int]$Width, [int]$Height) {
  $bitmap = [Drawing.Bitmap]::new($Width, $Height, [Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $graphics = [Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.TextRenderingHint = [Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $graphics.Clear([Drawing.ColorTranslator]::FromHtml('#0A0A0C'))
  return @{ Bitmap = $bitmap; Graphics = $graphics }
}
function Label($Graphics, [string]$Text, [float]$X, [float]$Y, [float]$Size, [string]$Color, [bool]$Bold = $false) {
  $style = if ($Bold) { [Drawing.FontStyle]::Bold } else { [Drawing.FontStyle]::Regular }
  $font = [Drawing.Font]::new('Segoe UI', $Size, $style, [Drawing.GraphicsUnit]::Pixel)
  $brush = Brush $Color
  try { $Graphics.DrawString($Text, $font, $brush, $X, $Y) } finally { $font.Dispose(); $brush.Dispose() }
}
function Save-Canvas($Canvas, [string]$Path) {
  try { $Canvas.Bitmap.Save($Path, [Drawing.Imaging.ImageFormat]::Png) }
  finally { $Canvas.Graphics.Dispose(); $Canvas.Bitmap.Dispose() }
  Write-Output $Path
}

# Original brand composition; contains no fabricated app screens or claimed accolades.
$canvas = Canvas 1024 500
$g = $canvas.Graphics
$line = [Drawing.Pen]::new([Drawing.ColorTranslator]::FromHtml('#29292F'), 1)
try { for ($x = 48; $x -lt 1024; $x += 64) { $g.DrawLine($line, $x, 0, $x, 500) } } finally { $line.Dispose() }
$accent = Brush '#FF6A1F'
try { $g.FillRectangle($accent, 56, 56, 5, 30) } finally { $accent.Dispose() }
Label $g 'FORGE' 76 48 32 '#FF6A1F' $true
Label $g 'Build strength.' 52 132 58 '#F5F5F7' $true
Label $g 'See your progress.' 52 200 58 '#F5F5F7' $true
Label $g 'Workouts. Nutrition. Recovery.' 56 300 24 '#AAAAB4'
Label $g 'Your training, all in one place.' 56 400 20 '#AAAAB4'
$logo = [Drawing.Image]::FromFile((Join-Path $projectRoot 'assets/images/android-icon-foreground.png'))
try { $g.DrawImage($logo, [Drawing.Rectangle]::new(652, 82, 320, 320)) } finally { $logo.Dispose() }
Save-Canvas $canvas (Join-Path $outputRoot 'feature-graphic.png')

if (-not $ScreenshotDirectory) {
  Write-Output 'Feature graphic ready. To compose store screenshots, pass -ScreenshotDirectory with real ios/ and android/ captures (see docs/store-assets.md).'
  exit 0
}
$captureRoot = (Resolve-Path -LiteralPath $ScreenshotDirectory).Path
$screens = @(
  @{ Name = 'home'; Title = 'Train. Recover. Repeat.'; Caption = 'See your week and muscle recovery.' },
  @{ Name = 'workout'; Title = 'Make every set count.'; Caption = 'Log lifts and build your own routines.' },
  @{ Name = 'strength'; Title = 'See your strength grow.'; Caption = 'Track muscle ranks and your next milestone.' },
  @{ Name = 'nutrition'; Title = 'Fuel your progress.'; Caption = 'Log ingredients, meals and recipes.' },
  @{ Name = 'progress'; Title = 'Your effort, over time.'; Caption = 'Explore your lifts, weight and training.' }
)
$formats = @(
  @{ Name = 'iphone-6.9'; Platform = 'ios'; Width = 1320; Height = 2868 },
  @{ Name = 'iphone-6.5'; Platform = 'ios'; Width = 1242; Height = 2688 },
  @{ Name = 'android-phone'; Platform = 'android'; Width = 1080; Height = 1920 }
)
# Validate all inputs up front. Never substitute a mockup for a real app capture.
foreach ($format in $formats) { foreach ($screen in $screens) {
  $source = Join-Path $captureRoot ($format.Platform + '/' + $screen.Name + '.png')
  if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { throw "Missing capture: $source" }
} }
foreach ($format in $formats) {
  $folder = Join-Path $outputRoot $format.Name
  New-Item -ItemType Directory -Force -Path $folder | Out-Null
  foreach ($screen in $screens) {
    $canvas = Canvas $format.Width $format.Height
    $g = $canvas.Graphics
    $scale = $format.Width / 1024.0
    Label $g 'FORGE' (56 * $scale) (42 * $scale) (28 * $scale) '#FF6A1F' $true
    Label $g $screen.Title (52 * $scale) (100 * $scale) (48 * $scale) '#F5F5F7' $true
    Label $g $screen.Caption (56 * $scale) (170 * $scale) (22 * $scale) '#AAAAB4'
    $source = Join-Path $captureRoot ($format.Platform + '/' + $screen.Name + '.png')
    $capture = [Drawing.Image]::FromFile($source)
    try {
      if ($capture.Width -ge $capture.Height) { throw "Expected a portrait capture: $source" }
      $top = 240 * $scale
      $availableWidth = $format.Width - 100 * $scale
      $availableHeight = $format.Height - $top - 48 * $scale
      $ratio = [Math]::Min($availableWidth / $capture.Width, $availableHeight / $capture.Height)
      $width = [int]($capture.Width * $ratio); $height = [int]($capture.Height * $ratio)
      $left = [int](($format.Width - $width) / 2)
      $g.DrawImage($capture, [Drawing.Rectangle]::new($left, [int]$top, $width, $height))
    } finally { $capture.Dispose() }
    Save-Canvas $canvas (Join-Path $folder ($screen.Name + '.png'))
  }
}
