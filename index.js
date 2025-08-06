// index.js (최종 v8.0: behaviorHints 적용)

const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const axios = require('axios');

const TMDB_API_KEY = '6091e24320473f80ca1d4f402ab3f7d9';
const PAGE_SIZE = 20;

const manifest = {
    id: 'community.tmdb.discover.final.hope',
    version: '8.0.0',
    name: 'TMDB Discover (Final Hope)',
    description: 'The final attempt to fix pagination with behaviorHints.',
    resources: ['catalog', 'meta'],
    types: ['series'],
    idPrefixes: ['tmdb-'],
    catalogs: [
        {
            type: 'series',
            id: 'tmdb-discover-tv-kr',
            name: 'Discover Korean TV Shows',
            // *** 여기가 마지막 희망입니다! ***
            // 이 카탈로그가 '피드' 형식임을 Stremio에 명확히 알려줍니다.
            behaviorHints: {
                // 이 힌트는 Stremio에게 이 카탈로그가 스크롤 가능한 피드이며,
                // 다음 페이지를 요청하기 위해 id를 동적으로 사용해야 한다고 알려줍니다.
                "paged": true
            }
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
        
        // "Next Page" 아이템을 추가하는 방식 대신, hasMore를 사용합니다.
        // paged 힌트와 함께 사용할 때 더 안정적일 수 있습니다.
        if (metas.length > 0) {
            return { metas: metas, hasMore: true, skip: skip + PAGE_SIZE };
        } else {
            return { metas: [] };
        }

    } catch (error) {
        console.error('TMDB API Error:', error.message);
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
        return { meta: { id: `tmdb:${item.id}`, type: 'series', name: item.name, poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null, background: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : null, description: item.overview } };
    } catch (error) {
        console.error('TMDB Meta Error:', error.message);
        return { meta: null };
    }
});

const port = process.env.PORT || 7000;
serveHTTP(builder.getInterface(), { port: port });
console.log(`TMDB Final Hope Addon running on port ${port}`);
