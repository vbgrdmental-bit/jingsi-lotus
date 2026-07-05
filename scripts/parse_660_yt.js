const https = require('https');
const cheerio = require('cheerio');

const URL = 'https://neptuner.666forum.com/t18877-topic';

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => { resolve(data); });
        }).on('error', reject);
    });
}

async function run() {
    console.log("Fetching Episode 660 topic...");
    const html = await fetchUrl(URL);
    const $ = cheerio.load(html);
    
    console.log("=== All iFrames ===");
    $('iframe').each((i, el) => {
        console.log('iframe src:', $(el).attr('src'));
        console.log('iframe html:', $.html(el));
    });
    
    console.log("=== All links in posts ===");
    $('.postbody a').each((i, el) => {
        console.log('link:', $(el).attr('href'), $(el).text());
    });
}

run().catch(console.error);
