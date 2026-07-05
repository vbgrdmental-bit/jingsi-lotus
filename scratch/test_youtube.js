const https = require('https');

const options = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7'
    }
};

https.get('https://www.youtube.com/watch?v=0g4q9NGndxI', options, (res) => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => {
        // Find playabilityStatus
        const idx = body.indexOf('playabilityStatus');
        if (idx !== -1) {
            console.log('Found playabilityStatus near index:', idx);
            console.log(body.substring(idx - 20, idx + 150));
        } else {
            console.log('playabilityStatus NOT found.');
        }

        const titleMatch = body.match(/<title>([^<]+)<\/title>/);
        console.log('HTML Title:', titleMatch ? titleMatch[1] : 'not found');
        
        // Let's see if the video is unavailable
        const unavailable = body.includes('video-unavailable') || 
                            body.includes('Video unavailable') || 
                            body.includes('This video is private') ||
                            body.includes('This video is unavailable');
        console.log('Unavailable keywords check:', unavailable);
    });
}).on('error', err => console.error(err));
