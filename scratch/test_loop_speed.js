const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const CACHE_WEEBLY_DIR = path.join(__dirname, '../data/cache');
const files = fs.readdirSync(CACHE_WEEBLY_DIR).filter(f => f.startsWith('page_') && f.endsWith('.html'));

console.log("Found files:", files.length);

const sortedPageNums = files
    .map(f => parseInt(f.match(/page_(\d+)\.html/)[1], 10))
    .sort((a, b) => a - b);

const startTotal = Date.now();
for (const pageNum of sortedPageNums) {
    const start = Date.now();
    const filePath = path.join(CACHE_WEEBLY_DIR, `page_${pageNum}.html`);
    const html = fs.readFileSync(filePath, 'utf-8');
    const readTime = Date.now() - start;
    
    const startCheerio = Date.now();
    const $ = cheerio.load(html);
    const cheerioTime = Date.now() - startCheerio;
    
    console.log(`Page ${pageNum}: Read: ${readTime}ms, Cheerio: ${cheerioTime}ms`);
}
console.log(`Total loop time: ${Date.now() - startTotal}ms`);
