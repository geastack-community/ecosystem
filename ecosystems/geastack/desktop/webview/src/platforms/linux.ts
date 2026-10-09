import type { IPlatformWebView, WebViewOptions } from '../types.js'

export class LinuxWebViewPlatform implements IPlatformWebView {
  constructor(_options: WebViewOptions) {}

  async mount(_parentHandle: number): Promise<void> {
  }

  navigate(_url: string): void {}

  setFrame(_x: number, _y: number, _width: number, _height: number): void {}

  destroy(): void {}
}