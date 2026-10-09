import type { IPlatformWebView, WebViewOptions } from '../types.js'

interface NativeWin32Bridge {
  CreateWebViewWin32(hwnd: number, url: string, width: number, height: number): number
  NavigateWebViewWin32(instancePtr: number, url: string): void
  ResizeWebViewWin32(instancePtr: number, width: number, height: number): void
  DestroyWebViewWin32(instancePtr: number): void
}

declare const nativeBridge: NativeWin32Bridge | undefined

export class Win32WebViewPlatform implements IPlatformWebView {
  private nativeInstancePtr: number = 0
  private url: string

  constructor(options: WebViewOptions) {
    this.url = options.url || 'about:blank'
  }

  async mount(parentHwnd: number): Promise<void> {
    if (!parentHwnd) {
      throw new Error('[GeaWebView] Invalid Win32 HWND handle.')
    }

    if (typeof nativeBridge !== 'undefined' && nativeBridge.CreateWebViewWin32) {
      this.nativeInstancePtr = nativeBridge.CreateWebViewWin32(
        parentHwnd,
        this.url,
        800,
        600
      )
    } else {
      console.warn('[GeaWebView] Native Win32 bridge is not available in current runtime.')
    }
  }

  navigate(url: string): void {
    this.url = url
    if (this.nativeInstancePtr && typeof nativeBridge !== 'undefined') {
      nativeBridge.NavigateWebViewWin32(this.nativeInstancePtr, url)
    }
  }

  setFrame(_x: number, _y: number, width: number, height: number): void {
    if (this.nativeInstancePtr && typeof nativeBridge !== 'undefined') {
      nativeBridge.ResizeWebViewWin32(this.nativeInstancePtr, width, height)
    }
  }

  destroy(): void {
    if (this.nativeInstancePtr && typeof nativeBridge !== 'undefined') {
      nativeBridge.DestroyWebViewWin32(this.nativeInstancePtr)
      this.nativeInstancePtr = 0
    }
  }
}