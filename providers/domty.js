// ───────────────── Headers ─────────────────
var DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8'
};

// ───────────────── HTTP ─────────────────
function httpGet(url, headers) {
  return fetch(url, { headers: Object.assign({}, DEFAULT_HEADERS, headers || {}) })
    .then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    });
}

// ───────────────── Extractors ─────────────────
function extractIframe(html) {
  var match = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
}

function extractStreams(html) {
  var results = [];
  var regex = /(https?:\/\/[^"' ]+\.(m3u8|mp4)[^"' ]*)/gi;
  var m;

  while ((m = regex.exec(html)) !== null) {
    results.push(m[1]);
  }

  return results;
}

// ───────────────── Search ─────────────────
function searchSite(base, query) {
  var url = base + "/?s=" + encodeURIComponent(query);

  return httpGet(url, { Referer: base }).then(function (html) {
    var items = [];

    var re = /<a[^>]+href=["'](https?:\/\/[^"']+)["'][^>]*>(.*?)<\/a>/gi;
    var m;

    while ((m = re.exec(html)) !== null) {
      if (/watch|movie|film|episode|مسلسل|فيلم/i.test(m[2])) {
        items.push(m[1]);
      }
    }

    return items.slice(0, 3);
  });
}

// ───────────────── Player Resolver ─────────────────
function resolvePage(name, url, base) {
  return httpGet(url, { Referer: base }).then(function (html) {

    var streams = extractStreams(html);
    if (streams.length) {
      return streams.map(function (s) {
        return {
          name: name,
          url: s,
          quality: "HD",
          headers: { Referer: url }
        };
      });
    }

    var iframe = extractIframe(html);
    if (!iframe) return [];

    if (iframe.startsWith("//")) iframe = "https:" + iframe;
    if (iframe.startsWith("/")) iframe = base + iframe;

    return httpGet(iframe, { Referer: url }).then(function (frameHtml) {
      return extractStreams(frameHtml).map(function (s) {
        return {
          name: name,
          url: s,
          quality: "HD",
          headers: { Referer: iframe }
        };
      });
    });
  });
}

// ───────────────── Sources ─────────────────
var SOURCES = [
  { name: "EgyBest", base: "https://egybest.la" },
  { name: "CimaWBAS", base: "https://cimawbas.org" },
  { name: "MyCima", base: "https://mycima.horse" },
  { name: "Fajer", base: "https://fajer.show" }
];

// ───────────────── Main ─────────────────
function getStreams(title, type, season, episode) {

  var query = title;

  if (type === "tv" && season && episode) {
    query += " s" + season + "e" + episode;
  }

  var tasks = SOURCES.map(function (src) {

    return searchSite(src.base, query)
      .then(function (results) {

        if (!results.length) return [];

        return resolvePage(src.name, results[0], src.base);

      })
      .catch(function () {
        return [];
      });

  });

  return Promise.all(tasks).then(function (all) {

    var merged = [].concat.apply([], all);

    var seen = {};
    return merged.filter(function (s) {
      if (seen[s.url]) return false;
      seen[s.url] = true;
      return true;
    });

  });
}

module.exports = { getStreams };
