export async function onRequest(context) {
  const url = new URL(context.request.url);
  const symbol = url.searchParams.get('symbol');

  if (!symbol) {
    return new Response(JSON.stringify({ error: 'No symbol provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // M2: only allow real ticker characters. Without this, the symbol is
  // interpolated straight into the Yahoo URL path, letting a caller reshape
  // the request (extra path segments, query injection) and use this Function
  // as an open proxy. Tickers are short and use [A-Z0-9.-] (e.g. BRK.B, RDS-A).
  if (!/^[A-Za-z0-9.\-]{1,12}$/.test(symbol)) {
    return new Response(JSON.stringify({ error: 'Invalid symbol' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const res = await fetch(yahooUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
      }
    });

    if (!res.ok) throw new Error(`Yahoo returned ${res.status}`);

    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;

    return new Response(JSON.stringify({
      symbol,
      price:             meta?.regularMarketPrice || null,
      change:            meta?.regularMarketChange || null,
      change_pct:        meta?.regularMarketChangePercent || null,
      previous_close:    meta?.previousClose || null,
      market_state:      meta?.marketState || null,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store'
      }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
