// ============================================================
// Einthusan Provider for Nuvio (2026 Hermes Fix)
// ============================================================

var BASE_URL = 'https://einthusan.tv';

var HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Linux; Android 15; ALT-NX1 Build/HONORALT-N31; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/146.0.7680.177 Mobile Safari/537.36',
  'Referer': 'https://einthusan.tv/',
  'X-Requested-With': 'XMLHttpRequest'
};

// Custom decryption for Einthusan EJLinks
function decryptEJ(data) {
  try {
    // Einthusan shuffle: 10 chars + last char + mid section
    var shuffled = data.substring(0, 10) + data.substring(data.length - 1) + data.substring(12, data.length - 1);
    // Base64 decode (Nuvio has global atob)
    return JSON.parse(atob(shuffled));
  } catch (e) {
    return null;
  }
}

function getStreams(tmdbId, mediaType) {
  return new Promise(function (resolve) {
    // Testing with the ID you provided
    var movieId = '21lw'; 
    var ajaxUrl = BASE_URL + '/ajax/movie/watch/' + movieId + '/';

    // Step 1: Hit the page to get the PageID (CSRF)
    fetch(BASE_URL + '/movie/watch/' + movieId + '/?lang=hindi', { headers: HEADERS })
      .then(function (res) { return res.text(); })
      .then(function (html) {
        var pageIdMatch = html.match(/data-pageid="([^"]+)"/);
        var pageId = pageIdMatch ? pageIdMatch[1] : '';
        
        // Step 2: Request the AJAX link data
        return fetch(ajaxUrl, {
          method: 'POST',
          headers: Object.assign({}, HEADERS, { 'Content-Type': 'application/x-www-form-urlencoded' }),
          body: 'xEvent=UIVideoPlayer.PingOutcome&xJson={"NativeHLS":true}&arcVersion=3&appVersion=59&gorilla.csrf.Token=' + pageId
        });
      })
      .then(function (res) { return res.json(); })
      .then(function (json) {
        var videoData = json.Data;
        if (videoData && videoData.EJLinks) {
          var links = decryptEJ(videoData.EJLinks);
          var finalUrl = (links.HLSLink || links.MP4Link).replace(/&amp;/g, '&');

          resolve([{
            url: finalUrl,
            quality: 'HD',
            format: finalUrl.indexOf('m3u8') !== -1 ? 'm3u8' : 'mp4',
            headers: HEADERS
          }]);
        } else {
          resolve([]);
        }
      })
      .catch(function (err) {
        console.log('Provider Error: ' + err);
        resolve([]);
      });
  });
}

module.exports = { getStreams: getStreams };
