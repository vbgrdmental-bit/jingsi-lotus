const fs = require('fs');
const path = require('path');

const METADATA_FILE = path.join(__dirname, '../data/metadata.json');
if (fs.existsSync(METADATA_FILE)) {
    const meta = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf-8'));
    console.log("Metadata keys:", Object.keys(meta));
    console.log("Metadata length:", Array.isArray(meta) ? meta.length : Object.keys(meta).length);
    if (Array.isArray(meta) && meta.length > 0) {
        console.log("First element:", meta[0]);
    } else {
        const keys = Object.keys(meta);
        console.log("First key element:", meta[keys[0]]);
    }
} else {
    console.log("metadata.json does not exist");
}
