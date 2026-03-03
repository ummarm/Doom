// viu.js - Mobile/Node safe version with dummy fallback

// Default headers to mimic a browser
var DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'ar,en;q=0.9',
  'Accept': 'application/json'
};

var BASE = 'https://viu.com';
var API = 'https://api.viu.com';
var NAME = 'viu';

// Full headers for API requests
var VIU_HEADERS = Object.assign({}, DEFAULT_HEADERS, {
  'x-client-with': 'viu.com',
  'x-country-code': 'SG', // Change country if blocked
  'x-language-code': 'en',
  'Referer': BASE
});

// Fetch JSON safely
function httpGetJson(url) {
  return fetch(url, { headers: VIU_HEADERS })
    .then(function(res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .catch(function(err) {
      console.error('[' + NAME + '] Fetch error:', err.message);
      return null; // return null if fetch fails
    });
}

// Main function to get streams
function getStreams(tmdbId, mediaType, season, episode) {
  console.log('[' + NAME + '] getStreams:', tmdbId, mediaType, season, episode);

  var searchUrl = API + '/cms/api/ar/search/one?keyword=' + encodeURIComponent(tmdbId)
    + '&platform_flag_label=web&area_id=1&language_flag_id=1';

  return httpGetJson(searchUrl)
    .then(function(json) {
      if (!json || !json.data || !json.data.series || !json.data.series.length) {
        console.log('[' + NAME + '] No series found or API blocked');
        // Dummy fallback stream so Nuvio shows this provider
        return [{
          name: NAME,
          title: 'Test Stream',
          url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
          quality: '720p',
          headers: { Referer: BASE }
        }];
      }

      var s = json.data.series[0];

      var episodesUrl = API + '/cms/api/ar/category/product?series_id=' + s.series_id
        + '&platform_flag_label=web&area_id=1&language_flag_id=1';

      return httpGetJson(episodesUrl).then(function(epJson) {
        if (!epJson || !epJson.data || !epJson.data.product || !epJson.data.product.length) {
          console.log('[' + NAME + '] No episodes found');
          return [{
            name: NAME,
            title: 'Test Stream',
            url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
            quality: '720p',
            headers: { Referer: BASE }
          }];
        }

        var episodes = epJson.data.product;
        var ep = episodes[0];

        for (var i = 0; i < episodes.length; i++) {
          if (episodes[i].number == (episode || 1)) {
            ep = episodes[i];
            break;
          }
        }

        if (!ep) {
          return [{
            name: NAME,
            title: 'Test Stream',
            url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
            quality: '720p',
            headers: { Referer: BASE }
          }];
        }

        var streamUrl = API + '/playback/api/getVodSrc?platform_flag_label=web&product_id=' + ep.product_id
          + '&area_id=1&language_flag_id=1';

        return httpGetJson(streamUrl).then(function(sJson) {
          if (!sJson || !sJson.data || !sJson.data.stream) {
            console.log('[' + NAME + '] No streams found');
            return [{
              name: NAME,
              title: 'Test Stream',
              url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
              quality: '720p',
              headers: { Referer: BASE }
            }];
          }

          var streams = [];
          var streamList = sJson.data.stream;

          Object.keys(streamList).forEach(function(quality) {
            var u = streamList[quality];
            if (u && u.indexOf('http') === 0) {
              streams.push({
                name: NAME,
                title: quality,
                url: u,
                quality: quality,
                headers: { Referer: BASE }
              });
            }
          });

          // Fallback if no streams found
          if (!streams.length) {
            streams.push({
              name: NAME,
              title: 'Test Stream',
              url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
              quality: '720p',
              headers: { Referer: BASE }
            });
          }

          return streams;
        });
      });
    })
    .catch(function(err) {
      console.error('[' + NAME + '] Error:', err.message);
      // Return dummy stream on any unexpected error
      return [{
        name: NAME,
        title: 'Test Stream',
        url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        quality: '720p',
        headers: { Referer: BASE }
      }];
    });
}

// Node.js export for Termux/Node
module.exports = { getStreams };
