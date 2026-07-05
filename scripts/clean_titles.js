const fs = require('fs');
const path = require('path');

const RAW_FILE = path.join(__dirname, '../data/raw_episodes.json');

function run() {
    if (!fs.existsSync(RAW_FILE)) {
        console.error(`Raw file not found: ${RAW_FILE}`);
        return;
    }

    const rawEpisodes = JSON.parse(fs.readFileSync(RAW_FILE, 'utf-8'));
    let updatedCount = 0;
    
    rawEpisodes.forEach(ep => {
        // We target Chapter 1 & 2 episodes (IDs 1 to 456)
        if (ep.episode_id >= 1 && ep.episode_id <= 456) {
            const orig = ep.title;
            // Strip any (法華經·方便品第二 or （法華經·方便品第二 prefix/suffix
            ep.title = ep.title.replace(/[（\(]法華經.*/g, '').trim();
            if (orig !== ep.title) {
                updatedCount++;
                console.log(`Cleaned Episode ${ep.episode_id} title: "${orig}" -> "${ep.title}"`);
            }
        }
    });
    
    if (updatedCount > 0) {
        fs.writeFileSync(RAW_FILE, JSON.stringify(rawEpisodes, null, 2), 'utf-8');
        console.log(`Successfully saved raw_episodes.json.`);
        
        // Recompile
        try {
            const exportScript = require('./export.js');
            exportScript.run();
            console.log("Database successfully compiled with cleaned titles!");
        } catch (err) {
            console.error("Compilation failed:", err.message);
        }
    } else {
        console.log("No titles matched the cleanup criteria.");
    }
}

run();
