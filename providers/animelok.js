/**
 * Animelok - Dynamic Extraction Fix
 * Verified 2026 Strategy
 */
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => { try { step(generator.next(value)); } catch (e) { reject(e); } };
    var rejected = (value) => { try { step(generator.throw(value)); } catch (e) { reject(e); } };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

var cheerio = require("cheerio-without-node-native");
var BASE_URL = "https://animelok.site";
var USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

async function search(query) {
  try {
    const searchUrl = `${BASE_URL}/search?keyword=${encodeURIComponent(query)}`;
    const res = await fetch(searchUrl, { headers: { "User-Agent": USER_AGENT } });
    const html = await res.text();
    const $ = cheerio.load(html);
    const results = [];

    $("a[href*='/anime/']").each((i, el) => {
      const title = $(el).find("h3, .title, .font-bold").first().text().trim();
      const href = $(el).attr("href");
      if (href && title) {
        const id = href.split("/").pop().split("?")[0];
        results.push({ title, id, type: "tv" });
      }
    });
    return results;
  } catch (e) { return []; }
}

async function getStreams(id, type, season, episode) {
  return __async(this, null, function* () {
    let slug = id;
    if (/^\d+$/.test(id)) {
      const results = yield search(id);
      if (results.length > 0) slug = results[0].id;
    }

    try {
      // STEP 1: Fetch the actual watch page to get the internal Episode ID
      const watchPageUrl = `${BASE_URL}/watch/${slug}?ep=${episode}`;
      const pageRes = yield fetch(watchPageUrl, { headers: { "User-Agent": USER_AGENT } });
      const html = yield pageRes.text();
      
      // Look for the episode ID in the HTML (often in a data-id attribute or script)
      const epIdMatch = html.match(/data-id="(\d+)"/i) || html.match(/"episodeId":"(\d+)"/i);
      const epId = epIdMatch ? epIdMatch[1] : null;

      // STEP 2: Use the internal ID to call the AJAX source provider
      // If epId is missing, we fallback to the slug-based API
      const apiUrl = epId 
        ? `${BASE_URL}/api/source/${epId}` 
        : `${BASE_URL}/api/anime/${slug}/episodes/${episode}`;

      const response = yield fetch(apiUrl, {
        headers: {
          "Referer": watchPageUrl,
          "User-Agent": USER_AGENT,
          "X-Requested-With": "XMLHttpRequest",
          "Accept": "application/json"
        }
      });

      const data = yield response.json();
      const servers = data.servers || data.data?.servers || [];
      const streams = [];

      for (const s of servers) {
        let streamUrl = s.url || s.link;
        if (!streamUrl) continue;

        streams.push({
          name: `Animelok - ${s.name || "Server"}`,
          url: streamUrl,
          type: streamUrl.includes(".m3u8") ? "hls" : "mp4",
          quality: "Auto",
          headers: {
            "Referer": BASE_URL,
            "User-Agent": USER_AGENT,
            "Origin": BASE_URL
          }
        });
      }
      return streams;
    } catch (e) {
      console.error("[Animelok] Critical Error:", e.message);
      return [];
    }
  });
}

module.exports = { search, getStreams };
