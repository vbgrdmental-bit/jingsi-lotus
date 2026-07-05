const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const RAW_FILE = path.join(__dirname, '../data/raw_episodes.json');

if (!fs.existsSync(RAW_FILE)) {
    console.error("raw_episodes.json not found.");
    process.exit(1);
}

function cleanEpisodeTitle(title) {
    if (!title) return '';
    let clean = title.trim();
    // 1. Remove date prefix (e.g. 20130319, 2013/03/19, 2013-03-19)
    clean = clean.replace(/^\d{4}[\/\-]?\d{2}[\/\-]?\d{2}\s*/, '');
    clean = clean.replace(/^\d{8}\s*/, '');
    clean = clean.replace(/^\d+\s*/, '');
    
    // 2. Remove program name variants
    clean = clean.replace(/[《【]靜思妙蓮華[》】]/g, '');
    clean = clean.replace(/[《【]靜思晨語[》】]/g, '');
    clean = clean.replace(/靜思晨語‧法華經/g, '');
    clean = clean.replace(/靜思妙蓮華/g, '');
    
    // 3. Remove episode markers
    clean = clean.replace(/\(第\s*\d+\s*集\)/g, '');
    clean = clean.replace(/第\s*\d+\s*集/g, '');
    clean = clean.replace(/\(第\s*\d+\s*\)/g, '');
    
    // 4. Remove chapter names in parentheses
    clean = clean.replace(/（法華經·[^（）]+）/g, '');
    clean = clean.replace(/（[^（）]*品[^（）]*）/g, '');
    clean = clean.replace(/\([^()]*品[^()]*\)/g, '');
    clean = clean.replace(/【[^【】]*品[^【】]*】/g, '');
    
    // 5. Remove empty parentheses of any kind (possibly left over)
    clean = clean.replace(/（\s*）/g, '');
    clean = clean.replace(/\(\s*\)/g, '');
    clean = clean.replace(/\[\s*\]/g, '');
    clean = clean.replace(/【\s*】/g, '');
    
    // 6. Clean remaining leading/trailing symbols
    clean = clean.replace(/^[\s_—\-:\/·⊙+》«<>《」「】「」『』☉*()（）]+|[\s_—\-:\/·⊙+》«<>《」「】「」『』☉*()（）]+$/g, '').trim();
    return clean;
}

try {
    const rawEpisodes = JSON.parse(fs.readFileSync(RAW_FILE, 'utf-8'));
    console.log(`Loaded ${rawEpisodes.length} episodes for cleaning.`);

    let ytCorrectionCount = 0;
    let outlineExtractionCount = 0;
    let titleRecoveryCount = 0;

    rawEpisodes.forEach(ep => {
        // 3. Recover empty/invalid titles from full_text
        if ((!ep.title || ep.title.trim() === '' || ep.title.trim() === '-') && ep.full_text) {
            const firstLine = ep.full_text.split('\n')[0].trim();
            const cleanTitle = cleanEpisodeTitle(firstLine);
            if (cleanTitle && cleanTitle.length > 1) {
                ep.title = cleanTitle;
                titleRecoveryCount++;
                console.log(`Episode ${ep.episode_id}: Recovered empty title: "${cleanTitle}"`);
            }
        }

        // 2. Extract embedded outlines from full_text
        if ((!ep.summary || ep.summary.trim() === '') && ep.full_text) {
            const lines = ep.full_text.split('\n');
            const summaryLines = [];
            const remainingLines = [];
            let inOutlineHeader = true;

            lines.forEach(line => {
                const trimmed = line.trim();
                
                // If we reach the sermon start marker, we stop extracting the outline
                if (trimmed.includes('【證嚴上人開示】') || 
                    trimmed.includes('【證嚴法師開示】') || 
                    trimmed.includes('證嚴上人開示') || 
                    trimmed.includes('證嚴法師開示')) {
                    inOutlineHeader = false;
                }

                if (inOutlineHeader) {
                    // Extract if it starts with Tzu Chi outline symbols
                    if (trimmed.startsWith('⊙') || trimmed.startsWith('☉') || trimmed.startsWith('※') || trimmed.startsWith('•')) {
                        const cleanedLine = trimmed.replace(/^[⊙☉※•]\s*/, '').trim();
                        if (cleanedLine) {
                            summaryLines.push(cleanedLine);
                        }
                    } else {
                        // Keep non-bullet header lines in transcript for now, or skip
                        remainingLines.push(line);
                    }
                } else {
                    remainingLines.push(line);
                }
            });

            if (summaryLines.length > 0) {
                ep.summary = summaryLines.join('\n');
                ep.full_text = remainingLines.join('\n').trim();
                outlineExtractionCount++;
            }
        }
    });

    console.log(`=== Data Cleaning Summary ===`);
    console.log(`- YouTube links corrected: ${ytCorrectionCount}`);
    console.log(`- Outlines extracted from transcripts: ${outlineExtractionCount}`);
    console.log(`- Empty titles recovered: ${titleRecoveryCount}`);

    // Save back to raw_episodes.json
    fs.writeFileSync(RAW_FILE, JSON.stringify(rawEpisodes, null, 2), 'utf-8');
    console.log(`Saved cleaned database to ${RAW_FILE}.`);

    // Run export.js to re-compile the frontend chunk files
    console.log("Running scripts/export.js to recompile database chunks...");
    const output = execSync('node scripts/export.js', { encoding: 'utf-8' });
    console.log(output);

} catch (err) {
    console.error("Error during data cleaning:", err);
}
