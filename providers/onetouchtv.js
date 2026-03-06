const fetch = require("node-fetch");

const PROVIDER_NAME = "Movix";
const BASE = "https://movix.blog";
const TMDB_KEY = "8d6d91784c04f98f6e241852615c441b";

async function safeFetch(url, options = {}) {
    try {
        const res = await fetch(url, options);
        if (!res.ok) return null;
        return await res.text();
    } catch (e) {
        return null;
    }
}

async function getTitle(tmdbId, mediaType) {
    try {

        const type = mediaType === "tv" ? "tv" : "movie";

        const res = await fetch(
            `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_KEY}&language=en-US`
        );

        const json = await res.json();

        return json.title || json.name || null;

    } catch (e) {

        return null;

    }
}

function extractStreams(html, referer) {

    const streams = [];

    const regex = /(https?:\/\/[^"' ]+\.(m3u8|mp4)[^"' ]*)/gi;

    let match;

    while ((match = regex.exec(html)) !== null) {

        streams.push({
            name: PROVIDER_NAME,
            title: "Movix Stream",
            url: match[1],
            quality: "HD",
            headers: {
                Referer: referer,
                "User-Agent": "Mozilla/5.0"
            }
        });

    }

    return streams;
}

async function scrapeMovix(title) {

    const results = [];

    const searchHTML = await safeFetch(
        `${BASE}/search?q=${encodeURIComponent(title)}`,
        {
            headers: { "User-Agent": "Mozilla/5.0" }
        }
    );

    if (!searchHTML) return results;

    const match =
        searchHTML.match(/href="\/movie\/([^"]+)"/i) ||
        searchHTML.match(/href="\/watch\/([^"]+)"/i);

    if (!match) return results;

    const pageUrl = `${BASE}/movie/${match[1]}`;

    const pageHTML = await safeFetch(pageUrl, {
        headers: {
            "User-Agent": "Mozilla/5.0",
            "Referer": BASE
        }
    });

    if (!pageHTML) return results;

    const iframeRegex = /<iframe[^>]+src="([^"]+)"/gi;

    let iframe;

    while ((iframe = iframeRegex.exec(pageHTML)) !== null) {

        const iframeUrl = iframe[1];

        const playerHTML = await safeFetch(iframeUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Referer": pageUrl
            }
        });

        if (!playerHTML) continue;

        const streams = extractStreams(playerHTML, iframeUrl);

        results.push(...streams);

    }

    return results;
}

async function getStreams(tmdbId, mediaType, season, episode) {

    try {

        const title = await getTitle(tmdbId, mediaType);

        if (!title) return [];

        const streams = await scrapeMovix(title);

        return streams;

    } catch (e) {

        return [];

    }
}

module.exports = {
    name: PROVIDER_NAME,
    supports: ["movie", "tv"],
    getStreams
};
