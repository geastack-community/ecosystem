import process from 'node:process'
import type { IPlatformWebView, WebViewOptions } from './types.js'
import { Win32WebViewPlatform } from './platforms/win32.js'
import { DarwinWebViewPlatform } from './platforms/darwin.js'
import { LinuxWebViewPlatform } from './platforms/linux.js'

export class GeaWebView {
  private platformImpl: IPlatformWebView

  constructor(options: WebViewOptions = {}) {
    const platform = process.platform

    if (platform === 'win32') {
      this.platformImpl = new Win32WebViewPlatform(options)
    } else if (platform === 'darwin') {
      this.platformImpl = new DarwinWebViewPlatform(options)
    } else if (platform === 'linux') {
      this.platformImpl = new LinuxWebViewPlatform(options)
    } else {
      throw new Error(`[GeaWebView] Unsupported platform: ${platform}`)
    }
  }

  async mount(parentHandle: number): Promise<void> {
    await this.platformImpl.mount(parentHandle)
  }

  navigate(url: string): void {
    this.platformImpl.navigate(url)
  }

  setFrame(x: number, y: number, width: number, height: number): void {
    this.platformImpl.setFrame(x, y, width, height)
  }

  destroy(): void {
    this.platformImpl.destroy()
  }
}