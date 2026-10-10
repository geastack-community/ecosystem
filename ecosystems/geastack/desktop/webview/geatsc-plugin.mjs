// @geastack-community/webview as a geatsc compiler plugin.
//
// Pure data: it tells the compiler that `GeaWebView` is a native handle carried
// by `gea::webview::GeaWebView` and what each member renders to. The thunks are
// defined in native/win32/webview.cpp, compiled and linked through
// gea-native.json by the Windows target.

import { inertPluginInstance } from '@geastack/compiler/plugin'
import { declarationModules, hostConstructors, hostMembers, nativeIncludes, nativeTypes } from './plugin-tables.mjs'

export const webviewPlugin = {
  name: 'geastack-community-webview',
  instantiate: () => ({
    ...inertPluginInstance,
    capabilities: {
      ...inertPluginInstance.capabilities,
      nativeTypes,
      nativeIncludes,
      hostMembers,
      hostConstructors,
      declarationModules,
    },
  }),
}

export default webviewPlugin
