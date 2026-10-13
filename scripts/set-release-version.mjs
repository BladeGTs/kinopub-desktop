import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export function releaseVersion(input) {
  if (typeof input !== 'string' || !/^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(input)) {
    throw new Error('Expected a release version X.Y.Z or tag vX.Y.Z')
  }
  return input.replace(/^v/, '')
}

export function setReleaseVersion(input, root = resolve(dirname(fileURLToPath(import.meta.url)), '..')) {
  const version = releaseVersion(input)
  const packagePath = resolve(root, 'app/package.json')
  const webosPath = resolve(root, 'app/webos/appinfo.json')
  const builderPath = resolve(root, 'app/electron-builder.yml')
  const packageText = readFileSync(packagePath, 'utf8')
  JSON.parse(packageText)
  const webos = JSON.parse(readFileSync(webosPath, 'utf8'))
  const builder = readFileSync(builderPath, 'utf8')
  const field = /(extraMetadata:\r?\n\s{2}version:\s*)[^\r\n]+/
  const packageField = /("version"\s*:\s*")[^"]+(".*)/

  if (!field.test(builder)) throw new Error('Missing electron-builder extraMetadata.version')
  if (!packageField.test(packageText)) throw new Error('Missing package.json version')
  webos.version = version
  writeFileSync(packagePath, packageText.replace(packageField, (_, prefix, suffix) => prefix + version + suffix))
  writeFileSync(webosPath, JSON.stringify(webos, null, 2) + '\n')
  writeFileSync(builderPath, builder.replace(field, (_, prefix) => prefix + version))
  return version
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  console.log(`Release version: ${setReleaseVersion(process.argv[2] ?? process.env.GITHUB_REF_NAME)}`)
}
