const fs = require('fs');
const path = require('path');
const https = require('https');

const RAW_FILE = path.join(__dirname, '../data/raw_episodes.json');
const REPORT_FILE = path.join(__dirname, '../data_audit_report.md');
const CACHE_FILE = path.join(__dirname, '../data/cache_video_audit.json');

// Concurrency limit for HTTP requests to prevent rate limiting
const CONCURRENCY = 5; // Reduced concurrency to be gentler
const DELAY_MS = 50; // Small delay between launches to prevent spike traffic

// Load audit cache
let auditCache = {};
if (fs.existsSync(CACHE_FILE)) {
    try {
        auditCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    } catch (e) {
        console.warn("Could not load video audit cache, starting empty.");
    }
}

function saveCache() {
    try {
        fs.writeFileSync(CACHE_FILE, JSON.stringify(auditCache, null, 2), 'utf-8');
    } catch (e) {
        console.error("Failed to write video audit cache:", e.message);
    }
}

function getYoutubeId(url) {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s\?]+)/);
    return match ? match[1] : null;
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Check a single video availability via oEmbed with caching
function checkVideoStatus(url) {
    return new Promise((resolve) => {
        if (!url) {
            resolve({ available: false, reason: "無影片網址" });
            return;
        }
        
        const ytId = getYoutubeId(url);
        if (!ytId) {
            resolve({ available: false, reason: `無法解析影片ID: ${url}` });
            return;
        }

        // Cache hit check (valid for 10 days if available)
        const cacheEntry = auditCache[ytId];
        const CACHE_TTL = 10 * 24 * 60 * 60 * 1000;
        if (cacheEntry && (Date.now() - cacheEntry.timestamp < CACHE_TTL) && cacheEntry.available) {
            resolve(cacheEntry);
            return;
        }

        const checkUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${ytId}&format=json`;
        
        https.get(checkUrl, (res) => {
            let status = { available: false, reason: "", timestamp: Date.now() };
            if (res.statusCode === 200) {
                status.available = true;
            } else if (res.statusCode === 401) {
                status.reason = "私人影片 / 非公開";
            } else if (res.statusCode === 404) {
                status.reason = "影片不存在 / 已刪除";
            } else {
                status.reason = `HTTP 狀態碼 ${res.statusCode}`;
            }

            // Save to cache
            auditCache[ytId] = status;
            resolve(status);
        }).on('error', (err) => {
            resolve({ available: false, reason: `連線失敗: ${err.message}` });
        });
    });
}

async function runAudit() {
    if (!fs.existsSync(RAW_FILE)) {
        console.error("Raw episodes database file not found:", RAW_FILE);
        return;
    }

    console.log("Starting audit on 1885 episodes...");
    const rawEpisodes = JSON.parse(fs.readFileSync(RAW_FILE, 'utf-8'));

    const results = {
        missingTitles: [],
        placeholderTitles: [],
        missingSummary: [],
        missingFullText: [],
        gibberishIssues: [],
        invalidVideos: []
    };

    // 1. Audit Text Fields
    rawEpisodes.forEach(ep => {
        const id = ep.episode_id;
        const title = ep.title || "";
        const summary = ep.summary || "";
        const fullText = ep.full_text || "";

        // Title checks
        if (!title.trim()) {
            results.missingTitles.push(id);
        } else if (title.includes("待新增") || title.includes("待更新")) {
            results.placeholderTitles.push(id);
        }

        // Summary checks
        if (!summary || summary === "（本集尚無經文提綱）" || summary.includes("尚無經文提綱")) {
            results.missingSummary.push(id);
        }

        // Transcript checks
        if (!fullText || fullText.includes("此集暫無開示內容") || fullText.includes("暫無逐字稿")) {
            results.missingFullText.push(id);
        }

        // Gibberish / Unicode replacement character check (\uFFFD)
        if (title.includes('\uFFFD') || summary.includes('\uFFFD') || fullText.includes('\uFFFD')) {
            results.gibberishIssues.push(id);
        }
    });

    console.log("Text field audit complete. Starting YouTube video URL validations...");

    // 2. Audit YouTube Videos (Async Batches with delay)
    const queue = [...rawEpisodes];
    let activeRequests = 0;
    let completedCount = 0;
    let dirtyCache = false;
    
    await new Promise((resolve) => {
        async function next() {
            if (queue.length === 0 && activeRequests === 0) {
                resolve();
                return;
            }

            while (queue.length > 0 && activeRequests < CONCURRENCY) {
                const ep = queue.shift();
                activeRequests++;
                
                // Small delay between launching checks to reduce peak traffic
                await delay(DELAY_MS);

                checkVideoStatus(ep.youtube_url).then((status) => {
                    activeRequests--;
                    completedCount++;
                    
                    // If check was performed live (not loaded from cache or updated), mark cache dirty
                    if (status.timestamp && Date.now() - status.timestamp < 1000) {
                        dirtyCache = true;
                    }

                    if (!status.available) {
                        results.invalidVideos.push({
                            episode_id: ep.episode_id,
                            title: ep.title,
                            url: ep.youtube_url || "無",
                            reason: status.reason
                        });
                    }

                    if (completedCount % 100 === 0) {
                        console.log(`Validated ${completedCount}/${rawEpisodes.length} videos...`);
                        if (dirtyCache) {
                            saveCache();
                            dirtyCache = false;
                        }
                    }
                    next();
                });
            }
        }
        next();
    });

    // Save final cache state
    saveCache();

    console.log("YouTube validation complete. Writing report...");

    // Sort lists
    results.missingTitles.sort((a,b)=>a-b);
    results.placeholderTitles.sort((a,b)=>a-b);
    results.missingSummary.sort((a,b)=>a-b);
    results.missingFullText.sort((a,b)=>a-b);
    results.gibberishIssues.sort((a,b)=>a-b);
    results.invalidVideos.sort((a,b)=>a.episode_id - b.episode_id);

    // Format markdown report
    const reportMd = `# 《靜思妙蓮華》全集資料庫審計報告 (Data Audit Report)
*產生日期：${new Date().toLocaleString()}*
*總計審查：${rawEpisodes.length} 集數*

---

## 一、 重點異常摘要
* **無集標題集數**：${results.missingTitles.length} 集
* **標題為「待新增」預留位置**：${results.placeholderTitles.length} 集 (包含第 211, 351, 1849, 1855, 1870-1884 集等)
* **無經文提綱 (大綱) 集數**：${results.missingSummary.length} 集
* **無開示全文 (逐字稿) 集數**：${results.missingFullText.length} 集
* **內容含有亂碼 (如  符號)**：${results.gibberishIssues.length} 集
* **YouTube 影片異常/私有/已刪除**：${results.invalidVideos.length} 集

---

## 二、 異常明細清單

### 1. 標題異常
${results.missingTitles.length > 0 ? `* **完全缺失標題**：第 ${results.missingTitles.join(', ')} 集` : '* **完全缺失標題**：無'}
${results.placeholderTitles.length > 0 ? `* **待新增預留標題**：第 ${results.placeholderTitles.join(', ')} 集` : '* **待新增預留標題**：無'}

### 2. 亂碼 ( 符號) 異常集數
${results.gibberishIssues.length > 0 ? `* **以下集數標題、大綱或全文中含有亂碼，需手動修復**：\n  第 ${results.gibberishIssues.join(', ')} 集` : '* **無亂碼集數**'}

### 3. 無經文大綱集數 (共 ${results.missingSummary.length} 集)
${results.missingSummary.length > 0 ? `* **大綱尚待編輯的集數**：\n  第 ${results.missingSummary.join(', ')} 集` : '* **所有集數均有大綱**'}

### 4. 無逐字稿全文集數 (共 ${results.missingFullText.length} 集)
${results.missingFullText.length > 0 ? `* **逐字稿尚待編輯的集數**：\n  第 ${results.missingFullText.join(', ')} 集` : '* **所有集數均有逐字稿**'}

### 5. 異常/失效影片明細 (共 ${results.invalidVideos.length} 集)
${results.invalidVideos.length > 0 ? `
| 集數 | 集標題 | 影片網址 | 異常原因 |
| :---: | :--- | :--- | :--- |
| ${results.invalidVideos.map(v => `| ${v.episode_id} | ${v.title} | ${v.url} | ${v.reason} |`).join('\n')}
` : '* **所有集數的影片均可正常公開播放**'}

---
*本報告已自動儲存至 ${REPORT_FILE}，供後續比對與內容編修參考。*
`;

    fs.writeFileSync(REPORT_FILE, reportMd, 'utf-8');
    console.log(`Audit complete! Detailed report written to: ${REPORT_FILE}`);
}

runAudit();
