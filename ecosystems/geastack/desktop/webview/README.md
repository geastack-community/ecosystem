# @geastack-community/webview

> GeaStack Community is an independent community project and is not
> affiliated with or endorsed by Gea. Gea has granted permission for the
> project to use the 'GeaStack Community' name and associated
> geastack-community domain and package namespace.

## Parent handle (`mount(parentHandle)`)

| Platform | `parentHandle` | Backend |
| --- | --- | --- |
| Windows | `WinView.handle` / `mainWindowHandle()` (HWND) | WebView2 |
| macOS | `0` = the app's own window (default); or an `NSView*` supplied by the host | WKWebView |
| Linux (Experimental) | `0` = this process's own window (default); or an X11 Window ID | WebKitGTK (X11 / Xwayland only) |

Linux requires `libwebkit2gtk-4.1-dev` (or 4.0) and `libgtk-3-dev` at build time.
Native Wayland sessions are not supported; run the host under X11 or Xwayland.

Apache 2.0 © [GeaStack Community](https://github.com/geastack-community)