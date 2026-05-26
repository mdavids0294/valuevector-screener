export async function onRequest(context) {
  const url = new URL(context.request.url);
  const symbol = url.searchParams.get('symbol');

  if (!symbol) {
    return new Response(JSON.stringify({ error: 'No symbol provided' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
    const res = await fetch(yahooUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
      }
    });

    if (!res.ok) throw new Error(`Yahoo returned ${res.status}`);

    const data = await res.json();
    const quote = data?.chart?.result?.[0]?.meta;

    return new Response(JSON.stringify({
      symbol,
      price: quote?.regularMarketPrice || null,
      market_cap: quote?.regularMarketCap || null,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
