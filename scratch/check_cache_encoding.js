const fs = require('fs');
const path = require('path');

const FORUM_FILE = path.join(__dirname, '../data/forum_topics.json');
const CACHE_DIR = path.join(__dirname, '../data/cache_forum_detail');

const forumTopics = JSON.parse(fs.readFileSync(FORUM_FILE, 'utf-8'));

// Find topics for episode 4, 10, 12
const targetIds = [4, 10, 12];
const targets = forumTopics.filter(t => targetIds.includes(t.episode_id));

console.log("Found topics:", targets);

targets.forEach(t => {
    const topicIdMatch = t.href.match(/\/t(\d+)-topic/);
    if (!topicIdMatch) return;
    const topicId = topicIdMatch[1];
    const cacheFile = path.join(CACHE_DIR, `topic_${topicId}.html`);
    if (fs.existsSync(cacheFile)) {
        console.log(`Cache file exists for topic ${topicId}: ${cacheFile}`);
        const stat = fs.statSync(cacheFile);
        console.log(`Size: ${stat.size} bytes`);
        
        // Read file contents as binary/buffer and utf-8 to see if FFFD is already there
        const content = fs.readFileSync(cacheFile, 'utf-8');
        const fffdCount = (content.match(/\uFFFD/g) || []).length;
        console.log(`FFFD count in cached HTML: ${fffdCount}`);
    } else {
        console.log(`Cache file does not exist for topic ${topicId}`);
    }
});
