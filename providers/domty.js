var BASE = "https://cima4u.tv";

var DEFAULT_HEADERS = {
  "User-Agent": "Mozilla/5.0",
  "Referer": BASE
};

function http(url) {
  return fetch(url, { headers: DEFAULT_HEADERS })
    .then(function(r) { return r.text(); });
}

function extract(html, referer) {
  var out = [];
  var re = /(https?:\/\/[^"' ]+\.(m3u8|mp4)[^"' ]*)/g;
  var m;

  while ((m = re.exec(html)) !== null) {
    out.push({
      name: "CIMA4U",
      url: m[1],
      quality: "HD",
      headers: { Referer: referer }
    });
  }

  return out;
}

function getStreams(tmdbId, mediaType, season, episode) {

  var search = BASE + "/?s=" + encodeURIComponent(tmdbId);

  return http(search).then(function(html) {

    var match = html.match(/<a href="(https?:\/\/[^"]+)"/i);
    if (!match) return [];

    var page = match[1];

    return http(page).then(function(p) {

      var streams = extract(p, page);

      var iframe = p.match(/<iframe[^>]+src="([^"]+)"/i);

      if (!streams.length && iframe) {
        return http(iframe[1]).then(function(i) {
          return extract(i, iframe[1]);
        });
      }

      return streams;
    });

  }).catch(function() {
    return [];
  });
}

module.exports = { getStreams };
