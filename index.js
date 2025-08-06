// addon.js (최종 v3.1: 'Next Page' 아이템 방식)

const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const axios = require('axios');

const TMDB_API_KEY = '6091e24320473f80ca1d4f402ab3f7d9';
const PAGE_SIZE = 20;

const manifest = {
    id: 'community.tmdb.discover.feed.final.v2',
    version: '3.1.0',
    name: 'TMDB Discover (Next Page Button)',
    description: 'Provides robust pagination using a virtual "Next Page" item.',
    resources: ['catalog', 'meta'],
    types: ['series'],
    idPrefixes: ['tmdb-'],
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
        
        // *** 여기가 핵심! ***
        // 결과가 있다면, 목록의 맨 끝에 "다음 페이지" 역할을 할 가상 아이템을 추가합니다.
        if (metas.length > 0) {
            metas.push({
                id: `${catalogId}/skip=${skip + PAGE_SIZE}`, // 다음 페이지의 id
                type: 'series',
                name: `Next Page (Page ${page + 1})`,
                poster: 'https://cdn.strem.io/images/plus-6.png' // '더보기' 아이콘
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


serveHTTP(builder.getInterface(), { port: 7000 });
console.log('TMDB "Next Page" Addon running...');