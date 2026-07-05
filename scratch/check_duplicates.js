const fs = require('fs');
const path = require('path');

const RAW_FILE = path.join(__dirname, '../data/raw_episodes.json');
const rawEpisodes = JSON.parse(fs.readFileSync(RAW_FILE, 'utf-8'));

const eps324 = rawEpisodes.filter(e => e.episode_id === 324);
console.log("Number of entries for Ep 324:", eps324.length);
eps324.forEach((ep, i) => {
    console.log(`Entry ${i+1}:`);
    console.log(`  Title:`, ep.title);
    console.log(`  Summary length:`, ep.summary ? ep.summary.length : 0);
    console.log(`  Summary:`, JSON.stringify(ep.summary));
});
