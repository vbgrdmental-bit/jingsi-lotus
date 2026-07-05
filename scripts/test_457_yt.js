const https = require('https');
const cheerio = require('cheerio');

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
    const urls = [
        { year: 2014, url: 'https://neptuner.666forum.com/t9649-topic' },
        { year: 2020, url: 'https://neptuner.666forum.com/t18374-topic' }
    ];

    for (const item of urls) {
        console.log(`Fetching ${item.year} topic: ${item.url}`);
        const html = await fetchUrl(item.url);
        const $ = cheerio.load(html);
        $('iframe').each((i, el) => {
            const src = $(el).attr('src');
            if (src && src.includes('youtube')) {
                console.log(`  -> YouTube Embed: ${src}`);
            }
        });
    }
}

run().catch(console.error);
