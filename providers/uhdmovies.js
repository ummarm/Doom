const cheerio = require("cheerio-without-node-native");

const BASE = "https://uhdmovies.ink";

const headers = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120",
  Referer: BASE,
};

function search(query) {
  const url = BASE + "/?s=" + encodeURIComponent(query);

  return fetch(url, { headers })
    .then((r) => r.text())
    .then((html) => {
      const $ = cheerio.load(html);
      const results = [];

      $("article").each((i, el) => {
        const link = $(el).find("a").attr("href");
        const title = $(el).find("h2").text().trim();

        if (link && title) {
          results.push({
            title,
            url: link,
          });
        }
      });

      return results;
    })
    .catch(() => []);
}

function getDownloadPages(url) {
  return fetch(url, { headers })
    .then((r) => r.text())
    .then((html) => {
      const $ = cheerio.load(html);
      const pages = [];

      $("a").each((i, el) => {
        const link = $(el).attr("href");

        if (!link) return;

        if (
          link.includes("hubcloud") ||
          link.includes("driveleech") ||
          link.includes("workers.dev") ||
          link.includes("tech") ||
          link.includes("download")
        ) {
          pages.push(link);
        }
      });

      return pages;
    })
    .catch(() => []);
}

function extractVideo(url) {
  return fetch(url, { headers })
    .then((r) => r.text())
    .then((html) => {
      const streams = [];

      const m3u8 = html.match(/https?:\/\/[^"' ]+\.m3u8[^"' ]*/g);
      const mp4 = html.match(/https?:\/\/[^"' ]+\.mp4[^"' ]*/g);

      if (m3u8) {
        m3u8.forEach((u) =>
          streams.push({
            name: "UHDMovies",
            title: "UHDMovies Stream",
            url: u,
            quality: "HD",
            headers,
          })
        );
      }

      if (mp4) {
        mp4.forEach((u) =>
          streams.push({
            name: "UHDMovies",
            title: "UHDMovies MP4",
            url: u,
            quality: "HD",
            headers,
          })
        );
      }

      return streams;
    })
    .catch(() => []);
}

function getStreams(tmdbId, mediaType, season, episode) {
  return new Promise((resolve) => {
    search(tmdbId)
      .then((results) => {
        if (!results.length) {
          resolve([]);
          return;
        }

        const page = results[0].url;

        getDownloadPages(page)
          .then((pages) => {
            if (!pages.length) {
              resolve([]);
              return;
            }

            const tasks = pages.map((p) => extractVideo(p));

            Promise.all(tasks).then((all) => {
              const streams = [].concat(...all);
              resolve(streams);
            });
          })
          .catch(() => resolve([]));
      })
      .catch(() => resolve([]));
  });
}

if (typeof module !== "undefined") {
  module.exports = { getStreams };
}
