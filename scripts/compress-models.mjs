import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const outputDir = path.join(publicDir, 'compressed');
const cli = path.join(root, 'node_modules', '@gltf-transform', 'cli', 'bin', 'cli.js');
const decoderDir = path.join(root, 'node_modules', 'three', 'examples', 'jsm', 'libs', 'draco');

async function findGlbFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        if (entry.name === 'compressed') continue;

        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            files.push(...await findGlbFiles(entryPath));
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.glb')) {
            files.push(entryPath);
        }
    }

    return files;
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

for (const input of await findGlbFiles(publicDir)) {
    const relativePath = path.relative(publicDir, input);
    const output = path.join(outputDir, relativePath);
    await mkdir(path.dirname(output), { recursive: true });

    const result = spawnSync(process.execPath, [
        cli,
        'draco',
        input,
        output,
        '--method',
        'edgebreaker',
    ], { stdio: 'inherit' });

    if (result.status !== 0) {
        process.exit(result.status || 1);
    }
}

await cp(decoderDir, path.join(publicDir, 'draco'), { recursive: true });
