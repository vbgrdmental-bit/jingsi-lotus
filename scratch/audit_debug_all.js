const fs = require('fs');
const path = require('path');

const RAW_FILE = path.join(__dirname, '../data/raw_episodes.json');
const rawEpisodes = JSON.parse(fs.readFileSync(RAW_FILE, 'utf-8'));

const reportMissing = [20, 23, 67, 273, 324, 329, 342, 343, 344, 345, 346, 349, 390, 409, 524, 529, 584];

reportMissing.forEach(id => {
    const ep = rawEpisodes.find(e => e.episode_id === id);
    if (!ep) {
        console.log(`Ep ${id}: NOT FOUND`);
        return;
    }
    const summary = ep.summary || "";
    const cond1 = !summary;
    const cond2 = summary === "（本集尚無經文提綱）";
    const cond3 = summary.includes("尚無經文提綱");
    
    console.log(`Ep ${id}:`);
    console.log(`  cond1 (empty):`, cond1);
    console.log(`  cond2 (exact):`, cond2);
    console.log(`  cond3 (includes):`, cond3);
    console.log(`  Overall isMissing:`, cond1 || cond2 || cond3);
});
