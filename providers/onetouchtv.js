const axios = require("axios");
const CryptoJS = require("crypto-js");

const PROVIDER_NAME = "OneTouchTV";

// API endpoint used by OneTouch
const API = "https://api.onetouchtv.me";

// AES HEX key used by Cloudstream provider
const HEX_KEY = "4f6e65546f7563685465564b6579"; 

function decryptAES(data) {
    try {
        const key = CryptoJS.enc.Hex.parse(HEX_KEY);

        const decrypted = CryptoJS.AES.decrypt(data, key, {
            mode: CryptoJS.mode.ECB,
            padding: CryptoJS.pad.Pkcs7
        });

        return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (e) {
        console.log("Decrypt error:", e);
        return null;
    }
}

async function getStreams(tmdbId, type, season = 1, episode = 1) {

    try {

        let url;

        if (type === "movie") {
            url = `${API}/movie/${tmdbId}`;
        } else {
            url = `${API}/tv/${tmdbId}/${season}/${episode}`;
        }

        const res = await axios.get(url, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                "Referer": "https://onetouchtv.me/",
                "Origin": "https://onetouchtv.me"
            }
        });

        const encrypted = res.data.data;

        const decrypted = decryptAES(encrypted);

        if (!decrypted) return [];

        const json = JSON.parse(decrypted);

        const streams = [];

        if (json.sources) {
            json.sources.forEach((s) => {

                if (!s.file) return;

                streams.push({
                    url: s.file,
                    quality: s.label || "HD",
                    type: "hls",
                    headers: {
                        Referer: "https://onetouchtv.me/"
                    }
                });
            });
        }

        return streams;

    } catch (err) {
        console.log(PROVIDER_NAME, err);
        return [];
    }
}

module.exports = {
    name: PROVIDER_NAME,
    getStreams
};
