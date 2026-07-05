const fs = require('fs');
const path = require('path');

const metaPath = path.join(__dirname, '../data/metadata.json');
const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
console.log(meta.chapters);
