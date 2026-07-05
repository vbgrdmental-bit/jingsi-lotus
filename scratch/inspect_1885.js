const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../data/raw_episodes.json');
const rawEpisodes = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
const ep1885 = rawEpisodes.find(e => e.episode_id === 1885);
if (ep1885) {
    console.log("ep1885 title:", ep1885.title);
    console.log("ep1885 summary:", JSON.stringify(ep1885.summary));
} else {
    console.log("ep1885 not found in DB");
}
