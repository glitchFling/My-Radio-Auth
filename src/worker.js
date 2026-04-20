export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/id") {
      return handleIdRequest(request);
    }

    return new Response("Not found", { status: 404 });
  },
};

async function handleIdRequest(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Expected JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const { namespace, key } = payload || {};

  if (typeof namespace !== "string" || typeof key !== "string") {
    return new Response(
      JSON.stringify({ error: "namespace and key must be strings" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const id = await deterministicId(namespace, key);

  return new Response(
    JSON.stringify({ id, namespace, key }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

async function deterministicId(namespace, key) {
  const encoder = new TextEncoder();
  const input = `${namespace}::${key}`;
  const data = encoder.encode(input);

  const digest = await crypto.subtle.digest("SHA-256", data);
  const hex = bufferToHex(digest);

  // Trim or keep full; here we keep 128 bits (32 hex chars) for compactness
  const short = hex.slice(0, 32);
  return `id_${namespace}_${short}`;
}

function bufferToHex(buffer) {
  const bytes = new Uint8Array(buffer);
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, "0");
  }
  return out;
}
