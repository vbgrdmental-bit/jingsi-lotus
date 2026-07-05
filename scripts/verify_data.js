const fs = require('fs');
const path = require('path');

const RAW_FILE = path.join(__dirname, '../data/raw_episodes.json');

if (!fs.existsSync(RAW_FILE)) {
    console.error(`Data file not found at: ${RAW_FILE}`);
    process.exit(1);
}

try {
    const rawEpisodes = JSON.parse(fs.readFileSync(RAW_FILE, 'utf-8'));
    console.log(`=== DATA INTEGRITY REPORT ===`);
    console.log(`Total episodes found: ${rawEpisodes.length}`);
    
    if (rawEpisodes.length === 0) {
        console.error("Error: Database is empty!");
        process.exit(1);
    }

    const minId = rawEpisodes[0].episode_id;
    const maxId = rawEpisodes[rawEpisodes.length - 1].episode_id;
    console.log(`Episode range in database: 第 ${minId} 集 ~ 第 ${maxId} 集`);

    // 1. Check for missing episode numbers (gaps)
    const allIds = new Set(rawEpisodes.map(ep => ep.episode_id));
    const missingIds = [];
    for (let i = minId; i <= maxId; i++) {
        if (!allIds.has(i)) {
            missingIds.push(i);
        }
    }
    console.log(`Missing episode gaps in range [${minId}-${maxId}]: ${missingIds.length} episodes`);
    if (missingIds.length > 0) {
        console.log(`  First 10 missing episode IDs:`, missingIds.slice(0, 10));
    }

    // 2. Check for missing fields
    let missingYt = 0;
    let missingSummary = 0;
    let missingFullText = 0;
    let missingDate = 0;

    const sampleMissingYt = [];
    const sampleMissingText = [];

    rawEpisodes.forEach(ep => {
        if (!ep.youtube_url) {
            missingYt++;
            if (sampleMissingYt.length < 5) sampleMissingYt.push(ep.episode_id);
        }
        if (!ep.summary || ep.summary.trim() === '') {
            missingSummary++;
        }
        if (!ep.full_text || ep.full_text.trim() === '') {
            missingFullText++;
            if (sampleMissingText.length < 5) sampleMissingText.push(ep.episode_id);
        }
        if (!ep.raw_date) {
            missingDate++;
        }
    });

    console.log(`Missing YouTube URLs: ${missingYt} episodes`);
    if (missingYt > 0) {
        console.log(`  Sample episodes missing YT:`, sampleMissingYt);
    }

    console.log(`Missing Outlines (summary): ${missingSummary} episodes`);
    console.log(`Missing Full Transcripts: ${missingFullText} episodes`);
    if (missingFullText > 0) {
        console.log(`  Sample episodes missing transcript:`, sampleMissingText);
    }
    console.log(`Missing Broadcast Dates: ${missingDate} episodes`);

    console.log(`=============================`);
    
} catch (err) {
    console.error("Verification failed", err);
}
