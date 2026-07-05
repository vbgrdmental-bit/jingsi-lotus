const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const filePath = path.join(__dirname, '../data/cache_forum_detail/topic_8963.html');

function htmlToText(html) {
    if (!html) return '';
    let text = html.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/p>/gi, '\n').replace(/<\/div>/gi, '\n');
    const $ = cheerio.load(text);
    return $.text().trim();
}

if (fs.existsSync(filePath)) {
    const htmlContent = fs.readFileSync(filePath, 'utf-8');
    const $ = cheerio.load(htmlContent);
    console.log("Number of postbodies:", $('.postbody').length);
    $('.postbody').each((i, el) => {
        const html = $(el).html() || '';
        const text = htmlToText(html);
        console.log(`\nPost ${i}:`);
        console.log(`  Length: ${text.length}`);
        console.log(`  Has "上人開示": ${text.includes('上人開示')}`);
        console.log(`  Preview (first 500 chars):`);
        console.log(text.substring(0, 500));
    });
} else {
    console.log("File not found!");
}
