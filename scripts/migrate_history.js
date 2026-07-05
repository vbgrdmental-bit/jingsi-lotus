const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../data/raw_episodes.json');

function migrate() {
    if (!fs.existsSync(dbPath)) {
        console.error("Database file not found:", dbPath);
        return;
    }

    const rawEpisodes = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    let migratedCount = 0;

    rawEpisodes.forEach(ep => {
        if (ep.is_edited) {
            if (!ep.edit_history) {
                // Determine mode of legacy edit
                // If it was a notesOnly episode and was edited, it might be full_text or summary.
                // We default to 'summary' for safety if not sure, or check fields.
                const mode = (ep.episode_id === 164 || ep.episode_id === 166 || ep.episode_id === 367 || ep.episode_id === 1762) ? 'full_text' : 'summary';
                
                ep.edit_history = [{
                    date: ep.edited_date || '2026/07/01',
                    author: ep.edited_by || '管理員',
                    mode: mode
                }];
                migratedCount++;
            }
        }
    });

    if (migratedCount > 0) {
        fs.writeFileSync(dbPath, JSON.stringify(rawEpisodes, null, 2), 'utf-8');
        console.log(`Successfully migrated ${migratedCount} episodes to include edit_history!`);
        
        // Recompile
        try {
            const exportScript = require('./export.js');
            exportScript.run();
            console.log("Database successfully recompiled.");
        } catch (err) {
            console.error("Recompilation failed:", err.message);
        }
    } else {
        console.log("No episodes needed history migration.");
    }
}

migrate();
