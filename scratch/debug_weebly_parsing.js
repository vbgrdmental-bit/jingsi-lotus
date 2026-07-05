const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const CACHE_WEEBLY_DIR = path.join(__dirname, '../data/cache');
const files = fs.readdirSync(CACHE_WEEBLY_DIR).filter(f => f.startsWith('page_') && f.endsWith('.html'));

const parseWeeblyTitle = (titleText) => {
    const decoded = titleText.trim();
    let epMatch = decoded.match(/第\s*(\d+)\s*集/);
    let episode_id = epMatch ? parseInt(epMatch[1], 10) : null;
    if (!episode_id) {
        const altMatch = decoded.match(/^(\d{4,12})-(\d+)/);
        if (altMatch) episode_id = parseInt(altMatch[2], 10);
    }
    return { episode_id };
};

let totalEpisodes = 0;
const emptyFiles = [];

files.forEach(file => {
    const html = fs.readFileSync(path.join(CACHE_WEEBLY_DIR, file), 'utf-8');
    const $ = cheerio.load(html);
    const posts = $('.blog-post');
    let fileEps = 0;
    posts.each((i, el) => {
        const titleText = $(el).find('.blog-title').text().trim();
        const meta = parseWeeblyTitle(titleText);
        if (meta.episode_id) {
            fileEps++;
        }
    });
    totalEpisodes += fileEps;
    if (fileEps === 0) {
        emptyFiles.push(file);
    }
    console.log(`File ${file}: parsed ${fileEps} episodes (posts: ${posts.length})`);
});

console.log("Total parsed episodes:", totalEpisodes);
console.log("Empty files:", emptyFiles);
