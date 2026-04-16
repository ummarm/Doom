function getStreams(tmdbId, mediaType) {
  return new Promise((resolve) => {

    let streams = [];

    let tmdbUrl = "https://api.themoviedb.org/3/" +
      (mediaType === "movie" ? "movie/" : "tv/") + tmdbId;

    fetch(tmdbUrl)
      .then(res => res.json())
      .then(data => {

        let title = data.title || data.name;

        return fetch("https://banglaplex.click/?s=" + encodeURIComponent(title));
      })
      .then(res => res.text())
      .then(html => {

        let postMatch = html.match(/href="(https:\/\/banglaplex\.click\/[^"]+)"/);

        if (!postMatch) return resolve([]);

        return fetch(postMatch[1]);
      })
      .then(res => res ? res.text() : null)
      .then(html => {

        if (!html) return resolve([]);

        let pasteMatch = html.match(/https:\/\/pasteurl\.net\/view\/[^\s"]+/);

        if (!pasteMatch) return resolve([]);

        return fetch(pasteMatch[0]);
      })
      .then(res => res ? res.text() : null)
      .then(html => {

        if (!html) return resolve([]);

        let links = html.match(/https?:\/\/[^\s"<]+/g) || [];

        links.forEach(link => {

          if (
            link.includes("streamtape") ||
            link.includes("xcloud") ||
            link.includes("gdflix") ||
            link.includes("filepress")
          ) {
            streams.push({
              name: "BanglaPlex",
              title: link.split('/')[2],
              url: link,
              quality: "Auto",
              provider: "banglaplex",
              headers: {
                "Referer": "https://banglaplex.click/",
                "User-Agent": "Mozilla/5.0"
              }
            });
          }

        });

        resolve(streams);
      })
      .catch(() => resolve([]));

  });
}

module.exports = { getStreams };
