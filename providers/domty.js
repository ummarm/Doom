const PROVIDER_NAME = "Domty";

const TMDB_KEY = "439c478a771f35c05022f9feabcca01c";

const SOURCES = [
  { name: "FaselHD", base: "https://www.faselhd.watch" },
  { name: "CimaNow", base: "https://cimanow.cc" },
  { name: "Akwam", base: "https://akwam.to" }
];

async function getTitle(id, type) {

  const url =
    "https://api.themoviedb.org/3/" +
    (type === "tv" ? "tv/" : "movie/") +
    id +
    "?api_key=" +
    TMDB_KEY;

  const r = await fetch(url);
  const j = await r.json();

  return type === "tv" ? j.name : j.title;
}

async function request(url) {

  const r = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Referer": url
    }
  });

  return await r.text();
}

function findLinks(html) {

  const links = [];

  const videoRegex = /(https?:\/\/[^"' ]+\.(m3u8|mp4)[^"' ]*)/g;

  let m;

  while ((m = videoRegex.exec(html)) !== null) {

    links.push({
      url: m[1],
      name: "Arabic Server",
      quality: "HD"
    });

  }

  const iframeRegex = /<iframe[^>]+src="([^"]+)"/g;

  while ((m = iframeRegex.exec(html)) !== null) {

    links.push({
      url: m[1],
      name: "Embed Server",
      quality: "HD"
    });

  }

  return links;
}

async function search(site, query) {

  const url = site.base + "/?s=" + encodeURIComponent(query);

  const html = await request(url);

  const match = html.match(/<a href="([^"]+)"[^>]*class="[^"]*title[^"]*"/);

  if (!match) return null;

  return match[1];
}

async function getStreams(tmdbId, type, season, episode) {

  console.log("[Domty] start");

  const title = await getTitle(tmdbId, type);

  let query = title;

  if (type === "tv" && season) {
    query += " season " + season;
  }

  const results = [];

  for (const site of SOURCES) {

    try {

      const page = await search(site, query);

      if (!page) continue;

      const html = await request(page);

      const links = findLinks(html);

      links.forEach(l => {
        results.push({
          name: site.name + " | " + l.name,
          url: l.url,
          quality: l.quality
        });
      });

    } catch (e) {
      console.log("source failed", site.name);
    }

  }

  const seen = new Set();

  return results.filter(r => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });

}

module.exports = {
  name: PROVIDER_NAME,
  getStreams
};
