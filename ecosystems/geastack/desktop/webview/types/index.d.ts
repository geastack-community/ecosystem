/**
 * A web view (WebView2 on Windows, WKWebView on macOS) hosted inside a window of a Gea app.
 *
 * Declaration only: the compiler lowers every use through
 * `@geastack-community/webview/geatsc-plugin`.
 */
export declare class GeaWebView {
  /**
   * @param parentHandle Windows: the HWND of the window that hosts the control,
   * for example `mainWindowHandle()` or a `WinView`'s `handle` (both from
   * `@geastack/windows/Controls`). macOS: `0`, the app's own window.
   */
  constructor(parentHandle: number)
  /** Navigates to `url`. A call made while the control is still being created is applied once it is ready. */
  navigate(url: string): void
  /** Positions the control inside its parent's client area, in the parent's pixels. */
  setFrame(x: number, y: number, width: number, height: number): void
  /** Closes the control. Safe to call more than once. */
  destroy(): void
}
