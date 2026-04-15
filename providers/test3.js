const TMDB_API_KEY = "20bf0a5cbc307e7889137457fa5b6b37";
const XPRIME_BACKEND = "https://backend.xprime.tv";

const DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "*/*",
  "Referer": "https://xprime.stream/",
  "Origin": "https://xprime.stream",
  "Connection": "keep-alive"
};

/**
 * Enhanced request helper to handle the fetch
 */
async function makeRequest(url, options = {}) {
  const headers = Object.assign({}, DEFAULT_HEADERS, options.headers || {});
  try {
    const response = await fetch(url, {
      method: options.method || "GET",
      headers
    });
    if (!response.ok) return null;
    return response;
  } catch (err) {
    console.error("[xprime] Request failed:", err.message);
    return null;
  }
}

/**
 * Gets metadata from TMDB
 */
async function getTmdbInfo(tmdbId, mediaType) {
  const type = mediaType === "tv" ? "tv" : "movie";
  const url = `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_API_KEY}`;
  
  const res = await makeRequest(url);
  if (!res) return { title: "", year: "" };
  
  const data = await res.json();
  return {
    title: mediaType === "tv" ? data.name : data.title,
    year: (mediaType === "tv" ? data.first_air_date : data.release_date || "").substring(0, 4)
  };
}

/**
 * The main function modified for ExoPlayer compatibility
 */
async function getStreams(tmdbId, mediaType = "movie", seasonNum = 1, episodeNum = 1) {
  try {
    const tmdbInfo = await getTmdbInfo(tmdbId, mediaType);
    const title = tmdbInfo ? tmdbInfo.title : "";
    
    // Construct Backend URL
    const query = new URLSearchParams({
        id: tmdbId,
        type: mediaType,
        name: title
    });
    if (mediaType === "tv") {
        query.append("season", seasonNum);
        query.append("episode", episodeNum);
    }

    const url = `${XPRIME_BACKEND}/primebox?${query.toString()}`;
    const res = await makeRequest(url);
    if (!res) return [];

    const backendData = await res.json();
    const streams = [];

    // Parse sources from backend response
    const sources = Array.isArray(backendData) ? backendData : (backendData.streams || (backendData.url ? [backendData] : []));

    sources.forEach(src => {
      if (src.url) {
        streams.push({
          name: `XPrime - ${src.quality || "Auto"}`,
          url: src.url,
          // CRITICAL: ExoPlayer needs these headers passed along with the URL
          headers: DEFAULT_HEADERS, 
          quality: src.quality || "Auto",
          provider: "xprime",
          // Format subtitles specifically for Nuvio/ExoPlayer
          subtitles: (src.subtitles || src.tracks || []).map(sub => ({
            url: sub.file || sub.url || sub.src || "",
            lang: sub.label || sub.language || "English",
            format: "vtt" // Most common for these sources
          })).filter(s => s.url)
        });
      }
    });

    return streams;
  } catch (err) {
    console.error("[xprime] Error:", err.message);
    return [];
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
}
