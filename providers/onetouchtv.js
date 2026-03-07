const axios = require("axios");
const CryptoJS = require("crypto-js");

const provider = {
  id: "onetouchtv",
  name: "OneTouchTV",
  languages: ["en"],

  async getMovie(tmdbId) {
    return getStreams(tmdbId, "movie");
  },

  async getTv(tmdbId, season, episode) {
    return getStreams(tmdbId, "tv", season, episode);
  }
};

const API_BASE = "https://s1.onetouchtv.me/api";

const HEX_KEY = "4f6e65546f7563685465564b6579";

function decrypt(data) {
  try {
    const key = CryptoJS.enc.Hex.parse(HEX_KEY);

    const decrypted = CryptoJS.AES.decrypt(data, key, {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7
    });

    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch {
    return null;
  }
}

async function getStreams(tmdbId, type, season, episode) {
  try {

    let url;

    if (type === "movie") {
      url = `${API_BASE}/movie/${tmdbId}`;
    } else {
      url = `${API_BASE}/tv/${tmdbId}/${season}/${episode}`;
    }

    const res = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://onetouchtv.me/",
        "Origin": "https://onetouchtv.me"
      }
    });

    const encrypted = res.data?.data;

    if (!encrypted) return [];

    const decrypted = decrypt(encrypted);

    if (!decrypted) return [];

    const json = JSON.parse(decrypted);

    const links = [];

    if (json.sources) {
      json.sources.forEach(source => {
        if (!source.file) return;

        links.push({
          url: source.file,
          quality: source.label || "HD",
          type: "hls",
          headers: {
            Referer: "https://onetouchtv.me/"
          }
        });
      });
    }

    return links;

  } catch (e) {
    return [];
  }
}

module.exports = provider;
