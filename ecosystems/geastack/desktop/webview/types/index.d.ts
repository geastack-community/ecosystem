/**
 * A WebView2 control hosted inside a Win32 window of a Gea Windows-native app.
 *
 * Declaration only: the compiler lowers every use through
 * `@geastack-community/webview/geatsc-plugin`.
 */
export declare class GeaWebView {
  /**
   * @param parentHandle HWND of the window that hosts the control, for example
   * `mainWindowHandle()` or a `WinView`'s `handle` (both from
   * `@geastack/windows/Controls`).
   */
  constructor(parentHandle: number)
  /** Navigates to `url`. A call made while the control is still being created is applied once it is ready. */
  navigate(url: string): void
  /** Positions the control inside its parent's client area, in the parent's pixels. */
  setFrame(x: number, y: number, width: number, height: number): void
  /** Closes the control. Safe to call more than once. */
  destroy(): void
}
