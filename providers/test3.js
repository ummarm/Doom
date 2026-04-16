// ============================================================
// Einthusan Fixed Provider - Link Found + Spin Fix
// ============================================================

var BASE_URL = 'https://einthusan.tv';

// Using the EXACT headers you provided to ensure the session matches
var HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 15; ALT-NX1 Build/HONORALT-N31; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/146.0.7680.177 Mobile Safari/537.36',
  'Referer': 'https://einthusan.tv/',
  'sec-ch-ua': '"Chromium";v="146", "Not-A.Brand";v="24", "Android WebView";v="146"',
  'sec-ch-ua-mobile': '?1',
  'sec-ch-ua-platform': '"Android"',
  'Accept': '*/*',
  'Accept-Encoding': 'identity;q=1, *;q=0'
};

function getStreams(tmdbId, mediaType) {
  return new Promise(function (resolve) {
    // Hardcoded test ID for '21lw'
    var watchUrl = BASE_URL + '/movie/watch/21lw/?lang=hindi';

    fetch(watchUrl, { headers: HEADERS })
      .then(function (res) { return res.text(); })
      .then(function (html) {
        // The regex that successfully found the link before
        var streamPattern = /["'](https?:\/\/[^"']+\.(?:m3u8|mp4)[^"']*)["']/i;
        var match = html.match(streamPattern);

        if (match) {
          // FIX 1: Clean the URL (Removing &amp; and backslashes)
          var cleanUrl = match[1].replace(/&amp;/g, '&').replace(/\\/g, '').trim();
          
          console.log('Link Found & Cleaned: ' + cleanUrl);

          resolve([{
            url: cleanUrl,
            quality: 'HD',
            format: cleanUrl.indexOf('m3u8') !== -1 ? 'm3u8' : 'mp4',
            // FIX 2: Forward headers to the player to stop the infinite spin
            headers: {
              'User-Agent': HEADERS['User-Agent'],
              'Referer': 'https://einthusan.tv/',
              'Origin': 'https://einthusan.tv',
              'Accept-Encoding': 'identity;q=1, *;q=0'
            }
          }]);
        } else {
          console.log('No link found in HTML.');
          resolve([]);
        }
      })
      .catch(function (err) {
        console.log('Fetch error: ' + err);
        resolve([]);
      });
  });
}

module.exports = { getStreams: getStreams };
