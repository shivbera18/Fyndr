// G5 route harness: stubs SW globals, loads public/sw.js, asserts reel-audio
// routing. Zero deps. Run from front-end/: `node scripts/sw-route-check.mjs`.
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://fyndr.test';

// ---- Stubs ---------------------------------------------------------------
const listeners = {};
const selfStub = {
  location: { origin: ORIGIN },
  clients: { claim: async () => undefined },
  addEventListener: (type, fn) => {
    (listeners[type] ??= []).push(fn);
  },
};

function makeCache() {
  const store = new Map();
  const key = (r) => (typeof r === 'string' ? new URL(r, ORIGIN).href : new URL(r.url, ORIGIN).href);
  return {
    store,
    match: async (r) => (store.get(key(r)) ?? null)?.clone() ?? null,
    put: async (r, res) => {
      store.set(key(r), res);
    },
    add: async (u) => {
      const res = await fetchStub(u);
      if (!res || !res.ok) throw new Error(`add failed: ${u}`);
      store.set(key(u), res);
    },
    delete: async (r) => store.delete(key(r)),
    keys: async () => [...store.keys()].map((u) => new Request(u)),
  };
}

const named = new Map();
const cachesStub = {
  open: async (n) => {
    if (!named.has(n)) named.set(n, makeCache());
    return named.get(n);
  },
  keys: async () => [...named.keys()],
  delete: async (n) => named.delete(n),
  match: async (r) => {
    for (const c of named.values()) {
      const hit = await c.match(r);
      if (hit) return hit;
    }
    return null;
  },
};

// Programmable network: url -> { status, body, type } or 'throw'.
let routes = {};
let fetchCalls = [];
async function fetchStub(input, init) {
  const raw = typeof input === 'string' ? input : input.url;
  const url = new URL(raw, ORIGIN).href;
  const req = new Request(url, init);
  fetchCalls.push({ url, range: req.headers.get('range') });
  const r = routes[new URL(url).pathname] ?? routes[url];
  if (r === 'throw' || !r) throw new TypeError('offline');
  return new Response(r.body, { status: r.status, headers: { 'Content-Type': r.type ?? 'application/octet-stream' } });
}

function fireFetch(url, { range, destination } = {}) {
  const headers = range ? { range } : {};
  const req = new Request(new URL(url, ORIGIN).href, { headers });
  Object.defineProperty(req, 'destination', { value: destination ?? '' });
  let resolveRes;
  const evt = { request: req, respondWith: (p) => (resolveRes = p) };
  for (const fn of listeners.fetch ?? []) fn(evt);
  assert.ok(resolveRes, `no respondWith for ${url} (route not intercepted)`);
  return resolveRes;
}

function fireFetchPassive(url, opts) {
  // Like fireFetch but tolerates no-intercept (returns null).
  const headers = opts?.range ? { range: opts.range } : {};
  const req = new Request(new URL(url, ORIGIN).href, { headers });
  Object.defineProperty(req, 'destination', { value: opts?.destination ?? '' });
  let resolveRes = null;
  const evt = { request: req, respondWith: (p) => (resolveRes = p) };
  for (const fn of listeners.fetch ?? []) fn(evt);
  return resolveRes;
}

// ---- Load sw.js ----------------------------------------------------------
const code = readFileSync(join(root, 'public', 'sw.js'), 'utf8');
const run = new Function('self', 'caches', 'fetch', 'console', code);
run(selfStub, cachesStub, fetchStub, console);

// ---- Install: manifest precached -----------------------------------------
routes = { '/reel-music/manifest.json': { status: 200, body: '{"tracks":[]}', type: 'application/json' } };
{
  let resolveDone;
  const evt = { waitUntil: (p) => (resolveDone = p) };
  for (const fn of listeners.install ?? []) fn(evt);
  await resolveDone;
  const audio = await cachesStub.open('fyndr-audio-v1');
  assert.ok(await audio.match('https://fyndr.test/reel-music/manifest.json'), 'manifest precached at install');
}

// ---- Activate: keeps audio, purges stale ----------------------------------
named.set('fyndr-audio-v0', makeCache());
{
  let resolveDone;
  const evt = { waitUntil: (p) => (resolveDone = p) };
  for (const fn of listeners.activate ?? []) fn(evt);
  await resolveDone;
  assert.ok(!(await cachesStub.keys()).includes('fyndr-audio-v0'), 'stale audio cache purged');
  assert.ok((await cachesStub.keys()).includes('fyndr-audio-v1'), 'current audio cache kept');
}

// ---- Manifest SWR ---------------------------------------------------------
routes = { '/reel-music/manifest.json': { status: 200, body: '{"tracks":[{"id":"a"}]}', type: 'application/json' } };
{
  const res = await fireFetch('/reel-music/manifest.json');
  assert.equal(await res.text(), '{"tracks":[]}', 'stale manifest served while revalidating');
  await new Promise((r) => setTimeout(r, 10));
  const audio = await cachesStub.open('fyndr-audio-v1');
  assert.equal(await (await audio.match('https://fyndr.test/reel-music/manifest.json')).text(), '{"tracks":[{"id":"a"}]}', 'revalidate stored fresh manifest');
}

// ---- mp3 cache-first -------------------------------------------------------
routes = { '/reel-music/a.mp3': { status: 200, body: 'A'.repeat(1000) } };
{
  fetchCalls = [];
  const miss = await fireFetch('/reel-music/a.mp3', { destination: 'audio' });
  assert.equal(miss.status, 200, 'miss serves network');
  assert.equal(fetchCalls.length, 1, 'miss hits network once');
  const hit = await fireFetch('/reel-music/a.mp3', { destination: 'audio' });
  assert.equal(await hit.text(), 'A'.repeat(1000), 'hit serves cached bytes');
  assert.equal(fetchCalls.length, 1, 'hit skips network');
}

// ---- Range served as 206 from cache ----------------------------------------
{
  const res = await fireFetch('/reel-music/a.mp3', { destination: 'audio', range: 'bytes=0-99' });
  assert.equal(res.status, 206, 'range hit is 206');
  assert.equal(res.headers.get('Content-Range'), 'bytes 0-99/1000', 'content-range correct');
  assert.equal((await res.text()).length, 100, 'slice length correct');
}

// ---- Range miss: full fetch stored, 206 served ------------------------------
routes = { '/reel-music/b.mp3': { status: 200, body: 'B'.repeat(500) } };
{
  fetchCalls = [];
  const res = await fireFetch('/reel-music/b.mp3', { destination: 'audio', range: 'bytes=0-' });
  assert.equal(res.status, 206, 'range miss serves 206');
  assert.equal(res.headers.get('Content-Range'), 'bytes 0-499/500', 'open range spans remainder');
  assert.equal(fetchCalls.length, 1, 'one network call');
  assert.equal(fetchCalls[0].range, null, 'refetch drops Range so the stored entry is full');
  const audio = await cachesStub.open('fyndr-audio-v1');
  const stored = await audio.match('https://fyndr.test/reel-music/b.mp3');
  assert.equal(stored.status, 200, 'stored entry is the full 200');
}

// ---- 206 responses are never stored ------------------------------------------
routes = { '/reel-music/c.mp3': { status: 206, body: 'partial' } };
{
  const res = await fireFetch('/reel-music/c.mp3');
  assert.equal(res.status, 206, 'passthrough serves 206 as-is');
  const audio = await cachesStub.open('fyndr-audio-v1');
  assert.equal(await audio.match('https://fyndr.test/reel-music/c.mp3'), null, '206 never stored');
}

// ---- Suffix range passes through ----------------------------------------------
{
  fetchCalls = [];
  routes = { '/reel-music/a.mp3': { status: 200, body: 'A'.repeat(1000) } };
  const res = await fireFetch('/reel-music/a.mp3', { range: 'bytes=-100' });
  assert.equal(res.status, 200, 'suffix range falls back to full response');
}

// ---- Trim keeps manifest past 20 mp3s ------------------------------------------
{
  routes = {};
  for (let i = 0; i < 25; i++) routes[`/reel-music/t${i}.mp3`] = { status: 200, body: `t${i}` };
  for (let i = 0; i < 25; i++) await fireFetch(`/reel-music/t${i}.mp3`);
  await new Promise((r) => setTimeout(r, 10));
  const audio = await cachesStub.open('fyndr-audio-v1');
  assert.ok(await audio.match('https://fyndr.test/reel-music/manifest.json'), 'manifest survives trim');
  assert.ok(audio.store.size <= 21, `audio cache bounded (got ${audio.store.size})`);
}

// ---- /api/ untouched, images unchanged -------------------------------------------
{
  assert.equal(fireFetchPassive('/api/photos'), null, '/api/ not intercepted');
  routes = { '/uploads/x.jpg': { status: 200, body: 'img' } };
  const res = await fireFetch('/uploads/x.jpg');
  assert.equal(await res.text(), 'img', 'image route intact');
}

console.log('sw-route-check: all assertions passed');
