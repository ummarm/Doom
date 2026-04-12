// Dahmer Movies Scraper - Direct Pathing Version
// Fixes: Peaky Blinders, Crime 101, Zootopia, Goat

console.log('[DahmerMovies] Initializing Scraper');

const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const DAHMER_MOVIES_API = 'https://a.111477.xyz';
const TIMEOUT = 60000;

async function makeRequest(url) {
    return fetch(url, {
        timeout: TIMEOUT,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    }).then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res;
    });
}

function parseLinks(html) {
    const links = [];
    const linkRegex = /<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*)<\/a>/gi;
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
        const href = match[1];
        const text = match[2].trim();
        if (!text || href === '../' || href.includes('?C=') || text.toLowerCase().includes('parent directory')) continue;
        links.push({ text, href });
    }
    return links;
}

async function invokeDahmerMovies(title, year, season = null, episode = null) {
    const pathType = season === null ? 'movies' : 'tvs';
    const cleanTitle = title.replace(/:/g, '');
    
    // Create specific variations that this server uses
    const variations = [];
    if (season === null) {
        variations.push(`${cleanTitle} (${year})`);
        variations.push(cleanTitle); 
    } else {
        // TV Shows often use "Title" or "Title -"
        variations.push(cleanTitle);
        variations.push(`${cleanTitle} -`);
    }

    let html = '';
    let usedUrl = '';

    // Loop through folder variations
    for (const folder of variations) {
        let tryUrl = `${DAHMER_MOVIES_API}/${pathType}/${encodeURIComponent(folder)}/`;
        if (season !== null) tryUrl += `Season ${season}/`;
        
        try {
            const res = await makeRequest(tryUrl);
            html = await res.text();
            usedUrl = tryUrl;
            if (html && html.includes('<tr')) break;
        } catch (e) {
            continue;
        }
    }

    if (!html) {
        console.log(`[DahmerMovies] Failed to find directory for: ${title}`);
        return [];
    }

    const paths = parseLinks(html);
    
    // FILTERING: Movies (Show all videos), TV (Match Episode)
    let filteredPaths = paths;
    if (season !== null) {
        const s = season < 10 ? `0${season}` : `${season}`;
        const e = episode < 10 ? `0${episode}` : `${episode}`;
        const epPattern = new RegExp(`(S${s}E${e}|${season}x${e}|[\\s\\.\\-]${e}[\\s\\.\\-])`, 'i');
        filteredPaths = paths.filter(p => epPattern.test(p.text) || epPattern.test(p.href));
    } else {
        // Only show actual video files
        filteredPaths = paths.filter(p => /\.(mkv|mp4|avi|webm)$/i.test(p.href));
    }

    return filteredPaths.map(path => {
        // Resolve URL using the smart constructor to avoid //movies/movies
        const resolvedUrl = new URL(path.href, usedUrl).href;
        
        // Apply your specific encoding requirements
        const finalUrl = decodeURIComponent(resolvedUrl)
            .replace(/ /g, '%20')
            .replace(/\(/g, '%28')
            .replace(/\)/g, '%29');

        const t = path.text.toLowerCase();
        let quality = 'HD';
        if (t.includes('2160') || t.includes('4k') || t.includes('uhd')) quality = '2160p';
        else if (t.includes('1080')) quality = '1080p';
        else if (t.includes('720')) quality = '720p';

        return {
            name: "DahmerMovies",
            title: `DahmerMovies ${path.text}`,
            url: finalUrl,
            quality: quality,
            provider: "dahmermovies",
            filename: path.text
        };
    });
}

async function getStreams(tmdbId, mediaType = 'movie', seasonNum = null, episodeNum = null) {
    try {
        const tmdbUrl = `https://api.themoviedb.org/3/${mediaType === 'tv' ? 'tv' : 'movie'}/${tmdbId}?api_key=${TMDB_API_KEY}`;
        const res = await makeRequest(tmdbUrl);
        const data = await res.json();
        
        const title = mediaType === 'tv' ? data.name : data.title;
        const year = (mediaType === 'tv' ? data.first_air_date : data.release_date)?.substring(0, 4);
        
        return await invokeDahmerMovies(title, year ? parseInt(year) : null, seasonNum, episodeNum);
    } catch (e) {
        return [];
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
