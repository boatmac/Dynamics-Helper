import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { lstat, readFile, realpath, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const root = path.dirname(fileURLToPath(import.meta.url))
const output = 'C:/Users/zhaobo/AppData/Local/Temp/opencode/dh-attachment-download-harness-v3'
const sourceNames = [
    'build.mjs', 'manifest.json', 'page.html', 'page.css',
    'page.ts', 'observer.ts', 'portal.ts',
    '../../src/utils/attachmentDownload.ts', '../../src/utils/ownData.ts',
    '../../package.json', '../../package-lock.json',
]
const moduleNames = sourceNames.slice(4, 9)
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const canonical = value => path.resolve(value).toLowerCase()
const fail = () => { throw new Error('build_rejected') }

// Check every existing ancestor, not just the leaf, to reject redirected trees.
async function checkedPath(filename, kind) {
    const absolute = path.resolve(filename)
    const base = path.parse(absolute).root
    const parts = path.relative(base, absolute).split(path.sep).filter(Boolean)
    let current = base
    for (let index = -1; index < parts.length; index++) {
        if (index >= 0) current = path.join(current, parts[index])
        const stat = await lstat(current)
        const leaf = index === parts.length - 1
        if (stat.isSymbolicLink()
            || (leaf && kind === 'file' ? !stat.isFile() : !stat.isDirectory())
            || canonical(await realpath(current)) !== canonical(current)) fail()
    }
    return absolute
}

async function snapshot(entries) {
    const values = new Map()
    for (const [label, filename] of entries) {
        await checkedPath(filename, 'file')
        values.set(label, await readFile(filename))
    }
    return values
}

function sameSnapshot(before, after) {
    if (before.size !== after.size) fail()
    for (const [label, bytes] of before) {
        if (!after.get(label)?.equals(bytes)) fail()
    }
}

function hashes(values) {
    return Object.fromEntries([...values].map(([label, bytes]) => [label, sha256(bytes)]))
}

function validateManifest(bytes) {
    const manifest = JSON.parse(bytes.toString('utf8'))
    const keys = ['manifest_version', 'name', 'version', 'description', 'permissions', 'host_permissions', 'options_ui']
    if (Object.keys(manifest).sort().join(',') !== keys.sort().join(',')
        || manifest.manifest_version !== 3
        || JSON.stringify(manifest.permissions) !== JSON.stringify(['downloads', 'scripting', 'storage', 'activeTab'])
        || JSON.stringify(manifest.host_permissions) !== JSON.stringify(['https://client.dtmnebula.microsoft.com/*'])
        || JSON.stringify(manifest.options_ui) !== JSON.stringify({ page: 'page.html', open_in_tab: true })) fail()
}

async function main() {
    console.log(`build_start pid=${process.pid} time=${new Date().toISOString()}`)
    if (process.platform !== 'win32' || !['x64', 'arm64', 'ia32'].includes(process.arch)
        || Object.hasOwn(process.env, 'ESBUILD_BINARY_PATH')) fail()
    await checkedPath(root, 'directory')
    const parent = await checkedPath(path.dirname(output), 'directory')
    try {
        await lstat(output)
        fail()
    } catch (error) {
        if (error?.code !== 'ENOENT') throw error
    }

    const sources = sourceNames.map(name => [name, path.resolve(root, name)])
    const before = await snapshot(sources)
    validateManifest(before.get('manifest.json'))

    // Use only the existing local JS API and its installed Windows binary package.
    const nodeModules = path.resolve(root, '../../node_modules')
    const binaryPackage = `@esbuild/win32-${process.arch}`
    const toolFiles = [
        ['esbuild/package.json', path.join(nodeModules, 'esbuild/package.json')],
        ['esbuild/lib/main.js', path.join(nodeModules, 'esbuild/lib/main.js')],
        [`${binaryPackage}/package.json`, path.join(nodeModules, binaryPackage, 'package.json')],
        [`${binaryPackage}/esbuild.exe`, path.join(nodeModules, binaryPackage, 'esbuild.exe')],
    ]
    const toolBefore = await snapshot(toolFiles)
    const apiPackage = JSON.parse(toolBefore.get('esbuild/package.json').toString('utf8'))
    const nativePackage = JSON.parse(toolBefore.get(`${binaryPackage}/package.json`).toString('utf8'))
    if (apiPackage.name !== 'esbuild' || nativePackage.name !== binaryPackage
        || apiPackage.version !== '0.27.2'
        || apiPackage.version !== nativePackage.version) fail()
    const apiPath = toolFiles[1][1]
    const binaryPath = toolFiles[3][1]
    const require = createRequire(import.meta.url)
    const apiRequire = createRequire(apiPath)
    if (canonical(apiRequire.resolve(`${binaryPackage}/esbuild.exe`)) !== canonical(binaryPath)) fail()
    const binaryVersion = execFileSync(binaryPath, ['--version'], {
        encoding: 'utf8', timeout: 10_000, maxBuffer: 1024,
        windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
    if (binaryVersion !== apiPackage.version) fail()
    const esbuild = require(apiPath)
    if (esbuild.version !== apiPackage.version) fail()
    let result
    try {
        result = await esbuild.build({
            absWorkingDir: root,
            entryPoints: [path.join(root, 'page.ts')],
            outfile: path.join(output, 'page.js'),
            bundle: true,
            write: false,
            metafile: true,
            platform: 'browser',
            format: 'esm',
            target: 'chrome120',
            minify: false,
            keepNames: false,
            sourcemap: false,
            logLevel: 'silent',
            tsconfigRaw: { compilerOptions: { target: 'ES2022', useDefineForClassFields: true } },
        })
    } finally {
        esbuild.stop()
    }

    const allowed = new Set(moduleNames.map(name => canonical(path.resolve(root, name))))
    const inputs = Object.entries(result.metafile.inputs)
    if (inputs.length !== allowed.size || result.warnings.length !== 0) fail()
    for (const [name, input] of inputs) {
        if (!allowed.delete(canonical(path.resolve(root, name)))) fail()
        for (const imported of input.imports) {
            if (imported.external
                || !moduleNames.some(module => canonical(path.resolve(root, module))
                    === canonical(path.resolve(root, imported.path)))) fail()
        }
    }
    if (allowed.size !== 0 || result.outputFiles.length !== 1
        || canonical(result.outputFiles[0].path) !== canonical(path.join(output, 'page.js'))) fail()
    const outputs = Object.entries(result.metafile.outputs)
    if (outputs.length !== 1 || outputs[0][1].imports.length !== 0
        || canonical(path.resolve(root, outputs[0][0])) !== canonical(path.join(output, 'page.js'))) fail()

    sameSnapshot(before, await snapshot(sources))
    sameSnapshot(toolBefore, await snapshot(toolFiles))
    const files = new Map([
        ['manifest.json', before.get('manifest.json')],
        ['page.html', before.get('page.html')],
        ['page.css', before.get('page.css')],
        ['page.js', Buffer.from(result.outputFiles[0].contents)],
    ])
    const json = value => Buffer.from(`${JSON.stringify(value, null, 2)}\n`)
    files.set('source-hashes.json', json({
        schemaVersion: 1,
        sources: hashes(before),
        toolchain: {
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            packageVersion: apiPackage.version,
            jsApiVersion: esbuild.version,
            binaryVersion,
            files: hashes(toolBefore),
        },
    }))
    files.set('build-info.json', json({
        schemaVersion: 1,
        // This file cannot contain its own hash; all other output basenames are covered.
        outputs: hashes(files),
    }))

    await checkedPath(parent, 'directory')
    await mkdir(output) // No recursive creation, replacement, cleanup, or second attempt.
    for (const [name, bytes] of files) {
        await checkedPath(output, 'directory')
        await writeFile(path.join(output, name), bytes, { flag: 'wx' })
    }
    sameSnapshot(before, await snapshot(sources))
    sameSnapshot(toolBefore, await snapshot(toolFiles))
    for (const [name, bytes] of files) {
        const filename = await checkedPath(path.join(output, name), 'file')
        if (!(await readFile(filename)).equals(bytes)) fail()
    }
    console.log(output)
}

try {
    await main()
} catch {
    console.error('build_failed: do not load output; existing or partial output is preserved; no retry or cleanup performed.')
    process.exitCode = 1
}
