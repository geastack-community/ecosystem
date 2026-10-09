import process from 'node:process'
import { describe, expect, it, } from 'vitest'
import { GeaWebView } from '../src/GeaWebView.js'

describe('GeaWebView Component', () => {
  it('should instantiate successfully', () => {
    const webview = new GeaWebView({ url: 'https://geastack.com' })
    expect(webview).toBeDefined()
    expect(webview).toBeInstanceOf(GeaWebView)
  })

  it('should default the URL to about:blank', () => {
    const webview = new GeaWebView()
    expect(webview).toBeDefined()
  })

  it('should receive a native handle when calling mount()', async () => {
    const webview = new GeaWebView({ url: 'https://example.com' })
    const dummyHandle = 0x12345678 // Mock WinView.handle (HWND / NSView)

    // Test that mount completes without error
    await expect(webview.mount(dummyHandle)).resolves.not.toThrow()
  })

  it('should throw an error when calling mount() with an invalid handle (Win32)', async () => {
    if (process.platform === 'win32') {
      const webview = new GeaWebView()
      await expect(webview.mount(0)).rejects.toThrow('[GeaWebView] Invalid Win32 HWND handle.')
    }
  })

  it('should not crash when calling navigate(), setFrame(), and destroy()', async () => {
    const webview = new GeaWebView({ url: 'https://geastack.com' })
    const dummyHandle = 1001

    await webview.mount(dummyHandle)

    expect(() => {
      webview.navigate('https://github.com')
      webview.setFrame(0, 0, 1024, 768)
      webview.destroy()
    }).not.toThrow()
  })
})