import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const extensionDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(resolve(extensionDir, 'items.json'));
const built = readFileSync(resolve(extensionDir, 'dist', 'items.json'));

assert.ok(source.equals(built), 'dist/items.json differs from tracked items.json');
console.log('default menu build copy: PASS');
