import type { IPlatformWebView, WebViewOptions } from '../types.js'

interface NativeLinuxBridge {
  CreateWebViewLinux(parent: number, url: string, x: number, y: number, width: number, height: number): number
  NavigateWebViewLinux(instancePtr: number, url: string): void
  SetFrameWebViewLinux(instancePtr: number, x: number, y: number, width: number, height: number): void
  DestroyWebViewLinux(instancePtr: number): void
}

declare const nativeBridge: NativeLinuxBridge | undefined

const DEFAULT_WIDTH = 800
const DEFAULT_HEIGHT = 600

export class LinuxWebViewPlatform implements IPlatformWebView {
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
   * @param parentHandle X11 Window ID of the host window, or 0 to attach to
   * this process's own top-level window. Requires an X11 / Xwayland session.
   */
  async mount(parentHandle: number): Promise<void> {
    if (!Number.isInteger(parentHandle) || parentHandle < 0) {
      throw new Error('[GeaWebView] Invalid parent handle.')
    }

    if (this.nativeInstancePtr) {
      throw new Error('[GeaWebView] WebView is already mounted.')
    }

    if (typeof nativeBridge !== 'undefined' && nativeBridge.CreateWebViewLinux) {
      this.nativeInstancePtr = nativeBridge.CreateWebViewLinux(
        parentHandle,
        this.url,
        this.x,
        this.y,
        this.width,
        this.height
      )

      if (!this.nativeInstancePtr) {
        throw new Error('[GeaWebView] Failed to create native Linux WebView.')
      }
    } else {
      console.warn('[GeaWebView] Native Linux bridge is not available in current runtime.')
    }
  }

  navigate(url: string): void {
    this.url = url
    if (this.nativeInstancePtr && typeof nativeBridge !== 'undefined') {
      nativeBridge.NavigateWebViewLinux(this.nativeInstancePtr, url)
    }
  }

  setFrame(x: number, y: number, width: number, height: number): void {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    if (this.nativeInstancePtr && typeof nativeBridge !== 'undefined') {
      nativeBridge.SetFrameWebViewLinux(this.nativeInstancePtr, x, y, width, height)
    }
  }

  destroy(): void {
    if (this.nativeInstancePtr && typeof nativeBridge !== 'undefined') {
      nativeBridge.DestroyWebViewLinux(this.nativeInstancePtr)
    }
    this.nativeInstancePtr = 0
  }
}
