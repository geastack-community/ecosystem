function nativeOnly(name) {
  throw new Error(
    `@geastack-community/webview ${name} is native-only and must be lowered by @geastack-community/webview/geatsc-plugin.`,
  )
}

export class GeaWebView {
  constructor() {
    nativeOnly('new GeaWebView')
  }
  navigate() {
    return nativeOnly('GeaWebView.navigate')
  }
  setFrame() {
    return nativeOnly('GeaWebView.setFrame')
  }
  destroy() {
    return nativeOnly('GeaWebView.destroy')
  }
}
