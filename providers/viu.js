const NAME = "viu";

async function extractM3U8(url, referer) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Referer: referer
      }
    });

    const html = await res.text();

    const match =
      html.match(/file:\s*"(https:[^"]+\.m3u8[^"]*)"/) ||
      html.match(/"(https:[^"]+\.m3u8[^"]*)"/);

    if (match) return match[1];

    return null;
  } catch {
    return null;
  }
}

async function getStreams(tmdbId, type, season, episode) {
  console.log("[viu] getStreams:", tmdbId, type, season, episode);

  const s = season || 1;
  const e = episode || 1;

  const embeds = [
    {
      url:
        type === "movie"
          ? `https://vidsrc.xyz/embed/movie/${tmdbId}`
          : `https://vidsrc.xyz/embed/tv/${tmdbId}/${s}/${e}`,
      referer: "https://vidsrc.xyz/"
    },
    {
      url:
        type === "movie"
          ? `https://vidsrc.to/embed/movie/${tmdbId}`
          : `https://vidsrc.to/embed/tv/${tmdbId}/${s}/${e}`,
      referer:
