const fs = require('fs');
const path = require('path');

const RAW_FILE = path.join(__dirname, '../data/raw_episodes.json');

function run() {
    if (!fs.existsSync(RAW_FILE)) {
        console.error(`Raw file not found: ${RAW_FILE}`);
        return;
    }

    const rawEpisodes = JSON.parse(fs.readFileSync(RAW_FILE, 'utf-8'));
    
    const updates = {
        211: "https://www.youtube.com/watch?v=X3RR9CtmkzA",
        351: "https://www.youtube.com/watch?v=S4S3kpoeh9o",
        1849: "https://www.youtube.com/watch?v=JnL89rMy5pg",
        1855: "https://www.youtube.com/watch?v=PFtae_kyRN8"
    };
    
    let updatedCount = 0;
    
    rawEpisodes.forEach(ep => {
        const id = ep.episode_id;
        if (updates[id]) {
            ep.youtube_url = updates[id];
            updatedCount++;
            console.log(`Updated Episode ${id} with YouTube URL: ${updates[id]}`);
        }
    });
    
    if (updatedCount > 0) {
        fs.writeFileSync(RAW_FILE, JSON.stringify(rawEpisodes, null, 2), 'utf-8');
        console.log(`Successfully saved raw_episodes.json.`);
        
        // Recompile
        try {
            const exportScript = require('./export.js');
            exportScript.run();
            console.log("Database successfully compiled with updated YouTube URLs!");
        } catch (err) {
            console.error("Compilation failed:", err.message);
        }
    } else {
        console.log("No episodes matched the update checklist.");
    }
}

run();
