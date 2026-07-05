const fs = require('fs');
const path = require('path');

const RAW_FILE = path.join(__dirname, '../data/raw_episodes.json');
const rawEpisodes = JSON.parse(fs.readFileSync(RAW_FILE, 'utf-8'));

const resolvedLinks = {
    // Batch 1
    820: "https://www.youtube.com/watch?v=h2f82QtLIx0",
    823: "https://www.youtube.com/watch?v=N84NKRRmjbY",
    825: "https://www.youtube.com/watch?v=yy94XCr994k",
    829: "https://www.youtube.com/watch?v=I074-5jF_v8",
    831: "https://www.youtube.com/watch?v=uN0sifAkTZk",
    834: "https://www.youtube.com/watch?v=xHM_rZoBAh0",
    835: "https://www.youtube.com/watch?v=GqXeDSmyTuE",

    // Batch 2
    836: "https://www.youtube.com/watch?v=fneVMAcvPe0",
    837: "https://www.youtube.com/watch?v=cOesQ4eO5v0",
    839: "https://www.youtube.com/watch?v=Z48MoMu-glg",
    840: "https://www.youtube.com/watch?v=P0yNYfq2Drk",
    841: "https://www.youtube.com/watch?v=MlLeo-eult4",
    845: "https://www.youtube.com/watch?v=7XExhn8tNSI",
    848: "https://www.youtube.com/watch?v=QMN66JB4ju4",
    850: "https://www.youtube.com/watch?v=vhcpLsnTQI0",
    857: "https://www.youtube.com/watch?v=dw7K2ndiTZk",
    859: "https://www.youtube.com/watch?v=3vSq3PYYfHU",

    // Batch 3
    1400: "https://www.youtube.com/watch?v=sO45K3yIA-k",
    1401: "https://www.youtube.com/watch?v=MH38tfN76dI",
    1489: "https://www.youtube.com/watch?v=WJ2NnuDQ2A4",
    1557: "https://www.youtube.com/watch?v=rbYOKL3bwuk",
    1558: "https://www.youtube.com/watch?v=Ce6XWAp7HV4",
    1578: "https://www.youtube.com/watch?v=aYRAnTj2BDM",
    1647: "https://www.youtube.com/watch?v=yBuPjQL7Cg4",
    1686: "https://www.youtube.com/watch?v=k3vIJMO-TME"
};

let count = 0;
for (const [epIdStr, url] of Object.entries(resolvedLinks)) {
    const epId = parseInt(epIdStr, 10);
    const ep = rawEpisodes.find(e => e.episode_id === epId);
    if (ep) {
        if (ep.youtube_url !== url) {
            console.log(`Updating Ep ${epId}: ${ep.youtube_url} -> ${url}`);
            ep.youtube_url = url;
            count++;
        }
    }
}

if (count > 0) {
    fs.writeFileSync(RAW_FILE, JSON.stringify(rawEpisodes, null, 2), 'utf-8');
    console.log(`Successfully updated ${count} episodes in raw_episodes.json!`);
} else {
    console.log("No episodes needed updates.");
}
