import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { basename, join } from 'node:path'

const version = process.env.APP_VERSION
const tag = process.env.RELEASE_TAG || `v${version}`
const repo = process.env.GITHUB_REPOSITORY || 'EAS22/AISura'
const nsisDir = process.env.NSIS_DIR || 'src-tauri/target/release/bundle/nsis'

if (!version) {
  throw new Error('APP_VERSION is required')
}

const candidates = [
  `AISura_${version}_x64-setup.exe`,
  `AISura_${version}_x64_en-US.msi`,
]

const installer = candidates.map((name) => join(nsisDir, name)).find((path) => existsSync(path))

if (!installer) {
  throw new Error(`No Windows installer found in ${nsisDir}`)
}

const sigPath = `${installer}.sig`
const signature = readFileSync(sigPath, 'utf8').trim()
const fileName = basename(installer)

const manifest = {
  version,
  notes: `AISura ${tag}`,
  pub_date: new Date().toISOString(),
  platforms: {
    'windows-x86_64': {
      signature,
      url: `https://github.com/${repo}/releases/download/${tag}/${fileName}`,
    },
  },
}

writeFileSync('latest.json', `${JSON.stringify(manifest, null, 2)}\n`)
