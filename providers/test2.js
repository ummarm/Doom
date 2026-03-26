/**
 * CineHD Provider (cinehd.cc)
 * ─────────────────────────────────────────────────────────────────
 * CineHD is a free HD movie/TV streaming site. It accepts TMDB IDs
 * directly in its embed and API endpoints:
 *
 *   Movie embed:  /embed/movie/<tmdbId>
 *   TV embed:     /embed/tv/<tmdbId>/<season>/<episode>
 *
 * This provider fetches the embed page, extracts the stream source
 * list from the JSON payload embedded in the HTML, and returns
 * playable URLs to the Nuvio app.
 * ─────────────────────────────────────────────────────────────────
 */

var BASE = 'https://cinehd.cc';

function buildHeaders(referer) {
  return {
    'Referer': referer || BASE + '/',
    'Origin': BASE,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/json,*/*',
    'Accept-Language': 'en-US,en;q=0.9'
  };
}

/**
 * Build the embed URL for a given title.
 */
function buildEmbedUrl(tmdbId, mediaType, season, episode) {
  if (mediaType === 'tv') {
    return BASE + '/embed/tv/' + tmdbId + '/' + season + '/' + episode;
  }
  return BASE + '/embed/movie/' + tmdbId;
}

/**
 * Try CineHD's JSON API endpoint first (faster than HTML scraping).
 */
function fetchFromApi(tmdbId, mediaType, season, episode) {
  var apiUrl;
  if (mediaType === 'tv') {
    apiUrl = BASE + '/api/stream/tv/' + tmdbId + '?season=' + season + '&episode=' + episode;
  } else {
    apiUrl = BASE + '/api/stream/movie/' + tmdbId;
  }

  return fetch(apiUrl, { headers: buildHeaders() })
    .then(function (res) {
      if (!res.ok) throw new Error('API HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      var streams = data.streams || data.sources || data.results || [];
      return Array.isArray(streams) ? streams : [];
    });
}

/**
 * Fallback: scrape the embed page for inline JSON stream data.
 */
function fetchFromEmbed(tmdbId, mediaType, season, episode) {
  var embedUrl = buildEmbedUrl(tmdbId, mediaType, season, episode);

  return fetch(embedUrl, { headers: buildHeaders() })
    .then(function (res) {
      if (!res.ok) throw new Error('Embed HTTP ' + res.status);
      return res.text();
    })
    .then(function (html) {
      // CineHD embeds stream data as JSON in a <script> block:
      // window.__STREAMS__ = [{...}] or similar
      var patterns = [
        /window\.__STREAMS__\s*=\s*(\[.*?\])\s*;/s,
        /window\.__DATA__\s*=\s*(\{.*?\})\s*;/s,
        /"sources"\s*:\s*(\[.*?\])/s
      ];

      for (var i = 0; i < patterns.length; i++) {
        var match = html.match(patterns[i]);
        if (match) {
          try {
            var parsed = JSON.parse(match[1]);
            // If it's a streams array directly
            if (Array.isArray(parsed)) return parsed;
            // If it's a data object with a streams key
            if (parsed.streams) return parsed.streams;
            if (parsed.sources) return parsed.sources;
          } catch (e) { /* continue */ }
        }
      }

      return [];
    });
}

function getStreams(tmdbId, mediaType, season, episode) {
  console.log('[CineHD] Fetching', mediaType, tmdbId);

  return fetchFromApi(tmdbId, mediaType, season, episode)
    .catch(function () {
      // API not available – fall back to embed scrape
      return fetchFromEmbed(tmdbId, mediaType, season, episode);
    })
    .then(function (sources) {
      return sources
        .filter(function (s) { return s && s.url; })
        .map(function (s) {
          return {
            name: 'CineHD',
            title: (s.quality || s.label || s.server || 'Stream') + ' · CineHD',
            url: s.url,
            quality: s.quality || s.label || 'Unknown',
            size: s.size || '',
            headers: buildHeaders(buildEmbedUrl(tmdbId, mediaType, season, episode))
          };
        });
    })
    .catch(function (err) {
      console.error('[CineHD] Error:', err.message);
      return [];
    });
}

module.exports = { getStreams };
