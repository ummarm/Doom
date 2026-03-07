const cheerio = require("cheerio-without-node-native");
const axios = require("axios");

const BASE = "https://onetouchtv.me";
const TMDB = "https://api.themoviedb.org/3";
const TMDB_KEY = "1b3113663c9004682ed61086cf967c44";

const headers = {
 "User-Agent":
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
 Accept:
  "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
 Referer: BASE + "/"
};

async function fetchTMDB(tmdbId, type) {
 try {
  const url = `${TMDB}/${type === "tv" ? "tv" : "movie"}/${tmdbId}?api_key=${TMDB_KEY}`;
  const res = await axios.get(url);
  return {
   title: res.data.name || res.data.title,
   year: (res.data.first_air_date || res.data.release_date || "").split("-")[0]
  };
 } catch {
  return null;
 }
}

async function search(title) {
 try {
  const url = `${BASE}/search/${encodeURIComponent(title)}`;
  const res = await axios.get(url, { headers });
  const $ = cheerio.load(res.data);

  const results = [];

  $(".film_list-wrap .flw-item").each((i, el) => {
   const name = $(el).find(".film-name").text().trim();
   const link = BASE + $(el).find("a").attr("href");

   results.push({ name, link });
  });

  return results;
 } catch {
  return [];
 }
}

async function extractStreams(url) {
 try {
  const res = await axios.get(url, { headers });
  const $ = cheerio.load(res.data);

  const streams = [];

  $("iframe").each((i, el) => {
   const src = $(el).attr("src");

   if (!src) return;

   if (src.includes(".m3u8")) {
    streams.push({
     name: "OneTouchTV",
     title: "OneTouchTV Stream",
     url: src,
     quality: "Auto",
     type: "hls",
     headers: { Referer: BASE },
     provider: "OneTouchTV"
    });
   }
  });

  return streams;
 } catch {
  return [];
 }
}

async function getStreams(tmdbId, mediaType, season, episode) {
 try {
  const info = await fetchTMDB(tmdbId, mediaType);
  if (!info) return [];

  const results = await search(info.title);
  if (!results.length) return [];

  const page = results[0].link;

  const streams = await extractStreams(page);

  return streams;
 } catch (e) {
  console.error("[OneTouchTV] Error:", e.message);
  return [];
 }
}

module.exports = { getStreams };
