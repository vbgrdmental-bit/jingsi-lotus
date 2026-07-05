const fs = require('fs');
const path = require('path');

const RAW_FILE = path.join(__dirname, '../data/raw_episodes.json');
const rawEpisodes = JSON.parse(fs.readFileSync(RAW_FILE, 'utf-8'));

const ids = [820, 823, 825, 829, 831, 834, 835];
ids.forEach(id => {
    const ep = rawEpisodes.find(e => e.episode_id === id);
    console.log(`Ep ${id}: ${ep ? ep.youtube_url : 'Not found'}`);
});
