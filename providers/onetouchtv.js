/**
 * onetouchtv - Built from src/onetouchtv/
 * Generated: 2026
 */

var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __hasOwnProp = Object.prototype.hasOwnProperty;

var __defNormalProp = (obj, key, value) =>
  key in obj
    ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value })
    : (obj[key] = value);

var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop)) __defNormalProp(a, prop, b[prop]);
  return a;
};

var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));

var axios = require("axios");
var cheerio = require("cheerio-without-node-native");

var ONETOUCH_BASE = "https://onetouchtv.xyz";

var TMDB_API_KEY = "1b3113663c9004682ed61086cf967c44";
var TMDB_BASE_URL = "https://api.themoviedb.org/3";

var HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
  Accept: "*/*",
  Referer: ONETOUCH_BASE
};

function formatTitle(title, quality, season, episode) {
  const s = String(season || 1).padStart(2, "0");
  const e = String(episode || 1).padStart(2, "0");
  const ep = season ? ` - S${s}E${e}` : "";

  return `OneTouchTV (${quality}) [OneTouchTV]
📺: ${title}${ep}`;
}

async function getTMDBDetails(tmdbId, mediaType) {
  try {
    const endpoint = mediaType === "tv" ? "tv" : "movie";
    const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}`;

    const res = await axios.get(url);

    const data = res.data;

    return {
      title: data.name || data.title,
      year: (data.first_air_date || data.release_date || "").split("-")[0]
    };
  } catch (e) {
    console.log("[OneTouchTV] TMDB failed");
    return null;
  }
}

async function search(query) {
  try {
    const url = `${ONETOUCH_BASE}/?s=${encodeURIComponent(query)}`;

    const res = await axios.get(url, { headers: HEADERS });

    const $ = cheerio.load(res.data);

    const results = [];

    $(".post-title a").each((i, el) => {
      results.push({
        title: $(el).text().trim(),
        url: $(el).attr("href")
      });
    });

    return results;
  } catch (e) {
    console.log("[OneTouchTV] search failed");
    return [];
  }
}

async function extractStream(pageUrl) {
  try {
    const res = await axios.get(pageUrl, { headers: HEADERS });

    const html = res.data;

    const m3u8Match = html.match(/https?:\/\/[^"' ]+\.m3u8[^"' ]*/);

    if (m3u8Match) return m3u8Match[0];

    return null;
  } catch (e) {
    return null;
  }
}

async function getStreams(tmdbId, mediaType = "movie", season = null, episode = null) {
  try {
    const info = await getTMDBDetails(tmdbId, mediaType);

    if (!info) return [];

    console.log(`[OneTouchTV] Searching for ${info.title}`);

    const results = await search(info.title);

    if (!results.length) return [];

    const target = results[0];

    const stream = await extractStream(target.url);

    if (!stream) return [];

    const streams = [];

    streams.push({
      name: "OneTouchTV",
      title: formatTitle(info.title, "1080p", season, episode),
      url: stream,
      quality: "1080p",
      type: "hls",
      headers: __spreadProps(__spreadValues({}, HEADERS), {
        Referer: target.url
      }),
      provider: "OneTouchTV"
    });

    return streams;
  } catch (e) {
    console.error("[OneTouchTV] getStreams failed:", e.message);
    return [];
  }
}

module.exports = { getStreams };
