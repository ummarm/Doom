// ============================================================
// Einthusan Provider - Minimal Direct Fetch
// ============================================================

var BASE_URL = 'https://einthusan.tv';

var HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 15; ALT-NX1 Build/HONORALT-N31; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/146.0.7680.177 Mobile Safari/537.36',
  'Referer': 'https://einthusan.tv/',
  'sec-ch-ua': '"Chromium";v="146", "Not-A.Brand";v="24", "Android WebView";v="146"',
  'Accept': '*/*'
};

function getStreams(tmdbId, mediaType) {
  return new Promise(function (resolve) {
    // Manually testing with ID 661t
    var watchUrl = BASE_URL + '/movie/watch/661t/?lang=hindi';

    fetch(watchUrl, { headers: HEADERS })
      .then(function (res) { 
        console.log('HTTP Status: ' + res.status); 
        return res.text(); 
      })
      .then(function (html) {
        // Log the first 200 characters to see if we hit a "403 Forbidden" or "Cloudflare"
        console.log('Source Snippet: ' + html.substring(0, 200).replace(/\s+/g, ' '));

        // Attempt to find the link in the raw source
        var match = html.match(/["'](https?:\/\/[^"']+\.(?:m3u8|mp4)[^"']*)["']/i);

        if (match) {
          var streamUrl = match[1].replace(/&amp;/g, '&').replace(/\\/g, '');
          console.log('Link Found: ' + streamUrl);
          resolve([{
            url: streamUrl,
            quality: 'HD',
            format: streamUrl.indexOf('m3u8') !== -1 ? 'm3u8' : 'mp4',
            headers: HEADERS
          }]);
        } else {
          console.log('No link found in source. Page may be blocked or link is JS-generated.');
          resolve([]);
        }
      })
      .catch(function (err) {
        console.log('Fetch Error: ' + err);
        resolve([]);
      });
  });
}

module.exports = { getStreams: getStreams };
