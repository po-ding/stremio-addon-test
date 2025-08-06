// index.js (최종 v6.0: 설정 페이지 구현)

const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const axios = require('axios');
const express = require('express');

const TMDB_API_KEY = '6091e24320473f80ca1d4f402ab3f7d9';

const manifest = {
    id: 'community.tmdb.discover.configurable.final',
    version: '6.0.0',
    name: 'TMDB Discover (Configurable)',
    description: 'Select genres and pages from a configuration page.',
    resources: ['catalog'],
    types: ['series'],
    idPrefixes: ['tmdb-'],
    // *** 여기가 핵심! ***
    // 'configurable: true'를 추가하여 [Configure] 버튼을 활성화합니다.
    behaviorHints: {
        configurable: true
    }
};

const builder = new addonBuilder(manifest);

// 이 핸들러는 이제 사용자가 설정 페이지에서 선택한 'id'를 기반으로 작동합니다.
// 예: id = "tmdb-discover-tv-kr/genre=18&page=3"
builder.defineCatalogHandler(async (args) => {
    const [catalogId, configStr] = args.id.split('/');
    const config = new URLSearchParams(configStr);

    const page = config.get('page') || 1;
    const genre = config.get('genre') || null;

    console.log(`Requesting page ${page} with genre ${genre}`);

    try {
        let apiUrl = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&language=ko-KR&with_original_language=ko&sort_by=popularity.desc&page=${page}`;
        if (genre) {
            apiUrl += `&with_genres=${genre}`;
        }
        
        const response = await axios.get(apiUrl);
        const results = response.data.results;
        console.log(`Found ${results.length} results.`);
        
        const metas = results.map(item => ({
            id: `tmdb:${item.id}`,
            type: 'series',
            name: item.name,
            poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
        }));
        
        return { metas: metas };

    } catch (error) {
        console.error('TMDB API Error:', error.message);
        return { metas: [] };
    }
});

// ------------------------------------------------------------------
// *** 설정 페이지를 위한 웹서버 로직 ***
const app = express();
const addonInterface = builder.getInterface();

// Stremio 애드온 요청을 처리하는 미들웨어
app.use((req, res, next) => {
    // manifest.json, catalog/... 요청은 애드온 핸들러가 처리
    if (req.url.includes('.json')) {
        return addonInterface(req, res, next);
    }
    // 그 외의 요청은 다음 미들웨어로 넘어감
    next();
});

// '/configure' 주소에 대한 요청이 오면 설정 페이지 HTML을 보여줌
app.get('/configure', (req, res) => {
    // 간단한 HTML 페이지를 직접 생성하여 보냅니다.
    const genres = [
        { id: '18', name: '드라마' },
        { id: '35', name: '코미디' },
        { id: '80', name: '범죄' },
        { id: '10759', name: '액션 & 어드벤처' }
    ];

    let genreOptions = genres.map(g => `<option value="${g.id}">${g.name}</option>`).join('');

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Configure Addon</title>
        </head>
        <body>
            <h1>Configure Your Addon</h1>
            <label for="genre">Select Genre:</label>
            <select id="genre">
                <option value="">All Genres</option>
                ${genreOptions}
            </select>
            <br><br>
            <button onclick="installAddon()">Install Addon</button>

            <script>
                function installAddon() {
                    const genre = document.getElementById('genre').value;
                    let catalogId = 'tmdb-discover-tv-kr';
                    if (genre) {
                        catalogId += '/genre=' + genre;
                    }
                    // Stremio 설치 프로토콜을 사용하여 애드온을 설치합니다.
                    window.location.href = 'stremio://' + window.location.host + '/' + catalogId + '/manifest.json';
                }
            </script>
        </body>
        </html>
    `;
    res.send(html);
});

const port = process.env.PORT || 7000;
app.listen(port, () => {
    console.log(`Addon with configuration page running on port ${port}`);
});
