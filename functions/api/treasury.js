// Server-side proxy for the FMP treasury-rates endpoint.
// Keeps FMP_API_KEY out of the browser — the key is read from the Cloudflare
// Pages environment (Settings → Environment variables, stored as a Secret).
// The client calls /api/treasury with no key; this function adds it server-side.
export async function onRequest(context) {
  const key = context.env.FMP_API_KEY;
  if (!key) {
    // Misconfiguration guard: env var missing / not deployed yet.
    return new Response(JSON.stringify({ error: 'Treasury proxy not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - 7); // look back a week so weekends/holidays don't yield null
    const toStr = today.toISOString().slice(0, 10);
    const fromStr = from.toISOString().slice(0, 10);
    const fmpUrl = `https://financialmodelingprep.com/stable/treasury-rates?from=${fromStr}&to=${toStr}&apikey=${key}`;
    const res = await fetch(fmpUrl, { headers: { 'Accept': 'application/json' } });

    if (!res.ok) throw new Error(`FMP returned ${res.status}`);

    const data = await res.json();
    // Sort newest-first by date, then pick the most recent row that has year10.
    // (Sorting explicitly means we don't depend on FMP's return order.)
    const row = Array.isArray(data)
      ? data
          .filter(r => r && r.year10 != null && r.date)
          .sort((a, b) => (a.date < b.date ? 1 : -1))[0] || null
      : null;

    // Return only the field the client needs — not the raw FMP payload.
    return new Response(JSON.stringify({
      date: row?.date || toStr,
      year10: row?.year10 ?? null
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        // Treasury rates update once per day — let the edge cache it for an hour
        // so we don't hit FMP on every page load.
        'Cache-Control': 'public, max-age=3600'
      }
    });

  } catch (e) {
    // Never echo the upstream URL (it carries the key) — just a generic message.
    return new Response(JSON.stringify({ error: 'Failed to fetch treasury rate' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
