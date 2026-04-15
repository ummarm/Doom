const TMDB_API_KEY = "20bf0a5cbc307e7889137457fa5b6b37";
const XPRIME_BACKEND = "https://backend.xprime.tv/primebox";

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Referer': 'https://xprime.stream/',
    'Origin': 'https://xprime.stream',
    'Accept': '*/*'
};

async function getStreams(tmdbId, mediaType = 'movie', season = 1, episode = 1) {
    try {
        // 1. Fetch metadata first (Backends often require the exact Name)
        const tmdbUrl = `https://api.themoviedb.org/3/${mediaType === 'tv' ? 'tv' : 'movie'}/${tmdbId}?api_key=${TMDB_API_KEY}`;
        const metaRes = await fetch(tmdbUrl);
        const meta = await metaRes.json();
        const title = mediaType === 'tv' ? meta.name : meta.title;

        // 2. Try to fetch from backend
        // We use a helper to try both the raw ID and the 'tt' prefixed ID if needed
        let results = await fetchFromSource(tmdbId, title, mediaType, season, episode);
        
        // Fallback: If no results, try prefixing 'tt' (some XPrime instances expect this)
        if (results.length === 0 && !tmdbId.toString().startsWith('tt')) {
            results = await fetchFromSource(`tt${tmdbId}`, title, mediaType, season, episode);
        }

        return results;
    } catch (e) {
        console.error("Scraper Error:", e);
        return [];
    }
}

async function fetchFromSource(id, name, type, s, e) {
    const params = new URLSearchParams({
        id: id,
        type: type,
        name: name
    });
    if (type === 'tv') {
        params.append('season', s);
        params.append('episode', e);
    }

    const targetUrl = `${XPRIME_BACKEND}?${params.toString()}`;
    
    try {
        const response = await fetch(targetUrl, { headers: HEADERS });
        const data = await response.json();
        
        // Handle different response structures
        const rawStreams = Array.isArray(data) ? data : (data.streams || (data.url ? [data] : []));
        
        return rawStreams.map(src => ({
            name: `XPrime ${src.quality || 'HD'}`,
            url: src.url,
            // ExoPlayer MUST have these specific headers passed to it
            headers: {
                'User-Agent': HEADERS['User-Agent'],
                'Referer': 'https://xprime.stream/',
                'Origin': 'https://xprime.stream'
            },
            subtitles: (src.subtitles || []).map(sub => ({
                url: sub.url || sub.file,
                lang: sub.label || 'English'
            }))
        }));
    } catch {
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
