import { execSync } from 'node:child_process'
import existsSync from 'node:fs'
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

console.log(`[build-native] Building native library for ${platform} in ${packageDir}...`)

try {
  execSync(`cmake -B "${buildPath}" -S "${sourcePath}"`, { stdio: 'inherit' })
  execSync(`cmake --build "${buildPath}" --config Release`, { stdio: 'inherit' })
  console.log(`[build-native] Successfully built native library.`)
} catch (error) {
  console.error(`[build-native] Build failed:`, error.message)
  process.exit(1)
}