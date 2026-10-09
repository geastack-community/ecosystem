import type { IPlatformWebView, WebViewOptions } from '../types.js'

interface NativeDarwinBridge {
  CreateWebViewDarwin(parent: number, url: string, x: number, y: number, width: number, height: number): number
  NavigateWebViewDarwin(instancePtr: number, url: string): void
  SetFrameWebViewDarwin(instancePtr: number, x: number, y: number, width: number, height: number): void
  DestroyWebViewDarwin(instancePtr: number): void
}

declare const nativeBridge: NativeDarwinBridge | undefined

const DEFAULT_WIDTH = 800
const DEFAULT_HEIGHT = 600

export class DarwinWebViewPlatform implements IPlatformWebView {
  private nativeInstancePtr: number = 0
  private url: string
  private x: number
  private y: number
  private width: number
  private height: number

  constructor(options: WebViewOptions) {
    this.url = options.url || 'about:blank'
    this.x = options.x ?? 0
    this.y = options.y ?? 0
    this.width = options.width ?? DEFAULT_WIDTH
    this.height = options.height ?? DEFAULT_HEIGHT
  }

  /**
   * @param parentHandle NSView* of the host view, or 0 to attach to the
   * app's own window (key / main window content view). @geastack/apple does
   * not expose a pointer for its views, so 0 is the usual choice.
   */
  async mount(parentHandle: number): Promise<void> {
    if (!Number.isInteger(parentHandle) || parentHandle < 0) {
      throw new Error('[GeaWebView] Invalid parent handle.')
    }

    if (this.nativeInstancePtr) {
      throw new Error('[GeaWebView] WebView is already mounted.')
    }

    if (typeof nativeBridge !== 'undefined' && nativeBridge.CreateWebViewDarwin) {
      this.nativeInstancePtr = nativeBridge.CreateWebViewDarwin(
        parentHandle,
        this.url,
        this.x,
        this.y,
        this.width,
        this.height
      )

      if (!this.nativeInstancePtr) {
        throw new Error('[GeaWebView] Failed to create native macOS WebView.')
      }
    } else {
      console.warn('[GeaWebView] Native macOS bridge is not available in current runtime.')
    }
  }

  navigate(url: string): void {
    this.url = url
    if (this.nativeInstancePtr && typeof nativeBridge !== 'undefined') {
      nativeBridge.NavigateWebViewDarwin(this.nativeInstancePtr, url)
    }
  }

  setFrame(x: number, y: number, width: number, height: number): void {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    if (this.nativeInstancePtr && typeof nativeBridge !== 'undefined') {
      nativeBridge.SetFrameWebViewDarwin(this.nativeInstancePtr, x, y, width, height)
    }
  }

  destroy(): void {
    if (this.nativeInstancePtr && typeof nativeBridge !== 'undefined') {
      nativeBridge.DestroyWebViewDarwin(this.nativeInstancePtr)
    }
    this.nativeInstancePtr = 0
  }
}
