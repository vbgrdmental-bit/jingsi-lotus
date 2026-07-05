const fs = require('fs');
const path = require('path');

const RAW_FILE = path.join(__dirname, '../data/raw_episodes.json');
const rawEpisodes = JSON.parse(fs.readFileSync(RAW_FILE, 'utf-8'));

rawEpisodes.forEach(ep => {
    const id = ep.episode_id;
    const title = ep.title || "";
    const summary = ep.summary || "";
    const fullText = ep.full_text || "";
    
    const titleFffd = title.includes('\uFFFD');
    const summaryFffd = summary.includes('\uFFFD');
    const fullTextFffd = fullText.includes('\uFFFD');
    if (titleFffd || summaryFffd || fullTextFffd) {
        console.log(`Episode ${id} has FFFD!`, {
            titleFffd,
            summaryFffd,
            fullTextFffd,
            title,
            summary: summary.substring(0, 100),
            fullTextLength: fullText.length
        });
    }
});
