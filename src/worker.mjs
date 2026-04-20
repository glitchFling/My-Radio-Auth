// src/worker.mjs
let wasmInstance = null;

async function tryFetch(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`fetch(${url}) returned ${res.status}`);
      return null;
    }
    const bytes = await res.arrayBuffer();
    return bytes;
  } catch (err) {
    console.warn(`fetch(${url}) failed:`, err && err.message ? err.message : err);
    return null;
  }
}

async function initWasm() {
  if (wasmInstance) return wasmInstance;

  // Candidate URL builders (order matters)
  const candidates = [];

  // 1) Preferred: relative to this module (works when import.meta.url is valid)
  try {
    candidates.push(() => new URL('./hash.wasm', import.meta.url).toString());
  } catch (err) {
    // import.meta.url may be undefined or invalid in some dev contexts
    console.warn('import.meta.url not usable:', err && err.message ? err.message : err);
  }

  // 2) Try relative to parent directory (if your worker is in src/)
  try {
    candidates.push(() => new URL('../src/hash.wasm', import.meta.url).toString());
  } catch (err) {
    // ignore
  }

  // 3) Common published asset locations
  candidates.push(() => '/src/hash.wasm');
  candidates.push(() => '/hash.wasm');

  // 4) Last resort: try raw filename (may work in some dev setups)
  candidates.push(() => 'hash.wasm');

  // Try each candidate until one fetches successfully
  let bytes = null;
  let lastUrlTried = null;
  for (const build of candidates) {
    let url;
    try {
      url = build();
    } catch (err) {
      console.warn('URL builder threw:', err && err.message ? err.message : err);
      continue;
    }
    lastUrlTried = url;
    console.log('Attempting to fetch wasm from:', url);
    bytes = await tryFetch(url);
    if (bytes) {
      console.log('Successfully fetched wasm from:', url);
      break;
    }
  }

  if (!bytes) {
    throw new Error(`Unable to fetch hash.wasm; last tried: ${lastUrlTried}`);
  }

  // Provide imports if your wasm needs them
  const imports = {};
  const { instance } = await WebAssembly.instantiate(bytes, imports);
  wasmInstance = instance;
  return instance;
}

addEventListener('fetch', event => {
  event.respondWith(handle(event.request));
});

async function handle(req) {
  try {
    const instance = await initWasm();
    return new Response('glitchauth worker running', { status: 200 });
  } catch (err) {
    console.error('WASM init error:', err);
    return new Response('WASM init error: ' + String(err), { status: 500 });
  }
}
