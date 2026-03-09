const axios = require("axios");
const cheerio = require("cheerio");

const BASE_URL = "https://atishmkv3.bond";

async function search(query) {
  const url = `${BASE_URL}/?s=${encodeURIComponent(query)}`;
  const res = await axios.get(url);
  const $ = cheerio.load(res.data);

  let results = [];

  $("article").each((i, el) => {
    const title = $(el).find("h2 a").text().trim();
    const link = $(el).find("h2 a").attr("href");
    const img = $(el).find("img").attr("src");

    if (title && link) {
      results.push({
        title,
        url: link,
        image: img
      });
    }
  });

  return results;
}

async function getStreams(url) {
  const res = await axios.get(url);
  const html = res.data;

  const match = html.match(/https?:\/\/[0-9.]+\/v4\/.*?master\.m3u8[^\s'"]*/);

  if (!match) return [];

  const stream = match[0];

  return [
    {
      name: "AtishMKV",
      url: stream,
      type: "hls"
    }
  ];
}

module.exports = {
  name: "AtishMKV",
  search,
  getStreams
};
