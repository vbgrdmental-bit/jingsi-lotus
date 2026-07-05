const fs = require('fs');
const path = require('path');
const https = require('https');

const CACHE_DETAIL_DIR = path.join(__dirname, '../data/cache_forum_detail');
const urls = [
    { topicId: '11348', url: 'https://neptuner.666forum.com/t11348-topic' },
    { topicId: '18965', url: 'https://neptuner.666forum.com/t18965-topic' }
];

const download = (item) => {
    return new Promise((resolve) => {
        const filePath = path.join(CACHE_DETAIL_DIR, `topic_${item.topicId}.html`);
        console.log(`Downloading Topic ${item.topicId} from ${item.url}...`);
        
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        };

        https.get(item.url, options, (res) => {
            if (res.statusCode !== 200) {
                console.error(`  Failed with status: ${res.statusCode}`);
                resolve(false);
                return;
            }
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                const html = Buffer.concat(chunks).toString('utf-8');
                if (html.includes('429 Too Many Requests') || html.length < 5000) {
                    console.error(`  Received invalid content (length: ${html.length})`);
                    resolve(false);
                } else {
                    fs.writeFileSync(filePath, html, 'utf-8');
                    console.log(`  Successfully saved! Size: ${html.length}`);
                    resolve(true);
                }
            });
        }).on('error', (err) => {
            console.error(`  Error: ${err.message}`);
            resolve(false);
        });
    });
};

const run = async () => {
    for (const item of urls) {
        let success = await download(item);
        if (!success) {
            console.log("  Retrying in 5 seconds...");
            await new Promise(r => setTimeout(r, 5000));
            await download(item);
        }
        await new Promise(r => setTimeout(r, 3000)); // 3s polite gap
    }
    console.log("Done!");
};

run();
