const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../data/raw_episodes.json');
const rawEpisodes = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
const notesOnlyEpisodes = [16, 17, 19, 20, 23, 29];

notesOnlyEpisodes.forEach(id => {
    const ep = rawEpisodes.find(e => e.episode_id === id);
    if (ep) {
        console.log(`Ep ${id}: is_edited = ${ep.is_edited}, summary length = ${ep.summary ? ep.summary.length : 0}, fullText length = ${ep.full_text ? ep.full_text.length : 0}`);
    } else {
        console.log(`Ep ${id}: Not found`);
    }
});
