const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const RAW_FILE = path.join(__dirname, '../data/raw_episodes.json');
const FORUM_FILE = path.join(__dirname, '../data/forum_topics.json');
const CACHE_DETAIL_DIR = path.join(__dirname, '../data/cache_forum_detail');

const rawEpisodes = JSON.parse(fs.readFileSync(RAW_FILE, 'utf-8'));
const forumTopics = JSON.parse(fs.readFileSync(FORUM_FILE, 'utf-8'));

const targets = [700, 1139, 1199, 1828];

targets.forEach(id => {
    const ep = rawEpisodes.find(e => e.episode_id === id);
    const topics = forumTopics.filter(t => t.episode_id === id);
    console.log(`\n================ EPISODE ${id} ================`);
    console.log(`DB Title: "${ep.title}"`);
    console.log(`DB Summary length: ${ep.summary ? ep.summary.length : 0}`);
    console.log(`DB FullText length: ${ep.full_text ? ep.full_text.length : 0}`);
    console.log(`DB YouTube: ${ep.youtube_url}`);
    
    topics.forEach(t => {
        const topicId = t.href.match(/\/t(\d+)-topic/)[1];
        const cacheFile = path.join(CACHE_DETAIL_DIR, `topic_${topicId}.html`);
        const exists = fs.existsSync(cacheFile);
        let titleFffd = t.title.includes('\uFFFD');
        let cacheFffd = false;
        let cacheSize = 0;
        let parsedTitle = '';
        
        if (exists) {
            const html = fs.readFileSync(cacheFile, 'utf-8');
            cacheSize = html.length;
            cacheFffd = html.includes('\uFFFD');
            const $ = cheerio.load(html);
            // Get first post text
            const firstPost = $('.postbody').first().text().trim();
            parsedTitle = firstPost.substring(0, 150).replace(/\n/g, ' ');
        }
        
        console.log(`  Topic ${topicId}:`);
        console.log(`    Mapped Title: "${t.title}" (hasFffd: ${titleFffd})`);
        console.log(`    Cache File Exists: ${exists} (size: ${cacheSize}, hasFffd: ${cacheFffd})`);
        if (exists) {
            console.log(`    Cache Title Preview: "${parsedTitle.substring(0, 100)}"`);
        }
    });
});
