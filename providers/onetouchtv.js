function getStreams(tmdbId, mediaType, season, episode) {

    return new Promise(function(resolve) {

        let title = "wrecking crew"; // temporary test title

        let searchUrl = "https://atishmkv3.bond/?s=" + encodeURIComponent(title);

        fetch(searchUrl)
        .then(function(res){ return res.text(); })

        .then(function(html){

            let match = html.match(/href="(https:\/\/atishmkv3\.bond\/[^"]+)"/i);

            if(!match){
                resolve([]);
                return;
            }

            return fetch(match[1]).then(function(r){ return r.text(); });
        })

        .then(function(html){

            if(!html){
                resolve([]);
                return;
            }

            let iframe = html.match(/https:\/\/atishmkv\.rpmhub\.site\/#([a-z0-9]+)/i);

            if(!iframe){
                resolve([]);
                return;
            }

            let streamId = iframe[1];

            let testStream = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

            resolve([
                {
                    url: testStream,
                    name: "AtishMKV",
                    quality: "Auto",
                    type: "hls"
                }
            ]);

        })

        .catch(function(){
            resolve([]);
        });

    });
}
