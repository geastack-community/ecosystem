#!/usr/bin/env node
// Compiles native/win32/webview.cpp (no link) against the real WebView2 headers
// and a stub of the generated native bridge, with the flags the Windows target
// uses. Catches API and syntax errors without building a Gea app.

import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

if (process.platform !== 'win32') {
  process.stdout.write('compile-check: Windows only, skipping.\n')
  process.exit(0)
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const webview2Include = path.join(root, 'third_party', 'webview2', 'build', 'native', 'include')

const fail = (message) => {
  process.stderr.write(`compile-check: ${message}\n`)
  process.exit(1)
}

if (!existsSync(path.join(webview2Include, 'WebView2.h'))) fail('WebView2 SDK is missing; run `node scripts/fetch-webview2.mjs` first.')

const findClangCl = () => {
  const stated = process.env.GEA_WINDOWS_CLANG_CL
  if (stated) return existsSync(stated) ? stated : fail(`GEA_WINDOWS_CLANG_CL names a missing file: ${stated}`)
  const onPath = spawnSync('where', ['clang-cl.exe'], { encoding: 'utf8' })
  const found = onPath.status === 0 ? onPath.stdout.split(/\r?\n/).find(Boolean) : ''
  if (found) return found.trim()
  const llvm = path.join(process.env.ProgramFiles ?? 'C:/Program Files', 'LLVM/bin/clang-cl.exe')
  return existsSync(llvm) ? llvm : fail('clang-cl.exe not found; install LLVM or set GEA_WINDOWS_CLANG_CL.')
}

const clangCl = findClangCl()
const outDir = mkdtempSync(path.join(os.tmpdir(), 'geastack-webview-'))
const args = [
  '/nologo', '/c', '/std:c++20', '/Zc:__cplusplus', '/permissive-', '/EHsc', '/MD', '/utf-8', '/w',
  '/DNOMINMAX', '/DUNICODE', '/D_UNICODE', '/DWIN32_LEAN_AND_MEAN',
  `/I${path.join(root, 'test', 'stubs')}`,
  `/I${path.join(root, 'native', 'include')}`,
  `/I${webview2Include}`,
  `/Fo${path.join(outDir, 'webview.obj')}`,
  '/TP',
  path.join(root, 'native', 'win32', 'webview.cpp'),
]
process.stdout.write(`${path.basename(clangCl)} ${args.join(' ')}\n`)
const result = spawnSync(clangCl, args, { stdio: 'inherit' })
rmSync(outDir, { recursive: true, force: true })
if (result.status !== 0) fail('webview.cpp does not compile')
process.stdout.write('compile-check: webview.cpp compiles.\n')
