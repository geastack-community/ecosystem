// The host tables of the WebView plugin as plain data (no compiler import), so
// they can be tested without the compiler installed.

import { fileURLToPath } from 'node:url'

export const webviewHeader = 'geastack/webview/webview.h'
export const carrier = 'gea::webview::GeaWebView'
const ns = 'gea::webview'

export const nativeTypes = new Map([['GeaWebView', carrier]])
// Windows adds native/include to the include path through gea-native.json. The
// macOS build has no such hook, so generated code names the header by its
// absolute path there.
export const includedHeader =
  process.platform === 'darwin'
    ? fileURLToPath(new URL('./native/include/geastack/webview/webview.h', import.meta.url))
    : webviewHeader

export const nativeIncludes = new Map([[carrier, includedHeader]])

// `new GeaWebView(parent)`: the thunk returns the handle-table entry as a double.
export const hostConstructors = new Map([
  [carrier, { emit: `${carrier}(static_cast<double>(${ns}::GeaWebView_create({arg0})))`, arity: 1 }],
])

const method = (name, arity) => [
  `${carrier}.${name}`,
  { kind: 'method', emit: `${ns}::GeaWebView_${name}({receiver}${Array.from({ length: arity }, (_, index) => `, {arg${index}}`).join('')})`, arity },
]

export const hostMembers = new Map([method('navigate', 1), method('setFrame', 4), method('destroy', 0)])

export const declarationModules = new Set(['@geastack-community/webview'])
