const PRIMESRC_BASE = "https://primesrc.me/api/v1/";
const PRIMESRC_SITE = "https://primesrc.me";

function getStreams(id, mediaType, season, episode) {
    var type = (season && episode) ? "tv" : "movie";
    var url = PRIMESRC_BASE + "list_servers?type=" + type;

    if (typeof id === 'string' && id.startsWith('tt')) {
        url += "&imdb=" + id;
    } else {
        url += "&tmdb=" + id;
    }

    if (type === "tv") {
        url += "&season=" + season + "&episode=" + episode;
    }

    // UA from your successful logs
    var ua = "Mozilla/5.0 (Linux; Android 15; ALT-NX1 Build/HONORALT-N31; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/146.0.7680.177 Mobile Safari/537.36";

    return fetch(url, {
        headers: {
            "User-Agent": ua,
            "Referer": PRIMESRC_SITE + "/"
        }
    })
    .then(function(response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        return response.json();
    })
    .then(function(data) {
        if (!data || !data.servers || !Array.isArray(data.servers)) {
            return [];
        }

        // We use .map to create promises for the direct links
        var promises = data.servers.map(function(server) {
            var linkUrl = PRIMESRC_BASE + "l?key=" + server.key;
            
            return fetch(linkUrl, {
                headers: { "User-Agent": ua, "Referer": PRIMESRC_SITE + "/" }
            })
            .then(function(res) { return res.json(); })
            .then(function(ld) {
                if (!ld || !ld.link) return null;

                var streamUrl = ld.link;
                var ref = PRIMESRC_SITE + "/";

                // Apply dynamic referers from your logs to fix 23003
                if (streamUrl.indexOf("streamta.site") !== -1) ref = "https://streamta.site/";
                if (streamUrl.indexOf("cloudatacdn.com") !== -1) ref = "https://playmogo.com/";

                return {
                    name: "PrimeSrc - " + server.name,
                    url: streamUrl,
                    quality: "1080p",
                    headers: {
                        "User-Agent": ua,
                        "Referer": ref,
                        "Origin": ref.replace(/\/$/, ""),
                        "Accept": "*/*"
                    }
                };
            })
            .catch(function() { return null; });
        });

        return Promise.all(promises).then(function(results) {
            return results.filter(function(r) { return r !== null; });
        });
    })
    .catch(function(error) {
        return [];
    });
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
