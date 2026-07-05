const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../data/raw_episodes.json');
const rawEpisodes = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
const ep273 = rawEpisodes.find(e => e.episode_id === 273);
console.log("ep273 title:", ep273.title);
console.log("ep273 summary:", JSON.stringify(ep273.summary));
console.log("ep273 is_edited:", ep273.is_edited);
