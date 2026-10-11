#!/usr/bin/env bash
# Launches the built app and checks that it started a WebKit content process,
# which only happens when a WKWebView was created. No screen-recording
# permission is needed, unlike a screenshot.
set -u
mkdir -p artifacts

app=$(find dist -maxdepth 4 -name '*.app' -type d | head -1)
if [ -z "$app" ]; then
  echo "FAILED: no .app under dist/"
  find dist -maxdepth 3 | head -50
  exit 1
fi
exe=$(find "$app/Contents/MacOS" -type f | head -1)
echo "app: $app"
echo "executable: $exe"

count() { pgrep -f "com.apple.WebKit.WebContent" | wc -l | tr -d ' '; }
before=$(count)

open -n "$app"
sleep 15

fail=0
if ! pgrep -f "$exe" > /dev/null; then
  echo "FAILED: the app is not running (it exited or never started)"
  fail=1
fi

after=$(count)
echo "WebKit WebContent processes: before=$before after=$after"
ps aux | grep -i -E "WebKit|$(basename "$exe")" | grep -v grep > artifacts/processes.txt || true
cat artifacts/processes.txt
screencapture -x artifacts/screen.png 2> artifacts/screencapture.err || true

if [ "$after" -le "$before" ]; then
  echo "FAILED: the app did not start a WebKit content process, so no WKWebView was created"
  fail=1
fi

pkill -f "$exe" || true
[ "$fail" -eq 0 ] && echo "OK: a WKWebView was created and is loading content."
exit $fail
