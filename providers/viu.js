const NAME = "Viu";

async function getStreams(tmdbId, type, season, episode) {
  console.log("[viu] getStreams:", tmdbId, type, season, episode);

  const s = season || 1;
  const e = episode || 1;

  const streams = [];

  const sources = [
    {
      name: "VidFast",
      movie: `https://vidfast.pro/movie/${tmdbId}`,
      tv: `https://vidfast.pro/tv/${tmdbId}/${s}/${e}`
    },
    {
      name: "EmbedSu",
      movie: `https://embed.su/embed/movie/${tmdbId}`,
      tv: `https://embed.su/embed/tv/${tmdbId}/${s}/${e}`
    },
    {
      name: "AutoEmbed",
      movie: `https://autoembed.cc/embed/movie/${tmdbId}`,
      tv: `https://autoembed.cc/embed/tv/${tmdbId}/${s}/${e}`
    },
    {
      name: "PrimeWire",
      movie: `https://primewire.tf/embed/movie/${tmdbId}`,
      tv: `https://primewire.tf/embed/tv/${tmdbId}/${s}/${e}`
    }
  ];

  for (const src of sources) {
    streams.push({
      name: NAME,
      title: src.name,
      url: type === "movie" ? src.movie : src.tv,
      quality: "auto",
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });
  }

  return streams;
}

module.exports = { getStreams };
