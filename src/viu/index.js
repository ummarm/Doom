/**
 * Viu Provider
 * Site: https://viu.com
 * Type: Asian drama/content streaming (official API)
 * Note: Viu has a public API used by their apps
 */

var http = require('../shared/http');

var BASE = 'https://viu.com';
var API = 'https://api.viu.com';
var NAME = 'Viu';

var VIU_HEADERS = {
  'x-client-with': 'viu.com',
  'x-country-code': 'EG',
  'x-language-code': 'ar',
  Referer: BASE,
};

function search(query) {
  var url = API + '/cms/api/ar/search/one?keyword=' + encodeURIComponent(query)
    + '&platform_flag_label=web&area_id=1&language_flag_id=1';
  return http.getJson(url, VIU_HEADERS).then(function(json) {
    var items = [];
    var series = (json && json.data && json.data.series) ? json.data.series : [];
    series.forEach(function(s) {
      var posterUrl = s.cover_image_url || s.image_url || null;
      items.push({
        id: 'viu:' + s.series_id,
        type: 'series',
        name: s.name || s.title || '',
        poster: posterUrl,
        _seriesId: s.series_id,
      });
    });
    return items;
  }).catch(function() { return []; });
}

function getCatalog(type, page) {
  var offset = ((page - 1) * 20);
  var url = API + '/cms/api/ar/browse/product?platform_flag_label=web&area_id=1&language_flag_id=1&product_type=series&offset=' + offset + '&limit=20';
  return http.getJson(url, VIU_HEADERS).then(function(json) {
    var items = [];
    var series = (json && json.data && json.data.series) ? json.data.series : [];
    series.forEach(function(s) {
      items.push({
        id: 'viu:' + s.series_id,
        type: 'series',
        name: s.name || s.title || '',
        poster: s.cover_image_url || s.image_url || null,
        _seriesId: s.series_id,
      });
    });
    return items;
  }).catch(function() { return []; });
}

function getStreams(tmdbId, mediaType, season, episode) {
  console.log('[' + NAME + '] getStreams:', tmdbId, mediaType, season, episode);

  return search(tmdbId).then(function(results) {
    if (!results.length) return [];
    var match = results[0];
    var seriesId = match._seriesId;

    // Get episodes for this series
    var url = API + '/cms/api/ar/category/product?series_id=' + seriesId
      + '&platform_flag_label=web&area_id=1&language_flag_id=1';

    return http.getJson(url, VIU_HEADERS).then(function(json) {
      var episodes = (json && json.data && json.data.product) ? json.data.product : [];
      var ep = episodes.find(function(e) {
        return e.number == (episode || 1);
      }) || episodes[0];

      if (!ep) return [];

      // Get stream for this episode
      var streamUrl = API + '/playback/api/getVodSrc?platform_flag_label=web&product_id=' + ep.product_id
        + '&area_id=1&language_flag_id=1&drm=widevine';

      return http.getJson(streamUrl, VIU_HEADERS).then(function(sJson) {
        var streams = [];
        var streamList = (sJson && sJson.data && sJson.data.stream) ? sJson.data.stream : {};
        Object.keys(streamList).forEach(function(quality) {
          var url = streamList[quality];
          if (url && url.startsWith('http')) {
            streams.push({
              name: NAME,
              title: quality,
              url: url,
              quality: extractor.normalizeQuality(quality),
              headers: { Referer: BASE },
            });
          }
        });
        return streams;
      });
    });
  }).catch(function(err) {
    console.error('[' + NAME + '] Error:', err.message);
    return [];
  });
}

// Need extractor for normalizeQuality
var extractor = require('../shared/extractor');

module.exports = { getStreams, getCatalog, search };
