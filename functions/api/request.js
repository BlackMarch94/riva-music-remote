/**
 * Cloudflare Pages Function: /api/request
 * Stores incoming song requests and relays to the TV channel server
 */

// In-Memory Cloudflare Worker Queue Cache
let queueCache = [];

export async function onRequestPost({ request }) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const payload = await request.json();
    if (!payload || !payload.song) {
      return new Response(JSON.stringify({ error: 'Missing song payload' }), { status: 400, headers: corsHeaders });
    }

    const song = {
      ...payload.song,
      timestamp: Date.now()
    };

    queueCache.unshift(song);
    if (queueCache.length > 50) queueCache = queueCache.slice(0, 50);

    // Relay to TV Server if reachable
    try {
      fetch('https://tv.maryhary.online/api/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song })
      }).catch(() => {});
    } catch (e) {}

    return new Response(JSON.stringify({ success: true, song, queueLength: queueCache.length }), { headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
}

export async function onRequestGet() {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  return new Response(JSON.stringify({ queue: queueCache }), { headers: corsHeaders });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
