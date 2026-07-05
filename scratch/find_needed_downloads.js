const fs = require('fs');
const path = require('path');

const RAW_FILE = path.join(__dirname, '../data/raw_episodes.json');
const FORUM_FILE = path.join(__dirname, '../data/forum_topics.json');
const CACHE_WEEBLY_DIR = path.join(__dirname, '../data/cache');
const CACHE_DETAIL_DIR = path.join(__dirname, '../data/cache_forum_detail');

const rawEpisodes = JSON.parse(fs.readFileSync(RAW_FILE, 'utf-8'));
const forumTopics = JSON.parse(fs.readFileSync(FORUM_FILE, 'utf-8'));

// 1. Build Weebly clean mapping
const weeblyMap = {};
if (fs.existsSync(CACHE_WEEBLY_DIR)) {
    const cheerio = require('cheerio');
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

    const weeblyFiles = fs.readdirSync(CACHE_WEEBLY_DIR).filter(f => f.startsWith('page_') && f.endsWith('.html'));
    weeblyFiles.forEach(file => {
        const html = fs.readFileSync(path.join(CACHE_WEEBLY_DIR, file), 'utf-8');
        const $ = cheerio.load(html);
        $('.blog-post').each((i, el) => {
            const titleText = $(el).find('.blog-title').text().trim();
            const meta = parseWeeblyTitle(titleText);
            if (meta.episode_id) {
                weeblyMap[meta.episode_id] = true;
            }
        });
    });
}

console.log("Episodes in Weebly Cache:", Object.keys(weeblyMap).length);

// Find which corrupted episodes need forum topics
const fffdEpisodes = rawEpisodes.filter(ep => {
    const title = ep.title || "";
    const summary = ep.summary || "";
    const fullText = ep.full_text || "";
    return title.includes('\uFFFD') || summary.includes('\uFFFD') || fullText.includes('\uFFFD');
});

console.log("Total corrupted episodes:", fffdEpisodes.length);

let coveredByWeebly = 0;
const neededForumTopics = [];

fffdEpisodes.forEach(ep => {
    const id = ep.episode_id;
    if (weeblyMap[id]) {
        coveredByWeebly++;
    } else {
        // Need forum topic
        const topics = forumTopics.filter(t => t.episode_id === id);
        topics.forEach(t => {
            const topicId = t.href.match(/\/t(\d+)-topic/)[1];
            neededForumTopics.push({
                episode_id: id,
                topicId: topicId,
                href: t.href
            });
        });
    }
});

console.log("Corrupted episodes covered by Weebly (can be healed from Weebly cache):", coveredByWeebly);
console.log("Corrupted episodes that MUST be healed from Forum:", fffdEpisodes.length - coveredByWeebly);
console.log("Total forum topics that need downloading:", neededForumTopics.length);
if (neededForumTopics.length > 0) {
    console.log("First 10 needed forum topics:", neededForumTopics.slice(0, 10));
}
