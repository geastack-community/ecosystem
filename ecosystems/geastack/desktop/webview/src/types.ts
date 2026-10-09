export interface WebViewOptions {
  url?: string
  x?: number
  y?: number
  width?: number
  height?: number
}

export interface IPlatformWebView {
  mount(parentHandle: number): Promise<void>
  navigate(url: string): void
  setFrame(x: number, y: number, width: number, height: number): void
  destroy(): void
}