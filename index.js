const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const axios = require('axios');

const TMDB_API_KEY = '6091e24320473f80ca1d4f402ab3f7d9';

const manifest = {
    id: 'community.tmdb.discover.stable.final',
    version: '10.0.1',  // 버전 업데이트
    name: 'TMDB Discover (Stable Filters)',
    description: 'A stable addon to discover Korean TV shows with filters.',
    resources: ['catalog', 'meta'],
    types: ['series'],
    catalogs: [
        {
            type: 'series',
            id: 'tmdb-discover-tv-kr',
            name: 'Discover Korean TV Shows',
            extra: [
                {
                    name: 'sort_by', isRequired: false,
                    options: {
                        'popularity.desc': '인기 프로그램',
                        'first_air_date.desc': '첫방송일 (내림차순)',
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
                {
                    name: 'page', isRequired: false
                }
            ]
        }
    ]
};

const builder = new addonBuilder(manifest);

builder.defineCatalogHandler(async (args) => {
    const sortBy = args.extra.sort_by || 'popularity.desc';
    const withGenres = args.extra.with_genres || null;
    const page = args.extra.page || 1;  // 페이지 값 반영

    console.log(`Fetching from TMDB with Sort: ${sortBy}, Genres: ${withGenres}, Page: ${page}`);

    try {
        let apiUrl = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&language=ko-KR&with_original_language=ko&sort_by=${sortBy}&page=${page}`;
        if (withGenres) {
            apiUrl += `&with_genres=${withGenres}`;
        }

        const response = await axios.get(apiUrl);
        const results = response.data.results;
        console.log(`Found ${results.length} results from TMDB API.`);

        const metas = results.map(item => ({
            id: `tmdb:${item.id}`,
            type: 'series',
            name: item.name,
            poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null
        }));

        return { metas: metas.filter(m => m.poster) };
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
        return {
            meta: {
                id: `tmdb:${item.id}`, type: 'series', name: item.name,
                poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
                background: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : null,
                description: item.overview
            }
        };
    } catch (error) {
        console.error('TMDB Meta Error:', error.message);
        return { meta: null };
    }
});

const port = process.env.PORT || 7000;
serveHTTP(builder.getInterface(), { port: port });
console.log(`TMDB Stable Filter Addon running on port ${port}`);
