#!/usr/bin/env node
// Downloads the WebView2 SDK (headers, import library, loader DLL) from NuGet
// into third_party/webview2/, which gea-native.json points at.

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const VERSION = process.env.WEBVIEW2_VERSION ?? '1.0.2903.40'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const destination = path.join(root, 'third_party', 'webview2')
const marker = path.join(destination, 'build', 'native', 'include', 'WebView2.h')

const fail = (message) => {
  process.stderr.write(`fetch-webview2: ${message}\n`)
  process.exit(1)
}

if (existsSync(marker) && !process.argv.includes('--force')) {
  process.stdout.write(`WebView2 ${VERSION} already present at ${destination}\n`)
  process.exit(0)
}

const url = `https://www.nuget.org/api/v2/package/Microsoft.Web.WebView2/${VERSION}`
process.stdout.write(`Downloading ${url}\n`)
const response = await fetch(url)
if (!response.ok) fail(`download failed: HTTP ${response.status}`)

rmSync(destination, { recursive: true, force: true })
mkdirSync(destination, { recursive: true })
const archive = path.join(destination, '..', `webview2-${VERSION}.nupkg`)
writeFileSync(archive, Buffer.from(await response.arrayBuffer()))

// bsdtar (built into Windows 10+, and on macOS) reads zip; unzip covers the rest.
let extracted = spawnSync('tar', ['-xf', archive, '-C', destination], { stdio: 'inherit' })
if (extracted.status !== 0) extracted = spawnSync('unzip', ['-q', '-o', archive, '-d', destination], { stdio: 'inherit' })
rmSync(archive, { force: true })
if (extracted.status !== 0) fail('could not extract the package (needs tar or unzip)')
if (!existsSync(marker)) fail(`extracted package has no ${path.relative(root, marker)}`)
process.stdout.write(`WebView2 ${VERSION} ready at ${path.relative(root, destination)}\n`)
