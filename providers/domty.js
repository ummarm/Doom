exports.name = "DOMTY";

exports.getStreams = async function (tmdbId, mediaType, season, episode) {

  const streams = [];

  const url =
    mediaType === "movie"
      ? "https://vidsrc.to/embed/movie/" + tmdbId
      : "https://vidsrc.to/embed/tv/" + tmdbId + "/" + season + "/" + episode;

  streams.push({
    name: "DOMTY",
    title: "Auto",
    url: url
  });

  return streams;
};
