/**
 * Cloudflare Pages Function: /api/search
 * Free instant YouTube music search on https://rivamusic.maryhary.online/api/search?q=...
 */

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q');

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (!q || q.trim() === '') {
    return new Response(JSON.stringify({ success: true, results: [] }), { headers: corsHeaders });
  }

  try {
    const cleanQuery = encodeURIComponent(q.trim() + ' music');
    const searchUrl = `https://www.youtube.com/results?search_query=${cleanQuery}`;

    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });

    const html = await res.text();
    const match = html.match(/var ytInitialData = ({.*?});<\/script>/s) || html.match(/ytInitialData\s*=\s*({.+?});/s);
    
    if (!match) {
      return new Response(JSON.stringify({ success: true, results: [] }), { headers: corsHeaders });
    }

    const data = JSON.parse(match[1]);
    const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];
    
    const results = [];
    for (const item of contents) {
      const v = item.videoRenderer;
      if (v && v.videoId && v.title?.runs?.[0]?.text) {
        results.push({
          id: v.videoId,
          title: v.title.runs[0].text,
          artist: v.ownerText?.runs?.[0]?.text || 'YouTube Artist',
          duration: v.lengthText?.simpleText || '03:30',
          thumb: v.thumbnail?.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`
        });
        if (results.length >= 12) break;
      }
    }

    return new Response(JSON.stringify({ success: true, results }), { headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message, results: [] }), { headers: corsHeaders });
  }
}
