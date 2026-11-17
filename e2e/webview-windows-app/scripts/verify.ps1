# Starts the built app, waits for its window and checks that a WebView2 control
# exists in it and that the window shows the red page. Writes screenshots to
# ./artifacts either way.

param(
  [int]$StartTimeoutSeconds = 60,
  [int]$SettleSeconds = 10
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
public static class Win {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  public delegate bool EnumProc(IntPtr hwnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hwnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hwnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hwnd, int command);
  [DllImport("user32.dll")] public static extern IntPtr GetWindow(IntPtr hwnd, uint command);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hwnd);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr parent, EnumProc callback, IntPtr lParam);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetClassName(IntPtr hwnd, StringBuilder text, int count);
  // Direct children, front to back (GW_CHILD = 5, GW_HWNDNEXT = 2).
  public static List<string> DirectChildren(IntPtr parent) {
    var list = new List<string>();
    for (IntPtr child = GetWindow(parent, 5); child != IntPtr.Zero; child = GetWindow(child, 2)) {
      var text = new StringBuilder(256);
      GetClassName(child, text, 256);
      RECT rect;
      GetWindowRect(child, out rect);
      list.Add(string.Format("{0} visible={1} rect={2},{3},{4},{5}", text, IsWindowVisible(child), rect.Left, rect.Top, rect.Right, rect.Bottom));
    }
    return list;
  }
  public static List<string> ChildClasses(IntPtr parent) {
    var classes = new List<string>();
    EnumChildWindows(parent, (hwnd, lParam) => {
      var text = new StringBuilder(256);
      GetClassName(hwnd, text, 256);
      classes.Add(text.ToString());
      return true;
    }, IntPtr.Zero);
    return classes;
  }
}
"@
[void][Win]::SetProcessDPIAware()

$artifacts = Join-Path (Get-Location) 'artifacts'
New-Item -ItemType Directory -Force -Path $artifacts | Out-Null

function Save-Screen([string]$name) {
  $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
  $bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
  $bitmap.Save((Join-Path $artifacts $name), [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $bitmap.Dispose()
}
Add-Type -AssemblyName System.Windows.Forms

$exe = Get-ChildItem -Path 'dist/windows' -Recurse -Filter '*.exe' |
  Where-Object { $_.FullName -notmatch '[\\/]build[\\/]' } | Select-Object -First 1
if (-not $exe) { throw 'no executable found under dist/windows' }
Write-Host "Starting $($exe.FullName)"
$process = Start-Process -FilePath $exe.FullName -WorkingDirectory $exe.DirectoryName -PassThru

try {
  $deadline = (Get-Date).AddSeconds($StartTimeoutSeconds)
  while ((Get-Date) -lt $deadline -and -not $process.HasExited) {
    $process.Refresh()
    if ($process.MainWindowHandle -ne [IntPtr]::Zero) { break }
    Start-Sleep -Milliseconds 500
  }
  if ($process.HasExited) { throw "the app exited early with code $($process.ExitCode)" }
  if ($process.MainWindowHandle -eq [IntPtr]::Zero) { throw "no main window after $StartTimeoutSeconds s" }

  [void][Win]::ShowWindow($process.MainWindowHandle, 9)
  [void][Win]::SetForegroundWindow($process.MainWindowHandle)
  Write-Host "Window found; waiting $SettleSeconds s for WebView2 to start"
  Start-Sleep -Seconds $SettleSeconds
  if ($process.HasExited) { throw "the app crashed after start, exit code $($process.ExitCode)" }

  Save-Screen 'screen.png'

  Write-Host 'Direct children of the main window, front to back:'
  [Win]::DirectChildren($process.MainWindowHandle) | ForEach-Object { Write-Host "  $_" }
  $classes = [Win]::ChildClasses($process.MainWindowHandle)
  Write-Host "Child window classes: $($classes -join ', ')"
  if (-not ($classes | Where-Object { $_ -like 'Chrome_*' })) {
    throw 'no WebView2 (Chrome_*) child window exists: the control was never created'
  }

  $rect = New-Object Win+RECT
  [void][Win]::GetWindowRect($process.MainWindowHandle, [ref]$rect)
  $width = $rect.Right - $rect.Left
  $height = $rect.Bottom - $rect.Top
  Write-Host "Window rect: $($rect.Left),$($rect.Top) ${width}x${height}"
  $bitmap = New-Object System.Drawing.Bitmap $width, $height
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.CopyFromScreen($rect.Left, $rect.Top, 0, 0, (New-Object System.Drawing.Size $width, $height))
  $bitmap.Save((Join-Path $artifacts 'window.png'), [System.Drawing.Imaging.ImageFormat]::Png)

  # Average a block around the centre of the window.
  $sumR = 0; $sumG = 0; $sumB = 0; $count = 0
  for ($x = [int]($width / 2) - 8; $x -lt [int]($width / 2) + 8; $x++) {
    for ($y = [int]($height / 2) - 8; $y -lt [int]($height / 2) + 8; $y++) {
      $pixel = $bitmap.GetPixel($x, $y)
      $sumR += $pixel.R; $sumG += $pixel.G; $sumB += $pixel.B; $count++
    }
  }
  $graphics.Dispose(); $bitmap.Dispose()
  $r = [int]($sumR / $count); $g = [int]($sumG / $count); $b = [int]($sumB / $count)
  Write-Host "Centre colour: R=$r G=$g B=$b"
  if ($r -lt 200 -or $g -gt 60 -or $b -gt 60) { throw "the window centre is not red (R=$r G=$g B=$b)" }

  Write-Host 'OK: the WebView2 control exists and shows the red page.'
}
catch {
  Write-Host "FAILED: $_"
  try { Save-Screen 'screen-failure.png' } catch { }
  exit 1
}
finally {
  if (-not $process.HasExited) { Stop-Process -Id $process.Id -Force }
}
