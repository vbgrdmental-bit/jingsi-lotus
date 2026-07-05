const fs = require('fs');
const path = require('path');

const RAW_FILE = path.join(__dirname, '../data/raw_episodes.json');

const REPLACEMENTS = [
    // 1. Chapter Titles / Names
    { target: /靜思妙\uFFFD\uFFFD\uFFFD華/g, replacement: "靜思妙蓮華" },
    { target: /靜思妙\uFFFD\uFFFD華/g, replacement: "靜思妙蓮華" },
    { target: /靜思妙\uFFFD華/g, replacement: "靜思妙蓮華" },
    
    // 2. Sutra Names & Part Names
    { target: /《\uFFFD\uFFFD華經》/g, replacement: "《法華經》" },
    { target: /《\uFFFD華經》/g, replacement: "《法華經》" },
    { target: /【法華\uFFFD\uFFFD\uFFFD\s*序品第一】/g, replacement: "【法華經 序品第一】" },
    { target: /【法華\uFFFD\uFFFD\s*序品第一】/g, replacement: "【法華經 序品第一】" },
    { target: /【法華\uFFFD\s*序品第一】/g, replacement: "【法華經 序品第一】" },
    { target: /《法華經\uFFFD\uFFFD便品第二》/g, replacement: "《法華經 方便品第二》" },
    { target: /《法華經\uFFFD便品第二》/g, replacement: "《法華經 方便品第二》" },
    { target: /禮\uFFFD\uFFFD行向靈山法會/g, replacement: "禮拜行向靈山法會" },
    { target: /禮\uFFFD行向靈山法會/g, replacement: "禮拜行向靈山法會" },

    // 3. Common Idioms and Phrases
    { target: /生老病\uFFFD\uFFFD/g, replacement: "生老病死" },
    { target: /生老病\uFFFD/g, replacement: "生老病死" },
    { target: /佛的境\uFFFD\uFFFD/g, replacement: "佛的境界" },
    { target: /佛的境\uFFFD/g, replacement: "佛的境界" },
    { target: /感恩\uFFFD\uFFFD/g, replacement: "感恩心" },
    { target: /感恩\uFFFD/g, replacement: "感恩心" },
    { target: /大丈\uFFFD\uFFFD\uFFFD/g, replacement: "大丈夫" },
    { target: /大丈\uFFFD\uFFFD/g, replacement: "大丈夫" },
    { target: /大丈\uFFFD/g, replacement: "大丈夫" },
    { target: /激\uFFFD\uFFFD\uFFFD/g, replacement: "激動" },
    { target: /激\uFFFD\uFFFD/g, replacement: "激動" },
    { target: /激\uFFFD/g, replacement: "激動" },
    { target: /\uFFFD\uFFFD個\uFFFD\uFFFD方/g, replacement: "這個地方" },
    { target: /\uFFFD個\uFFFD方/g, replacement: "這個地方" },
    { target: /怎麼\uFFFD\uFFFD麼/g, replacement: "怎麼這麼" },
    { target: /怎麼\uFFFD麼/g, replacement: "怎麼這麼" },
    { target: /九\uFFFD\uFFFD八種/g, replacement: "九十八種" },
    { target: /九\uFFFD八種/g, replacement: "九十八種" },
    { target: /去\uFFFD\uFFFD了習氣/g, replacement: "去除了習氣" },
    { target: /去\uFFFD了習氣/g, replacement: "去除了習氣" },
    { target: /「靜思清澄」，\uFFFD\uFFFD以人人/g, replacement: "「靜思清澄」，所以人人" },
    { target: /源頭怎麼\uFFFD\uFFFD的/g, replacement: "源頭怎麼來的" },
    { target: /怎麼\uFFFD的？/g, replacement: "怎麼來的？" },
    { target: /學無窮\uFFFD\uFFFD\uFFFD/g, replacement: "學無窮無盡" },
    { target: /學無窮\uFFFD\uFFFD/g, replacement: "學無窮盡" },
    { target: /是不是很\uFFFD\uFFFD憐/g, replacement: "是不是很可憐" },
    { target: /去\uFFFD\uFFFD會到/g, replacement: "去體會到" },
    { target: /去\uFFFD會到/g, replacement: "去體會到" },
    { target: /如來\uFFFD\uFFFD/g, replacement: "如來藏" },
    { target: /如來\uFFFD/g, replacement: "如來藏" },
    { target: /菩薩\uFFFD\uFFFD所以我們/g, replacement: "菩薩，所以我們" },
    { target: /菩薩\uFFFD所以我們/g, replacement: "菩薩，所以我們" }
];

function run() {
    if (!fs.existsSync(RAW_FILE)) {
        console.error("Database file not found!");
        return;
    }

    let rawData = fs.readFileSync(RAW_FILE, 'utf-8');
    let totalReplacements = 0;

    REPLACEMENTS.forEach(rep => {
        const matches = rawData.match(rep.target);
        const count = matches ? matches.length : 0;
        if (count > 0) {
            rawData = rawData.replace(rep.target, rep.replacement);
            totalReplacements += count;
            console.log(`Replaced: ${rep.target.toString()} -> "${rep.replacement}" (${count} times)`);
        }
    });

    if (totalReplacements > 0) {
        fs.writeFileSync(RAW_FILE, rawData, 'utf-8');
        console.log(`\nSuccessfully applied ${totalReplacements} text repairs to database.`);
    } else {
        console.log("No obvious patterns to repair found.");
    }
}

run();
