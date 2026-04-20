// src/worker.mjs
let wasmInstance = null;

async function initWasm() {
  if (wasmInstance) return wasmInstance;

  // Resolve the wasm file relative to this module so it is published as an asset
  const url = new URL('./hash.wasm', import.meta.url).toString();
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch wasm: ${res.status}`);
  const bytes = await res.arrayBuffer();

  // Provide imports if your wasm needs them; otherwise use {}
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
    // Example: call an exported function named "hash" if present
    // const result = instance.exports.hash(...);
    return new Response('glitchauth worker running', { status: 200 });
  } catch (err) {
    return new Response('WASM init error: ' + String(err), { status: 500 });
  }
}
