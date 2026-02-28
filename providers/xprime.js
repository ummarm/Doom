// Xprime Provider for Nuvio
// Simplified & fixed version

const WORKING_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
  Accept: "*/*",
  Referer: "https://xprime.tv/",
  Origin: "https://xprime.tv"
};

const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const TMDB_BASE = "https://api.themoviedb.org/3";

function request(url, options = {}) {
  return fetch(url, {
    method: "GET",
    headers: { ...WORKING_HEADERS, ...(options.headers || {}) }
  }).then(r => {
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r;
  });
}

async function getTMDB(tmdbId, type) {
  const endpoint = type === "tv" ? "tv" : "movie";
  const url =
    `${TMDB_BASE}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;

  const data = await request(url).then(r => r.json());

  return {
    title: type === "tv" ? data.name : data.title,
    year: (type === "tv" ? data.first_air_date : data.release_date)?.split("-")[0],
    imdb: data.external_ids?.imdb_id || null
  };
}

function qualityFromString(q) {
  if (!q) return "Unknown";

  q = q.toLowerCase();

  if (q.includes("2160") || q.includes("4k")) return "4K";
  if (q.includes("1440")) return "1440p";
  if (q.includes("1080")) return "1080p";
  if (q.includes("720")) return "720p";
  if (q.includes("480")) return "480p";
  if (q.includes("360")) return "360p";

  return "Unknown";
}

async function fetchRage(tmdbId, season, episode) {
  let url;

  if (season && episode) {
    url = `https://backend.xprime.tv/rage?id=${tmdbId}&season=${season}&episode=${episode}`;
  } else {
    url = `https://backend.xprime.tv/rage?id=${tmdbId}`;
  }

  const json = await request(url).then(r => r.json()).catch(() => null);

  if (!json || !json.qualities) return [];

  const streams = [];

  for (const q of json.qualities) {
    if (!q.url) continue;

    streams.push({
      name: `Xprime Rage - ${qualityFromString(q.quality)}`,
      url: q.url,
      quality: qualityFromString(q.quality),
      headers: WORKING_HEADERS
    });
  }

  return streams;
}

function sortStreams(streams) {
  const order = {
    "4K": 6,
    "1440p": 5,
    "1080p": 4,
    "720p": 3,
    "480p": 2,
    "360p": 1,
    Unknown: 0
  };

  return streams.sort((a, b) => (order[b.quality] || 0) - (order[a.quality] || 0));
}

async function getStreams(tmdbId, mediaType = "movie", season = null, episode = null) {
  try {
    const info = await getTMDB(tmdbId, mediaType);

    if (!info.title) return [];

    const rageStreams = await fetchRage(tmdbId, season, episode);

    const streams = sortStreams(rageStreams);

    streams.forEach(s => {
      s.provider = "xprime";
      s.title = info.title;
    });

    return streams;
  } catch (e) {
    console.log("Xprime error", e);
    return [];
  }
}

module.exports = { getStreams };
module.exports.default = { getStreams };
