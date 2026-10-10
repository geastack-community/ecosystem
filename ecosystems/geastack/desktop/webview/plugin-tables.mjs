// The host tables of the WebView plugin as plain data (no compiler import), so
// they can be tested without the compiler installed.

export const webviewHeader = 'geastack/webview/webview.h'
export const carrier = 'gea::webview::GeaWebView'
const ns = 'gea::webview'

export const nativeTypes = new Map([['GeaWebView', carrier]])
export const nativeIncludes = new Map([[carrier, webviewHeader]])

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
