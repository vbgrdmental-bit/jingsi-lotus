const https = require('https');

const url = 'https://neptuner.666forum.com/t17171-topic';
const options = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
};

https.get(url, options, (res) => {
    const chunks = [];
    res.on('data', (chunk) => { chunks.push(chunk); });
    res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const html = buffer.toString('utf-8');
        
        // Find index of "佛於因中悟"
        const idx = html.indexOf('佛於因中悟');
        if (idx !== -1) {
            console.log("Found: ", html.substring(idx, idx + 40));
        } else {
            console.log("Could not find '佛於因中悟'");
        }
        
        // Count total FFFDs
        const fffdCount = (html.match(/\uFFFD/g) || []).length;
        console.log(`Total FFFDs with Buffer.concat: ${fffdCount}`);
    });
}).on('error', (err) => {
    console.error("Error:", err);
});
