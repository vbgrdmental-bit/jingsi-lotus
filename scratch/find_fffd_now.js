const fs = require('fs');
const path = require('path');

const RAW_FILE = path.join(__dirname, '../data/raw_episodes.json');
const rawEpisodes = JSON.parse(fs.readFileSync(RAW_FILE, 'utf-8'));

console.log("Total episodes:", rawEpisodes.length);

const fffdEpisodes = [];

rawEpisodes.forEach(ep => {
    const id = ep.episode_id;
    const title = ep.title || "";
    const summary = ep.summary || "";
    const fullText = ep.full_text || "";
    
    const titleFffd = title.includes('\uFFFD');
    const summaryFffd = summary.includes('\uFFFD');
    const fullTextFffd = fullText.includes('\uFFFD');
    
    if (titleFffd || summaryFffd || fullTextFffd) {
        fffdEpisodes.push({
            id,
            titleFffd,
            summaryFffd,
            fullTextFffd,
            title: title.substring(0, 30),
            summaryLength: summary.length,
            fullTextLength: fullText.length
        });
    }
});

console.log("Episodes with FFFD now:", fffdEpisodes.length);
if (fffdEpisodes.length > 0) {
    console.log("First 20 episodes with FFFD:", fffdEpisodes.slice(0, 20));
}
