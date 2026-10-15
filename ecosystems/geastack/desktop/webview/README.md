# @geastack-community/webview

A web view for GeaStack apps, lowered by a geatsc compiler plugin. Status:
**alpha.** Windows (WebView2) is verified in CI; macOS (WKWebView) is new and
being verified; Linux is not supported.

```ts
import { mainWindowHandle } from '@geastack/windows/Controls'
import { GeaWebView } from '@geastack-community/webview'

const view = new GeaWebView(mainWindowHandle())
view.setFrame(0, 40, 800, 560)
view.navigate('https://example.com')
// ...
view.destroy()
```

`parentHandle` is the HWND of the hosting window: `mainWindowHandle()` or a
`WinView`'s `handle`. The control is positioned by `setFrame` in the parent's
client pixels; it does not take part in `WinStackView` layout.

## `withWebView` (mixin API)

The same control, packaged like the other `@geastack-community` mixins:

```ts
import { Component } from '@geajs/core'
import { withWebView } from '@geastack-community/webview'

class Page extends withWebView(Component) {
  created() {
    const view = this.createWebView({ url: 'https://example.com' })
    view.setFrame(0, 40, 800, 560)
  }
}
```

- `parentHandle` defaults to `0`, which means "the app's own window" on both Windows and
  macOS. The backends resolve it natively, so no `mainWindowHandle()` / `0` branching is needed.
  Pass a handle only to host the control in a specific child view.
- `createWebView` returns the plain `GeaWebView`; there is no wrapper class.
- Every view created through `createWebView` is destroyed by `dispose()`.
- Combine with other mixins via `withMixins`; rename the creator with
  `(Base) => withWebView(Base, 'createMyWebView')`.

## macOS

`parentHandle` `0` puts the control into the app's own window, fills it and
follows its size until `setFrame` is called. The macOS target has no hook for a
dependency to add native sources, so the app lists the file itself:

```json
{
  "gea": {
    "nativeSources": ["node_modules/@geastack-community/webview/native/macos/webview.mm"]
  }
}
```

WebKit is loaded at run time; nothing has to be added to the link line.

## How it works

- `src/index.ts` is the source; `npm run build` emits `dist/` (JS and the declarations the checker types a program against).
- `geatsc-plugin.mjs` states, as data, that `GeaWebView` is a native handle and
  what each member renders to (`gea::webview::GeaWebView_*` thunks).
- `native/win32/webview.cpp` defines the thunks on top of WebView2.
- `gea-native.json` makes the Windows target compile that file, add the WebView2
  headers, link `WebView2Loader.dll.lib` and copy `WebView2Loader.dll` beside the
  executable.

## Build requirements

Run `npm run build` to emit `dist/` and `npm run fetch` once (it downloads the WebView2 SDK into `third_party/`).
Until the `gea build` plugin collection picks this package up automatically, pass
the plugin to the build:

```
set GEA_EXTRA_GEATSC_PLUGINS=<path>\node_modules\@geastack-community\webview\geatsc-plugin.mjs
```

The WebView2 Runtime must be installed on the machine that runs the app.

## Limits

- All calls must be made on the UI thread that owns the parent window.
- Coordinates are physical pixels of the parent's client area; no DPI scaling.
- No script execution, messaging or navigation events yet.
