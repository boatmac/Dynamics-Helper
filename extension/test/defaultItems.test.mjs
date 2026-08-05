import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const extensionDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = resolve(extensionDir, 'items.json');

const EXPECTED_ITEMS = [
  {
    type: 'folder',
    label: 'Dynamics Helper Resources',
    children: [
      {
        type: 'link',
        label: 'User Guide',
        url: 'https://github.com/boatmac/Dynamics-Helper/blob/master/USER_GUIDE.md',
      },
      {
        type: 'link',
        label: 'Releases',
        url: 'https://github.com/boatmac/Dynamics-Helper/releases',
      },
      {
        type: 'link',
        label: 'Report a Bug',
        url: 'https://github.com/boatmac/Dynamics-Helper/issues/new',
      },
    ],
  },
  {
    type: 'markdown',
    label: 'About Dynamics Helper',
    content: '# Dynamics Helper\nPublic product resources and support links.',
  },
];

const ALLOWED_KEYS = {
  folder: ['children', 'label', 'type'],
  link: ['label', 'type', 'url'],
  markdown: ['content', 'label', 'type'],
};

function readSource() {
  return readFileSync(sourcePath, 'utf8');
}

function loadItems() {
  return JSON.parse(readSource());
}

function flatten(items) {
  return items.flatMap((item) => [item, ...(item.children ? flatten(item.children) : [])]);
}

function canonicalSource(items) {
  return `${JSON.stringify(items, null, 2)}\n`;
}

test('tracked defaults contain only the reviewed public product resources', () => {
  const items = loadItems();
  assert.deepEqual(items, EXPECTED_ITEMS);
  assert.equal(readSource(), canonicalSource(EXPECTED_ITEMS));
});

test('tracked defaults use the minimal five-node menu schema', () => {
  const items = loadItems();
  const nodes = flatten(items);

  assert.equal(items.length, 2);
  assert.equal(nodes.length, 5);
  for (const node of nodes) {
    assert.ok(Object.hasOwn(ALLOWED_KEYS, node.type), `unsupported type: ${node.type}`);
    assert.deepEqual(Object.keys(node).sort(), ALLOWED_KEYS[node.type]);
  }
});

test('tracked default links stay inside the public product repository', () => {
  const links = flatten(loadItems()).filter((item) => item.type === 'link');

  assert.equal(links.length, 3);
  for (const link of links) {
    const url = new URL(link.url);
    assert.equal(url.protocol, 'https:');
    assert.equal(url.hostname, 'github.com');
    assert.equal(url.username, '');
    assert.equal(url.password, '');
    assert.equal(url.port, '');
    assert.ok(url.pathname.startsWith('/boatmac/Dynamics-Helper/'));
    assert.equal(url.search, '');
    assert.equal(url.hash, '');
  }
});

test('tracked defaults contain no credential or internal-service markers', () => {
  const credentialKey = /^(?:accesstoken|apikey|authorization|bearer|clientsecret|credential|password|privatekey|secret|sig|token)$/;
  const forbiddenValues = [
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/i,
    /\bgh[opurs]_[A-Za-z0-9_]{20,}\b/,
    /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
    /[?&](?:se|sig|sp|spr|sv)=/i,
    /\b(?:localhost|[A-Za-z0-9.-]+\.(?:corp|internal|local))\b/i,
    /\b(?:10\.\d{1,3}|127\.\d{1,3}|169\.254|172\.(?:1[6-9]|2\d|3[01])|192\.168)\.\d{1,3}\.\d{1,3}\b/,
    /\b(?:blob\.core\.windows\.net|crm\.dynamics\.com|microsoft\.com|sharepoint\.com)\b/i,
    /\b(?:Microsoft|OneSupport|SharePoint|Azure)\b/i,
    /\b(?:access[_-]?token|api[_-]?key|authorization|bearer|client[_-]?secret|credential|password|private[_-]?key|secret|sig|token)\s*[:=]/i,
    /\bauthorization\s*:\s*bearer\b/i,
  ];

  function violations(value, path = '$') {
    if (Array.isArray(value)) {
      return value.flatMap((entry, index) => violations(entry, `${path}[${index}]`));
    }
    if (value && typeof value === 'object') {
      return Object.entries(value).flatMap(([key, entry]) => {
        const normalizedKey = key.replace(/[^a-z0-9]/gi, '').toLowerCase();
        const keyFailures = credentialKey.test(normalizedKey) ? [`${path}.${key}`] : [];
        return [...keyFailures, ...violations(entry, `${path}.${key}`)];
      });
    }
    if (typeof value === 'string') {
      let unsafe = forbiddenValues.some((pattern) => pattern.test(value));
      if (/^https?:\/\//i.test(value)) {
        const url = new URL(value);
        unsafe ||= Boolean(url.username || url.password || url.port);
      }
      return unsafe ? [path] : [];
    }
    return [];
  }

  assert.deepEqual(violations(loadItems()), []);

  const unsafe = [
    { access_token: 'value' },
    { api_key: 'value' },
    { Authorization: 'value' },
    { bearer: 'value' },
    { clientSecret: 'value' },
    { credential: 'value' },
    { password: 'value' },
    { private_key: 'value' },
    { secret: 'value' },
    { sig: 'value' },
    { token: 'value' },
    { url: 'https://example.com/?sig=value' },
    { url: 'https://example.com/?se=value' },
    { url: 'https://example.com/?sp=value' },
    { url: 'https://example.com/?spr=value' },
    { url: 'https://example.com/?sv=value' },
    { url: 'https://user:password@github.com/boatmac/Dynamics-Helper/releases' },
    { url: 'https://github.com:8443/boatmac/Dynamics-Helper/releases' },
    { url: 'https://tenant.sharepoint.com/path' },
    { url: 'https://account.blob.core.windows.net/container' },
    { url: 'https://tenant.crm.dynamics.com/path' },
    { url: 'https://localhost/path' },
    { url: 'https://service.corp/path' },
    { url: 'https://service.internal/path' },
    { url: 'https://service.local/path' },
    { url: 'https://10.2.3.4/path' },
    { url: 'https://127.0.0.1/path' },
    { url: 'https://169.254.1.2/path' },
    { url: 'https://172.16.1.2/path' },
    { url: 'https://192.168.1.2/path' },
    { content: '-----BEGIN PRIVATE KEY-----' },
    { content: 'access_token=value' },
    { content: 'api-key=value' },
    { content: 'authorization=value' },
    { content: 'authorization: Bearer value' },
    { content: 'bearer=value' },
    { content: 'credential=value' },
    { content: 'password=value' },
    { content: 'client_secret=value' },
    { content: 'private_key=value' },
    { content: 'secret=value' },
    { content: 'sig=value' },
    { content: 'token=value' },
    { content: 'gho_12345678901234567890' },
    { content: 'ghu_12345678901234567890' },
    { content: 'ghs_12345678901234567890' },
    { content: 'ghr_12345678901234567890' },
    { content: 'ghp_12345678901234567890' },
    { content: 'github_pat_12345678901234567890' },
    { content: 'Microsoft internal resource' },
    { content: 'OneSupport internal resource' },
    { content: 'SharePoint internal resource' },
    { content: 'Azure internal resource' },
    { url: 'https://microsoft.com/path' },
  ];
  for (const probe of unsafe) {
    assert.notDeepEqual(violations(probe), []);
  }

  const safe = [
    { content: 'Release token budgeting guidance' },
    { content: 'Secret-free public support links' },
    { content: 'Version 10.2.3 release notes' },
  ];
  for (const probe of safe) {
    assert.deepEqual(violations(probe), []);
  }
});

test('canonical source rejects hidden duplicate-key bytes', () => {
  const duplicateKeySource = '[{"type":"link","type":"markdown"}]\n';
  assert.notEqual(duplicateKeySource, canonicalSource(JSON.parse(duplicateKeySource)));
});
