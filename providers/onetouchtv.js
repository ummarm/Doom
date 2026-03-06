/**
 * onetouchtv test provider
 */

const STREAM =
"https://aapanel.devcorp.me/assets/2fd52cf7-8b76-5a91-9532-71ee013c42bd.m3u8";

async function getStreams(tmdbId, mediaType="movie", season=null, episode=null) {

  return [
    {
      name: "OneTouchTV",
      title: "OneTouchTV Test Stream",
      url: STREAM,
      quality: "1080p",
      type: "hls",
      provider: "OneTouchTV"
    }
  ];

}

module.exports = { getStreams };
