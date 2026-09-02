/**
 * Cloudflare Pages Function: /api/queue
 */

export async function onRequestGet() {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  return new Response(JSON.stringify({ status: 'ok', timestamp: Date.now() }), { headers: corsHeaders });
}
