const TMDB_API_KEY = '439c478a771f35c05022f9feabcca01c';

async function getStreams(tmdbId, type = 'movie', season = null, episode = null) {
    try {
        // Get token
        const tokenRes = await fetch("https://enc-dec.app/api/enc-xprime");
        const tokenJson = await tokenRes.json();
        const token = tokenJson.result;

        let url = "";

        if (type === "movie") {
            url = `https://backend.xprime.tv/rage?id=${tmdbId}&turnstile=${token}`;
        } else if (type === "tv") {
            url = `https://backend.xprime.tv/rage?id=${tmdbId}&season=${season}&episode=${episode}&turnstile=${token}`;
        }

        const res = await fetch(url);
        const data = await res.json();

        if (!data || !data.streams) return [];

        return data.streams.map(stream => ({
            name: "Xprime",
            title: stream.quality || "Stream",
            url: stream.url,
            headers: {
                Referer: "https://xprime.tv/",
                Origin: "https://xprime.tv",
                "User-Agent": "Mozilla/5.0"
            }
        }));
    } catch (err) {
        console.log("Xprime error", err);
        return [];
    }
}

// **Important:** this is how Nuvio detects the provider
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams, id: 'xprime', name: 'Xprime', rank: 140 };
} else {
    global.XprimeScraperModule = { getStreams, id: 'xprime', name: 'Xprime', rank: 140 };
}
