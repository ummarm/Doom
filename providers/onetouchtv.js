const BASE_URL = "https://dizipal.bar";

const HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Referer": BASE_URL + "/",
    "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8"
};

function findAll(html, regex) {
    const r = new RegExp(regex, "gi");
    let m, out = [];
    while ((m = r.exec(html)) !== null) out.push(m);
    return out;
}

function findFirst(html, regex) {
    const r = new RegExp(regex, "i");
    const m = r.exec(html);
    return m ? m : null;
}

async function searchDiziPal(title, type) {

    try {

        const res = await fetch(`${BASE_URL}/?s=${encodeURIComponent(title)}`, {
            headers: HEADERS
        });

        const html = await res.text();

        const results = [];
        const matches = findAll(
            html,
            `<a[^>]+href="(https:\\/\\/dizipal\\.bar\\/(?:dizi|film|anime)\\/[^"]+)"[^>]*>([^<]+)`
        );

        matches.forEach(m => {

            const url = m[1];
            const name = m[2].trim();

            let media = url.includes("/film/") ? "movie" : "tv";

            if (type === "movie" && media !== "movie") return;
            if (type === "tv" && media !== "tv") return;

            results.push({
                title: name,
                url: url,
                type: media
            });

        });

        return results;

    } catch (e) {
        return [];
    }

}

function findBestMatch(results, query) {

    if (!results || results.length === 0) return null;

    query = query.toLowerCase();

    for (let r of results)
        if (r.title.toLowerCase() === query) return r;

    for (let r of results)
        if (r.title.toLowerCase().includes(query)) return r;

    return results[0];

}

async function loadIframe(url) {

    try {

        const res = await fetch(url, { headers: HEADERS });
        const html = await res.text();

        const iframe =
            findFirst(html, `<iframe[^>]+src="([^"]+)"`) ||
            findFirst(html, `data-src="([^"]+)"`);

        return iframe ? iframe[1] : null;

    } catch {
        return null;
    }

}

async function extractM3U8(iframe) {

    if (!iframe) return null;

    try {

        const res = await fetch(iframe, { headers: HEADERS });
        const html = await res.text();

        const m3u =
            findFirst(html, `file:"([^"]+\\.m3u8[^"]*)"`) ||
            findFirst(html, `"file"\\s*:\\s*"([^"]+\\.m3u8[^"]*)"`) ||
            findFirst(html, `(https?:\\/\\/[^"]+\\.m3u8[^"]*)`);

        return m3u ? m3u[1] : null;

    } catch {
        return null;
    }

}

async function getStreams(tmdbId, type, season, episode) {

    try {

        const tmdbType = type === "movie" ? "movie" : "tv";

        const tmdb = await fetch(
            `https://api.themoviedb.org/3/${tmdbType}/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96`
        );

        const data = await tmdb.json();

        const title = data.title || data.name;

        if (!title) return [];

        const results = await searchDiziPal(title, type);

        const best = findBestMatch(results, title);

        if (!best) return [];

        let pageUrl = best.url;

        if (type === "tv" && season && episode) {

            const slug = best.url.split("/dizi/")[1].replace("/", "");

            pageUrl =
                `${BASE_URL}/bolum/${slug}-${season}-sezon-${episode}-bolum-izle/`;

        }

        const iframe = await loadIframe(pageUrl);

        const m3u8 = await extractM3U8(iframe);

        if (!m3u8) return [];

        return [{
            name: "⌜ DiziPal ⌟",
            title: title,
            url: m3u8,
            quality: "HD",
            headers: {
                Referer: iframe
            },
            provider: "dizipal"
        }];

    } catch (e) {

        return [];

    }

}

module.exports = { getStreams };
