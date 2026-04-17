/* {
  "name": "ShowBox Pro",
  "author": "Nuvio User",
  "version": "1.2.0",
  "settings": [
    {
      "key": "uiToken",
      "type": "text",
      "label": "UI Token (Cookie)",
      "placeholder": "Paste your ShowBox cookie here..."
    },
    {
      "key": "ossGroup",
      "type": "text",
      "label": "OSS Group (Optional)",
      "placeholder": "e.g. 12345"
    }
  ]
} */

/**
 * ShowBox Scraper for Nuvio (Android TV Optimized)
 */

const TMDB_API_KEY = '439c478a771f35c05022f9feabcca01c';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const SHOWBOX_API_BASE = 'https://febapi.nuvioapp.space/api/media';

const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36',
    'Accept': 'application/json',
    'Content-Type': 'application/json'
};

// --- SETTINGS RETRIEVAL ---
function getSettingsValue(key) {
    try {
        const settings = (typeof global !== 'undefined' && global.SCRAPER_SETTINGS) ? global.SCRAPER_SETTINGS : 
                         (typeof window !== 'undefined' && window.SCRAPER_SETTINGS) ? window.SCRAPER_SETTINGS : {};
        return settings[key] || '';
    } catch (e) {
        return '';
    }
}

// --- NETWORK HELPER WITH TIMEOUT ---
function makeRequest(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s for TV stability

    return fetch(url, {
        method: options.method || 'GET',
        headers: { ...WORKING_HEADERS, ...options.headers },
        signal: controller.signal,
        ...options
    }).then(function(response) {
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response;
    }).catch(function(error) {
        clearTimeout(timeoutId);
        throw error;
    });
}

// --- UTILITIES ---
function formatQuality(str) {
    if (!str) return 'Unknown';
    const s = str.toUpperCase();
    if (s.includes('2160') || s.includes('4K')) return '4K';
    if (s.includes('1080')) return '1080p';
    if (s.includes('720')) return '720p';
    if (s.includes('480')) return '480p';
    return str;
}

function getTMDBDetails(tmdbId, type) {
    const endpoint = type === 'tv' ? 'tv' : 'movie';
    const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}`;
    
    return makeRequest(url)
        .then(res => res.json())
        .then(data => ({
            title: type === 'tv' ? data.name : data.title,
            year: (type === 'tv' ? data.first_air_date : data.release_date)?.split('-')[0] || ''
        }))
        .catch(() => ({ title: 'Media', year: '' }));
}

// --- CORE SCRAPER FUNCTION ---
function getStreams(tmdbId, mediaType = 'movie', seasonNum = null, episodeNum = null) {
    const cookie = getSettingsValue('uiToken');
    const ossGroup = getSettingsValue('ossGroup');

    if (!cookie) {
        console.log('[ShowBox] No UI Token found. Please enter it in Settings.');
        return Promise.resolve([]);
    }

    return getTMDBDetails(tmdbId, mediaType).then(info => {
        let apiUrl;
        if (mediaType === 'tv') {
            const ossPath = oss
