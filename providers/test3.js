const PRIMESRC_BASE = "https://primesrc.me/api/v1/";
const PRIMESRC_SITE = "https://primesrc.me";

function getStreams(id, mediaType, season, episode) {
    var type = (season && episode) ? "tv" : "movie";
    var url = PRIMESRC_BASE + "list_servers?type=" + type;

    if (typeof id === 'string' && id.indexOf('tt') === 0) {
        url += "&imdb=" + id;
    } else {
        url += "&tmdb=" + id;
    }

    if (type === "tv") {
        url += "&season=" + season + "&episode=" + episode;
    }

    var ua = "Mozilla/5.0 (Linux; Android 15; ALT-NX1 Build/HONORALT-N31; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/146.0.7680.177 Mobile Safari/537.36";

    return fetch(url, {
        headers: {
            "User-Agent": ua,
            "Referer": PRIMESRC_SITE + "/"
        }
    })
    .then(function(response) {
        return response.json();
    })
    .then(function(data) {
        if (!data || !data.servers) return [];

        return data.servers.map(function(server) {
            // Since /l?key= was returning undefined, we go back to the 
            // embed structure BUT we add the specific headers you provided
            // to the object so the player can actually handshake with the site.
            
            var embedUrl = PRIMESRC_SITE + "/embed/" + type + "?";
            if (typeof id === 'string' && id.indexOf('tt') === 0) {
                embedUrl += "imdb=" + id;
            } else {
                embedUrl += "tmdb=" + id;
            }

            if (type === "tv") {
                embedUrl += "&season=" + season + "&episode=" + episode;
            }
            
            embedUrl += "&whitelistServers=" + encodeURIComponent(server.name);

            // Determine which referer to use based on the server name
            var playRef = "https://streamta.site/";
            if (server.name === "Voe") {
                playRef = "https://marissasharecareer.com/";
            }

            return {
                name: "PrimeSrc - " + server.name,
                url: embedUrl,
                quality: "1080p",
                headers: { 
                    "User-Agent": ua,
                    "Referer": playRef,
                    "Origin": playRef.replace(/\/$/, ""),
                    "Accept": "*/*",
                    "Accept-Encoding": "identity;q=1, *;q=0"
                }
            };
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
