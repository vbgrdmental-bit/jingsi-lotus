const fs = require('fs');
const path = require('path');

const RAW_FILE = path.join(__dirname, '../data/raw_episodes.json');
const rawEpisodes = JSON.parse(fs.readFileSync(RAW_FILE, 'utf-8'));

const reportMissing = [20, 23, 67, 273, 324, 329, 342, 343, 344, 345, 346, 349, 390, 409, 524, 529, 584];

reportMissing.forEach(id => {
    const ep = rawEpisodes.find(e => e.episode_id === id);
    if (ep) {
        console.log(`Ep ${id}:`);
        console.log(`  Summary:`, JSON.stringify(ep.summary));
    } else {
        console.log(`Ep ${id} not found in DB`);
    }
});
