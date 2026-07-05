const fs = require('fs');
const path = require('path');

const RAW_FILE = path.join(__dirname, '../data/raw_episodes.json');
const DUMP_FILE = path.join(__dirname, '../scratch/gibberish_dump.txt');

function run() {
    if (!fs.existsSync(RAW_FILE)) {
        console.error("Missing file!");
        return;
    }

    const data = JSON.parse(fs.readFileSync(RAW_FILE, 'utf-8'));
    let out = [];

    data.forEach(ep => {
        const id = ep.episode_id;
        
        const check = (text, field) => {
            if (!text) return;
            let idx = 0;
            while (true) {
                idx = text.indexOf('\uFFFD', idx);
                if (idx === -1) break;
                
                // Extract 20 chars before and after
                const start = Math.max(0, idx - 20);
                const end = Math.min(text.length, idx + 20);
                const context = text.substring(start, end).replace(/\n/g, '\\n');
                
                out.push(`Ep ${id} [${field}]: ...${context}...`);
                
                // Skip past consecutive FFFDs
                while(text[idx] === '\uFFFD') {
                    idx++;
                }
            }
        };

        check(ep.title, 'Title');
        check(ep.summary, 'Summary');
        check(ep.full_text, 'FullText');
    });

    // Ensure parent directory exists
    const dir = path.dirname(DUMP_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(DUMP_FILE, out.join('\n'), 'utf-8');
    console.log(`Extracted ${out.length} occurrences to ${DUMP_FILE}`);
}

run();
