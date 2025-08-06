// index.js (최종 안정화 버전: manifest 오류 수정 및 페이지 넘김)

const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const axios = require('axios');

const TMDB_API_KEY = '6091e24320473f80ca1d4f402ab3f7d9';
const PAGE_SIZE = 20;

const manifest = {
    id: 'community.tmdb.discover.stable.final',
    version: '7.0.0',
    name: 'TMDB Discover (Stable Pagination)',
    description: 'A stable addon with working pagination hosted on Render.',
    resources: ['catalog', 'meta'],
    types: ['series'],
    idPrefixes: ['tmdb-'],
    // *** 여기가 오류를 수정한 부분입니다! ***
    // catalogs 속성을 [...] 대괄호로 감싸서 배열로 만들었습니다.
    catalogs: [
        {
            type: 'series',
            id: 'tmdb-discover-tv-kr',
            name: 'Discover Korean TV Shows'
        }
    ]
};

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(async (args) => {
    // id에서 페이지 정보를 파싱합니다 (예: "tmdb-discover-tv-kr/skip=20").
    const [catalogId, paramsStr] = args.id.split('/');
    const params = new URLSearchParams(paramsStr);
    
    const skip = parseInt(params.get('skip') || '0');
    const page = Math.floor(skip / PAGE_SIZE) + 1;

    console.log(`Requesting PAGE ${page} for catalog ${catalogId}`);

    try {
        const apiUrl = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&language=ko-KR&with_original_language=ko&sort_by=popularity.desc&page=${page}`;
        
        const response = await axios.get(apiUrl);
        const results = response.data.results;

        console.log(`Found ${results.length} results from TMDB API page ${page}.`);

        let metas = results.map(item => ({
            id: `tmdb:${item.id}`,
            type: 'series',
            name: item.name,
            poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
        }));
        
        // "다음 페이지" 아이템을 추가하여 페이지 넘김을 구현합니다.
        if (metas.length > 0) {
            metas.push({
                id: `${catalogId}/skip=${skip + PAGE_SIZE}`,
                type: 'series',
                name: `Next Page (Page ${page + 1})`,
                poster: 'https://cdn.strem.io/images/plus-6.png'
            });
        }
        
        return { metas: metas };

    } catch (error) {
        console.error('TMDB API Error:', error.response ? `${error.response.status}` : error.message);
        return { metas: [] };
    }
});

builder.defineMetaHandler(async ({ id }) => {
    if (!id.startsWith('tmdb:')) return { meta: null };
    const tmdbId = id.split(':')[1];
    try {
        const apiUrl = `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=ko-KR`;
        const response = await axios.get(apiUrl);
        const item = response.data;
        return {
            meta: {
                id: `tmdb:${item.id}`, type: 'series', name: item.name,
                poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
                background: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : null,
                description: item.overview
            }
        };
    } catch (error) {
        console.error('TMDB Meta Error:', error.response ? `${error.response.status}` : error.message);
        return { meta: null };
    }
});


const port = process.env.PORT || 7000;
serveHTTP(builder.getInterface(), { port: port });
console.log(`TMDB Stable Addon running on port ${port}`);
