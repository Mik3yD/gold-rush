# Draws Gold Rush's app icons (a gold nugget and a pickaxe on a dark wooden badge) as PNG files.
# You only need this if you want to change the icons. Run it from this folder in PowerShell:
#   powershell -ExecutionPolicy Bypass -File make-icons.ps1
Add-Type -AssemblyName System.Drawing

function Draw-Icon([int]$size, [bool]$fullBleed, [double]$zoom, [string]$file) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.Clear([System.Drawing.Color]::Transparent)
  $s = $size / 512.0   # everything below is drawn on a 512 x 512 grid

  # The badge: dark brown, lighter in the middle, with a brass edge.
  # Full-bleed icons (iPhone, and "maskable" ones that phones cut into circles) fill the whole square.
  $badge = New-Object System.Drawing.Drawing2D.GraphicsPath
  if ($fullBleed) {
    $badge.AddRectangle((New-Object System.Drawing.RectangleF 0, 0, $size, $size))
  } else {
    $r = 96 * $s; $m = 8 * $s; $w = $size - 2 * $m
    $badge.AddArc($m, $m, $r, $r, 180, 90); $badge.AddArc($m + $w - $r, $m, $r, $r, 270, 90)
    $badge.AddArc($m + $w - $r, $m + $w - $r, $r, $r, 0, 90); $badge.AddArc($m, $m + $w - $r, $r, $r, 90, 90)
    $badge.CloseFigure()
  }
  $glow = New-Object System.Drawing.Drawing2D.PathGradientBrush $badge
  $glow.CenterColor = [System.Drawing.Color]::FromArgb(255, 110, 72, 34)
  $glow.SurroundColors = @([System.Drawing.Color]::FromArgb(255, 36, 21, 8))
  $g.FillPath($glow, $badge)
  if (-not $fullBleed) {
    $g.DrawPath((New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 200, 154, 58)), (12 * $s)), $badge)
  }

  # Everything else is drawn around the middle, zoomed out a bit for maskable icons (so nothing gets cut off)
  $g.TranslateTransform($size / 2, $size / 2)
  $g.ScaleTransform($s * $zoom, $s * $zoom)
  $g.TranslateTransform(-256, -256)

  # The pickaxe: a wooden handle from bottom left to top right, and a steel head across the top
  $handle = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 150, 96, 48)), 30
  $handle.StartCap = 'Round'; $handle.EndCap = 'Round'
  $g.DrawLine($handle, 120, 400, 350, 150)
  $head = New-Object System.Drawing.Drawing2D.GraphicsPath
  # A curved blade with a point at each end, across the top of the handle
  $head.AddCurve([System.Drawing.PointF[]]@((New-Object System.Drawing.PointF 236, 50), (New-Object System.Drawing.PointF 398, 96), (New-Object System.Drawing.PointF 462, 256)), 0.6)
  $head.AddCurve([System.Drawing.PointF[]]@((New-Object System.Drawing.PointF 462, 256), (New-Object System.Drawing.PointF 362, 140), (New-Object System.Drawing.PointF 236, 50)), 0.6)
  $head.CloseFigure()
  $steel = New-Object System.Drawing.Drawing2D.LinearGradientBrush (New-Object System.Drawing.Point 300, 60), (New-Object System.Drawing.Point 380, 160), ([System.Drawing.Color]::FromArgb(255, 240, 243, 247)), ([System.Drawing.Color]::FromArgb(255, 100, 108, 118))
  $g.FillPath($steel, $head)
  $g.DrawPath((New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 50, 50, 56)), 6), $head)

  # The gold nugget: a lumpy shape, bright at the top left and darker at the bottom
  $nugget = New-Object System.Drawing.Drawing2D.GraphicsPath
  $points = @(
    (New-Object System.Drawing.PointF 145, 310), (New-Object System.Drawing.PointF 190, 262), (New-Object System.Drawing.PointF 228, 268),
    (New-Object System.Drawing.PointF 262, 232), (New-Object System.Drawing.PointF 318, 244), (New-Object System.Drawing.PointF 352, 226),
    (New-Object System.Drawing.PointF 392, 276), (New-Object System.Drawing.PointF 384, 318), (New-Object System.Drawing.PointF 402, 358),
    (New-Object System.Drawing.PointF 350, 408), (New-Object System.Drawing.PointF 296, 398), (New-Object System.Drawing.PointF 248, 424),
    (New-Object System.Drawing.PointF 186, 398), (New-Object System.Drawing.PointF 150, 362)
  )
  $nugget.AddClosedCurve($points, 0.3)
  $goldBrush = New-Object System.Drawing.Drawing2D.PathGradientBrush $nugget
  $goldBrush.CenterPoint = New-Object System.Drawing.PointF 240, 290
  $goldBrush.CenterColor = [System.Drawing.Color]::FromArgb(255, 255, 242, 150)
  $goldBrush.SurroundColors = @([System.Drawing.Color]::FromArgb(255, 196, 128, 8))
  $g.FillPath($goldBrush, $nugget)
  $g.DrawPath((New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 110, 70, 8)), 7), $nugget)
  # Dents and a shine on the nugget
  $dent = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(120, 140, 90, 10))
  $g.FillEllipse($dent, 300, 330, 34, 24); $g.FillEllipse($dent, 220, 360, 26, 18); $g.FillEllipse($dent, 340, 290, 20, 16)
  $g.FillEllipse((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(230, 255, 255, 235))), 205, 275, 46, 24)

  # Sparkles: four-pointed stars
  $shine = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 244, 190))
  foreach ($star in @(@(410, 250, 34), @(120, 215, 24), @(395, 420, 20))) {
    $x = $star[0]; $y = $star[1]; $k = $star[2]
    $g.FillPolygon($shine, [System.Drawing.PointF[]]@(
      (New-Object System.Drawing.PointF $x, ($y - $k)), (New-Object System.Drawing.PointF ($x + $k / 5), ($y - $k / 5)),
      (New-Object System.Drawing.PointF ($x + $k), $y), (New-Object System.Drawing.PointF ($x + $k / 5), ($y + $k / 5)),
      (New-Object System.Drawing.PointF $x, ($y + $k)), (New-Object System.Drawing.PointF ($x - $k / 5), ($y + $k / 5)),
      (New-Object System.Drawing.PointF ($x - $k), $y), (New-Object System.Drawing.PointF ($x - $k / 5), ($y - $k / 5))))
  }

  $g.Dispose()
  $bmp.Save((Join-Path $PSScriptRoot $file), [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

Draw-Icon 192 $false 1.0 'icon-192.png'
Draw-Icon 512 $false 1.0 'icon-512.png'
Draw-Icon 512 $true 0.72 'icon-maskable-512.png'  # phones may cut it into a circle: keep the picture in the middle
Draw-Icon 180 $true 0.9 'apple-touch-icon.png'    # iPhones round the corners themselves
Write-Output 'Icons made.'
