// ── Headers ─────────────────────────────────────
const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  Accept: '*/*',
};

// ── HTTP ───────────────────────────────────────
async function httpGet(url, extraHeaders = {}) {
  const res = await fetch(url, {
    headers: { ...DEFAULT_HEADERS, ...extraHeaders },
  });

  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.text();
}

// ── Stream Detection ───────────────────────────
function extractStreams(html) {
  const results = new Set();

  const patterns = [
    /(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/gi,
    /(https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*)/gi,
    /file\s*:\s*["']([^"']+)["']/gi,
    /source\s*src\s*=\s*["']([^"']+)["']/gi,
    /data-url\s*=\s*["']([^"']+)["']/gi,
    /data-hls\s*=\s*["']([^"']+)["']/gi,
  ];

  for (const re of patterns) {
    let m;
    while ((m = re.exec(html))) {
      results.add(m[1]);
    }
  }

  return [...results];
}

// ── JWPlayer ───────────────────────────────────
function extractJW(html) {
  const results = [];

  const re = /sources\s*:\s*\[(.*?)\]/gs;
  const block = html.match(re);

  if (!block) return results;

  const urlRe = /file\s*:\s*["']([^"']+)["']/g;
  let m;

  while ((m = urlRe.exec(block[1]))) {
    results.push(m[1]);
  }

  return results;
}

// ── Iframes ────────────────────────────────────
function extractIframes(html) {
  const frames = [];
  const re = /<iframe[^>]+src=["']([^"']+)["']/gi;

  let m;
  while ((m = re.exec(html))) {
    let src = m[1];

    if (src.startsWith("//")) src = "https:" + src;

    if (src.startsWith("http")) frames.push(src);
  }

  return frames;
}

// ── Quality ────────────────────────────────────
function qualityFromUrl(url) {
  if (/2160|4k/i.test(url)) return "4K";
  if (/1080/i.test(url)) return "1080p";
  if (/720/i.test(url)) return "720p";
  if (/480/i.test(url)) return "480p";
  return "HD";
}

// ── Stream Builder ─────────────────────────────
function makeStream(source, url, referer) {
  return {
    name: source,
    title: qualityFromUrl(url),
    quality: qualityFromUrl(url),
    url,
    headers: {
      Referer: referer,
      "User-Agent": DEFAULT_HEADERS["User-Agent"],
    },
  };
}

// ── Extract from page ──────────────────────────
async function fetchStreamsFromPage(name, url, base) {
  try {
    const html = await httpGet(url, { Referer: base });

    const streams = [];

    for (const u of extractStreams(html))
      streams.push(makeStream(name, u, url));

    for (const u of extractJW(html))
      streams.push(makeStream(name, u, url));

    if (streams.length) return streams;

    const iframes = extractIframes(html).slice(0, 4);

    const iframeStreams = await Promise.all(
      iframes.map(async (frame) => {
        try {
          const ih = await httpGet(frame, { Referer: url });
          return extractStreams(ih).map((u) =>
            makeStream(name, u, frame)
          );
        } catch {
          return [];
        }
      })
    );

    return iframeStreams.flat();
  } catch {
    return [];
  }
}

// ── Search ─────────────────────────────────────
async function searchSite(name, base, query) {
  const urls = [
    `${base}/?s=${encodeURIComponent(query)}`,
    `${base}/search/${encodeURIComponent(query)}`,
    `${base}/?story=${encodeURIComponent(query)}`,
  ];

  for (const url of urls) {
    try {
      const html = await httpGet(url, { Referer: base });

      const results = [];

      const re = /<a[^>]+href=["'](https?:\/\/[^"']+)["'][^>]*>(.*?)<\/a>/gi;
      let m;

      while ((m = re.exec(html))) {
        const title = m[2].replace(/<[^>]+>/g, "").trim();

        if (title.length > 2)
          results.push({
            name,
            base,
            title,
            url: m[1],
          });
      }

      if (results.length) return results;
    } catch {}
  }

  return [];
}

// ── Sources ────────────────────────────────────
const SOURCES = [
  { id: "cimawbas", base: "https://cimawbas.org" },
  { id: "egybest", base: "https://egybest.la" },
  { id: "mycima", base: "https://mycima.horse" },
  { id: "flowind", base: "https://flowind.net" },
  { id: "aksv", base: "https://ak.sv" },
  { id: "fajer", base: "https://fajer.show" },
  { id: "animezid", base: "https://eg.animezid.cc" },
  { id: "arabic-toons", base: "https://arabic-toons.com" },
];

// ── Main ───────────────────────────────────────
async function getStreams(tmdbId, mediaType, season, episode, title) {
  console.log("NUVIO SEARCH:", title);

  let query = title;

  if (mediaType === "tv")
    query = `${title} season ${season || 1}`;

  const promises = SOURCES.map(async (source) => {
    const results = await searchSite(source.id, source.base, query);

    if (!results.length) return [];

    const match = results[0];

    return fetchStreamsFromPage(
      source.id,
      match.url,
      source.base
    );
  });

  const results = await Promise.all(promises);

  const all = results.flat();

  const seen = new Set();

  return all.filter((s) => {
    if (seen.has(s.url)) return false;
    seen.add(s.url);
    return true;
  });
}

module.exports = { getStreams };
