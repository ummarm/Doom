// PrimeSrc Scraper for Nuvio Local Scrapers
// Fixed: Added Referer headers and improved error handling

const TMDB_API_KEY = "20bf0a5cbc307e7889137457fa5b6b37";
const PRIMESRC_BASE = "https://primesrc.me/api/v1/";
const PRIMESRC_SITE = "https://primesrc.me/"; // Critical for Referer headers

async function makeRequest(url, options = {}) {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Referer": PRIMESRC_SITE, // Many APIs check this to prevent hotlinking
    "Origin": PRIMESRC_SITE,
    ...options.headers
  };

  try {
    const response = await fetch(url, {
      method: options.method || "GET",
      headers: headers
    });

    if (!response.ok) {
      // Log the status to help debug (403 = Blocked, 404 = Not Found)
      console.warn(`[PrimeSrc] HTTP Error: ${response.status} for ${url}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error("[PrimeSrc] Request failed: ", error.message);
    return null;
  }
}

async function getStreams(tmdbId, mediaType = "movie", seasonNum, episodeNum) {
  console.log(`[PrimeSrc] Starting fetch for TMDB: ${tmdbId} (${mediaType})`);

  // 1. Get Metadata from TMDB
  const tmdbUrl = `https://api.themoviedb.org/3/${mediaType === "tv" ? "tv" : "movie"}/${tmdbId}?api_key=${TMDB_API_KEY}`;
  const tmdbData = await makeRequest(tmdbUrl);
  
  if (!tmdbData) return [];

  const title = mediaType === "tv" ? tmdbData.name : tmdbData.title;
  const year = (mediaType === "tv" ? tmdbData.first_air_date : tmdbData.release_date || "").substring(0, 4);

  // 2. Search for available servers
  let searchUrl = `${PRIMESRC_BASE}s?tmdb=${tmdbId}&type=${mediaType}`;
  if (mediaType === "tv") {
    searchUrl += `&season=${seasonNum}&episode=${episodeNum}`;
  }

  const searchData = await makeRequest(searchUrl);

  if (!searchData || !searchData.servers || !Array.isArray(searchData.servers)) {
    console.log("[PrimeSrc] No servers found in API response");
    return [];
  }

  const label = mediaType === "tv" 
    ? `${title} S${String(seasonNum).padStart(2, "0")}E${String(episodeNum).padStart(2, "0")}`
    : `${title} (${year})`;

  // 3. Fetch direct links for each server
  const streamPromises = searchData.servers
    .filter(server => server.key)
    .map(async (server) => {
      const linkData = await makeRequest(`${PRIMESRC_BASE}l?key=${server.key}`);
      
      if (!linkData || !linkData.link) return null;

      return {
        name: `PrimeSrc - ${server.name || 'Direct'}`,
        title: label,
        url: linkData.link,
        quality: "Auto",
        headers: {
          "Referer": PRIMESRC_SITE,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        },
        provider: "primesrc"
      };
    });

  const results = await Promise.all(streamPromises);
  const finalStreams = results.filter(s => s !== null);

  console.log(`[PrimeSrc] Successfully found ${finalStreams.length} streams`);
  return finalStreams;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.PrimeSrcScraperModule = { getStreams };
}
