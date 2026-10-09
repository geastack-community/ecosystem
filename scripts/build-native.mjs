import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, copyFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const packageDir = process.cwd()
const platform = process.platform

const platformDirMap = {
  win32: 'native/win32',
  darwin: 'native/darwin',
  linux: 'native/linux',
}

const targetSubDir = platformDirMap[platform]

if (!targetSubDir) {
  console.log(`[build-native] Unsupported platform: ${platform}. Skipping native build.`)
  process.exit(0)
}

const sourcePath = path.resolve(packageDir, targetSubDir)
const buildPath = path.resolve(sourcePath, 'build')

if (!existsSync(path.join(sourcePath, 'CMakeLists.txt'))) {
  console.log(`[build-native] No CMakeLists.txt found at ${sourcePath}. Skipping.`)
  process.exit(0)
}

// Only the library we build is shipped: geastack_webview_<platform>.dll
// (Windows), libgeastack_webview_<platform>.so (Linux) or
// libgeastack_webview_<platform>.dylib (macOS).
const OWN_LIBRARY_PATTERN = /^(lib)?geastack_webview_[A-Za-z0-9]+\.(dll|so|dylib)$/

// Runtime dependency of the Win32 build. CMake copies it next to our DLL
// (POST_BUILD), so it is only taken from the directory our DLL is in. The
// NuGet package ships x64 / x86 / arm64 copies that must not be mixed up.
const RUNTIME_DEPENDENCIES = ['WebView2Loader.dll']

// Directories that only contain CMake internals or downloaded packages.
const IGNORED_DIRECTORIES = new Set(['_deps', 'CMakeFiles'])

const findOwnLibraries = (dir, found = []) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!IGNORED_DIRECTORIES.has(entry.name)) {
        findOwnLibraries(fullPath, found)
      }
    } else if (OWN_LIBRARY_PATTERN.test(entry.name)) {
      found.push(fullPath)
    }
  }
  return found
}

console.log(`[build-native] Building native library for ${platform} in ${packageDir}...`)

try {
  execSync(`cmake -B "${buildPath}" -S "${sourcePath}"`, { stdio: 'inherit' })
  execSync(`cmake --build "${buildPath}" --config Release`, { stdio: 'inherit' })
  console.log(`[build-native] Successfully built native library.`)

  const distDir = path.resolve(packageDir, 'dist')
  if (!existsSync(distDir)) {
    mkdirSync(distDir, { recursive: true })
  }

  const libraries = findOwnLibraries(buildPath)
  if (libraries.length === 0) {
    throw new Error(`No native library matching ${OWN_LIBRARY_PATTERN} found in ${buildPath}.`)
  }

  const copy = (fullPath) => {
    const name = path.basename(fullPath)
    copyFileSync(fullPath, path.join(distDir, name))
    console.log(`[build-native] Copied ${name} -> dist/`)
  }

  for (const libraryPath of libraries) {
    copy(libraryPath)

    for (const dependency of RUNTIME_DEPENDENCIES) {
      const dependencyPath = path.join(path.dirname(libraryPath), dependency)
      if (existsSync(dependencyPath)) {
        copy(dependencyPath)
      }
    }
  }
} catch (error) {
  console.error(`[build-native] Build failed:`, error.message)
  process.exit(1)
}