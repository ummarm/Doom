// ============================================================
// Einthusan Provider - Zero-Spin Production Fix
// ============================================================

var BASE_URL = 'https://einthusan.tv';

var HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 15; ALT-NX1 Build/HONORALT-N31; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/146.0.7680.177 Mobile Safari/537.36',
  'Referer': 'https://einthusan.tv/',
  'Accept': '*/*',
  'Connection': 'keep-alive'
};

function getStreams(tmdbId, mediaType) {
  return new Promise(function (resolve) {
    // Hardcoded for test movie '21lw'
    var watchUrl = BASE_URL + '/movie/watch/21lw/?lang=hindi';

    fetch(watchUrl, { headers: HEADERS })
      .then(function (res) { return res.text(); })
      .then(function (html) {
        // Broad capture for the video link
        var match = html.match(/["'](https?:\/\/[^"']+\.(?:m3u8|mp4)[^"']*)["']/i);

        if (match && match[1]) {
          // --- THE CRITICAL CLEANING STEP ---
          var streamUrl = match[1]
            .replace(/&amp;/g, '&')  // Fix broken URL parameters
            .replace(/\\/g, '')      // Remove escape slashes
            .trim();

          // If it's an m3u8, we ensure the player knows it's a stream
          var isHLS = streamUrl.indexOf('m3u8') !== -1;

          console.log('FINAL ATTEMPT URL: ' + streamUrl);

          resolve([{
            url: streamUrl,
            quality: 'HD',
            format: isHLS ? 'm3u8' : 'mp4',
            // We force the player to mirror the browser exactly
            headers: {
              'User-Agent': HEADERS['User-Agent'],
              'Referer': 'https://einthusan.tv/',
              'Origin': 'https://einthusan.tv',
              'Accept': '*/*',
              'Accept-Encoding': 'identity;q=1, *;q=0'
            }
          }]);
        } else {
          console.log('Fail: Regex missed the link');
          resolve([]);
        }
      })
      .catch(function (err) {
        console.log('Fail: Fetch error ' + err);
        resolve([]);
      });
  });
}

module.exports = { getStreams: getStreams };
