import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { carrier, declarationModules, hostConstructors, hostMembers, nativeIncludes, nativeTypes, webviewHeader } from '../plugin-tables.mjs'

const root = new URL('..', import.meta.url)
const declaration = readFileSync(new URL('types/index.d.ts', root), 'utf8')
const header = readFileSync(new URL('native/include/geastack/webview/webview.h', root), 'utf8')
const sources = {
  'native/win32/webview.cpp': readFileSync(new URL('native/win32/webview.cpp', root), 'utf8'),
  'native/macos/webview.mm': readFileSync(new URL('native/macos/webview.mm', root), 'utf8'),
}

const declaredMethods = [...declaration.matchAll(/^\s{2}(\w+)\(([^)]*)\): void$/gm)].map(([, name, parameters]) => [name, parameters.trim() === '' ? 0 : parameters.split(',').length])

test('every declared method has a host member with the same arity', () => {
  assert.deepEqual(
    declaredMethods.map(([name]) => name).sort(),
    [...hostMembers.keys()].map((key) => key.slice(carrier.length + 1)).sort(),
  )
  for (const [name, arity] of declaredMethods) assert.equal(hostMembers.get(`${carrier}.${name}`).arity, arity, name)
})

test('the constructor takes exactly the declared parameter', () => {
  assert.match(declaration, /constructor\(parentHandle: number\)/)
  assert.equal(hostConstructors.get(carrier).arity, 1)
})

test('every rendered thunk is declared in the header and defined in every backend', () => {
  const rendered = [hostConstructors.get(carrier).emit, ...[...hostMembers.values()].map((member) => member.emit)]
  for (const text of rendered) {
    const name = text.match(/gea::webview::(GeaWebView_\w+)/)[1]
    assert.match(header, new RegExp(`\\b${name}\\(`), `${name} is not declared in webview.h`)
    for (const [file, source] of Object.entries(sources)) {
      assert.match(source, new RegExp(`\\b${name}\\(`), `${name} is not defined in ${file}`)
    }
  }
})

test('the claim tables agree with each other', () => {
  assert.equal(nativeTypes.get('GeaWebView'), carrier)
  assert.ok(nativeIncludes.get(carrier).endsWith(webviewHeader))
  assert.ok(declarationModules.has('@geastack-community/webview'))
})

test('gea-native.json names files the package ships or fetches', () => {
  const manifest = JSON.parse(readFileSync(new URL('gea-native.json', root), 'utf8'))
  assert.deepEqual(manifest.windows.sources, ['native/win32/webview.cpp'])
  assert.ok(manifest.windows.includeDirs.includes('native/include'))
})
