const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const axios = require('axios');

const TMDB_API_KEY = '6091e24320473f80ca1d4f402ab3f7d9';

const manifest = {
    id: 'community.tmdb.discover.kr.series',
    version: '1.0.0',
    name: 'Korean Series Discover (TMDB)',
    description: 'Discover Korean TV series using genre and sorting filters.',
    resources: ['catalog', 'meta'],
    types: ['series'],
    catalogs: [
        {
            type: 'series',
            id: 'tmdb-korean-series',
            name: 'Korean Series',
            extra: [
                {
                    name: 'sort_by', isRequired: false,
                    options: {
                        'popularity.desc': '인기순',
                        'first_air_date.desc': '최신순',
                        'vote_average.desc': '평점순'
                    }
                },
                {
                    name: 'with_genres', isRequired: false,
                    options: {
                        '10759': '액션 & 어드벤처', '16': '애니메이션', '35': '코미디', '80': '범죄',
                        '99': '다큐멘터리', '18': '드라마', '10751': '가족', '9648': '미스터리', '10765': 'SF & 판타지'
                    }
                },
                { name: 'skip', isRequired: false },
                { name: 'limit', isRequired: false }
            ]
        }
    ]
};

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(async (args) => {
    const sortBy = args.extra.sort_by || 'popularity.desc';
    const withGenres = args.extra.with_genres || null;
    const skip = parseInt(args.extra.skip || '0');
    const limit = parseInt(args.extra.limit || '20');

    const page = Math.floor(skip / 20) + 1;

    let apiUrl = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&language=ko-KR&with_original_language=ko&sort_by=${sortBy}&page=${page}`;
    if (withGenres) {
        apiUrl += `&with_genres=${withGenres}`;
    }

    try {
        const response = await axios.get(apiUrl);
        const results = response.data.results || [];

        const start = skip % 20;
        const sliced = results.slice(start, start + limit);

        const metas = sliced.map(item => ({
            id: `tmdb:${item.id}`,
            type: 'series',
            name: item.name,
            poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null
        }));

        return { metas };
    } catch (err) {
        console.error('Catalog fetch error:', err.message);
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
                id: `tmdb:${item.id}`,
                type: 'series',
                name: item.name,
                poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
                background: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : null,
                description: item.overview
            }
        };
    } catch (err) {
        console.error('Meta fetch error:', err.message);
        return { meta: null };
    }
});

const port = process.env.PORT || 7000;
serveHTTP(builder.getInterface(), { port });
console.log(`Korean Series Discover Addon running on port ${port}`);
