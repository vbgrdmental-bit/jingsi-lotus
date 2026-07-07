const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.pdf': 'application/pdf',
    '.ico': 'image/x-icon'
};

// Helper functions for stats tracking
function getStats() {
    const statsPath = path.join(__dirname, '..', 'data', 'stats.json');
    if (!fs.existsSync(statsPath)) {
        const initialStats = {
            visits: 0,
            episode_completions: {}
        };
        for (let i = 1; i <= 1885; i++) {
            initialStats.episode_completions[i] = 0;
        }
        fs.writeFileSync(statsPath, JSON.stringify(initialStats, null, 2), 'utf-8');
        return initialStats;
    }
    try {
        return JSON.parse(fs.readFileSync(statsPath, 'utf-8'));
    } catch (e) {
        console.error("Failed to read stats.json:", e.message);
        return { visits: 0, episode_completions: {} };
    }
}

function saveStats(stats) {
    const statsPath = path.join(__dirname, '..', 'data', 'stats.json');
    fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2), 'utf-8');
}

const server = http.createServer((req, res) => {
    // Visitor & Completion stats API
    if (req.url === '/api/stats') {
        const stats = getStats();
        stats.visits += 1;
        saveStats(stats);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(stats));
        return;
    }

    if (req.url.startsWith('/api/complete')) {
        const urlParams = new URL(req.url, `http://localhost:${PORT}`);
        const epId = urlParams.searchParams.get('episode_id');
        const completed = urlParams.searchParams.get('completed') === 'true';
        
        if (epId) {
            const stats = getStats();
            if (!stats.episode_completions) stats.episode_completions = {};
            
            const currentCount = stats.episode_completions[epId] || 0;
            if (completed) {
                stats.episode_completions[epId] = currentCount + 1;
            } else {
                stats.episode_completions[epId] = Math.max(0, currentCount - 1);
            }
            saveStats(stats);
            
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: true, count: stats.episode_completions[epId] }));
        } else {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: false, error: 'Missing episode_id' }));
        }
        return;
    }

    // Save Edit API endpoint
    if (req.method === 'POST' && req.url === '/api/save_edit') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body);
                const { episode_id, mode, title, summary, full_text, author, date, comment } = payload;
                
                const dbPath = path.join(__dirname, '..', 'data', 'raw_episodes.json');
                const rawEpisodes = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
                const ep = rawEpisodes.find(e => e.episode_id === Number(episode_id));
                
                if (ep) {
                    let titleModified = false;
                    let contentModified = false;

                    const notesOnlyEpisodes = [16, 17, 19, 20, 23, 29];
                    const isNotesOnly = notesOnlyEpisodes.includes(ep.episode_id) && !ep.is_edited;

                    // Support mode-based explicit updates to prevent fields from overwriting/disappearing
                    if (mode === 'title') {
                        if (title && title.trim() !== ep.title.trim()) {
                            ep.title = title.trim();
                            titleModified = true;
                        }
                    } else if (mode === 'summary') {
                        if (summary !== ep.summary) {
                            ep.summary = summary;
                            if (isNotesOnly) {
                                ep.full_text = summary;
                            }
                            contentModified = true;
                        }
                    } else if (mode === 'full_text') {
                        if (full_text !== ep.full_text) {
                            if (isNotesOnly) {
                                ep.summary = ep.full_text || '';
                            }
                            ep.full_text = full_text;
                            contentModified = true;
                        }
                    } else {
                        // Fallback behavior (historical compatibility)
                        const titleMod = title && title.trim() !== ep.title.trim();
                        const contentMod = (summary !== undefined && summary !== ep.summary) || 
                                           (full_text !== undefined && full_text !== ep.full_text);
                        if (titleMod) {
                            ep.title = title.trim();
                            titleModified = true;
                        }
                        if (contentMod) {
                            ep.summary = summary;
                            ep.full_text = full_text;
                            contentModified = true;
                        }
                    }
                    
                    if (contentModified) {
                        ep.is_edited = true;
                        ep.edited_by = author;
                        ep.edited_date = date;

                        if (!ep.edit_history) {
                            ep.edit_history = [];
                        }

                        // Check duplicate consecutive edits by same person on same day and mode
                        const isDuplicate = ep.edit_history.length > 0 && 
                                             ep.edit_history[0].date === date && 
                                             ep.edit_history[0].author === author && 
                                             ep.edit_history[0].mode === mode &&
                                             ep.edit_history[0].comment === comment;
                        if (!isDuplicate) {
                            ep.edit_history.unshift({
                                date: date,
                                author: author,
                                mode: mode,
                                comment: comment || ''
                            });
                        }
                    }
                    
                    if (titleModified || contentModified) {
                        fs.writeFileSync(dbPath, JSON.stringify(rawEpisodes, null, 2), 'utf-8');
                        global.rawEpisodesCache = rawEpisodes;
                        
                        // Recompile chunk files and metadata index instantly
                        try {
                            const exportScript = require('./export.js');
                            exportScript.run();
                        } catch (err) {
                            console.error("Recompilation export failed:", err.message);
                        }
                    }
                    
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ success: true }));
                } else {
                    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ success: false, error: 'Episode not found' }));
                }
            } catch (err) {
                console.error("Save edit failed:", err.message);
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    // Save Pre-Read Edit API endpoint (writes to data/preread.json)
    if (req.method === 'POST' && req.url === '/api/save_preread') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body);
                const { id, mode, title, summary, full_text, author, date, comment } = payload;

                const prPath = path.join(__dirname, '..', 'data', 'preread.json');
                let prereadData = [];
                if (fs.existsSync(prPath)) {
                    prereadData = JSON.parse(fs.readFileSync(prPath, 'utf-8'));
                }

                let entry = prereadData.find(e => e.id === id);
                if (!entry) {
                    entry = { id, title: '', summary: '', full_text: '' };
                    prereadData.push(entry);
                }

                if (mode === 'title' && title !== undefined) {
                    entry.title = title.trim();
                } else if (mode === 'summary' && summary !== undefined) {
                    entry.summary = summary;
                    if (!entry.edit_history) entry.edit_history = [];
                    entry.edit_history.unshift({ date, author, mode, comment: comment || '' });
                } else if (mode === 'full_text' && full_text !== undefined) {
                    entry.full_text = full_text;
                    if (!entry.edit_history) entry.edit_history = [];
                    entry.edit_history.unshift({ date, author, mode, comment: comment || '' });
                }

                // Sort by id to keep order
                prereadData.sort((a, b) => a.id - b.id);
                fs.writeFileSync(prPath, JSON.stringify(prereadData, null, 2), 'utf-8');

                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: true }));
            } catch (err) {
                console.error('Save preread failed:', err.message);
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ success: false, error: err.message }));
            }
        });
        return;
    }

    if (req.url.startsWith('/api/search')) {
        const urlParams = new URL(req.url, `http://localhost:${PORT}`);
        const query = urlParams.searchParams.get('q') || '';
        
        if (!global.rawEpisodesCache) {
            try {
                const dbPath = path.join(__dirname, '..', 'data', 'raw_episodes.json');
                global.rawEpisodesCache = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
            } catch (err) {
                console.error("Failed to load search database:", err.message);
                global.rawEpisodesCache = [];
            }
        }
        
        const results = [];
        const cleanQuery = query.trim().toLowerCase();
        const keywords = cleanQuery.split(/[\s　]+/).filter(k => k.length > 0);
        
        if (keywords.length > 0) {
            for (const ep of global.rawEpisodesCache) {
                const epIdStr = String(ep.episode_id);
                const titleStr = ep.title.toLowerCase();
                const summaryStr = (ep.summary || '').toLowerCase();
                const textStr = (ep.full_text || '').toLowerCase();
                
                let matchesAll = true;
                for (const kw of keywords) {
                    if (!(epIdStr === kw || 
                          titleStr.includes(kw) || 
                          summaryStr.includes(kw) || 
                          textStr.includes(kw))) {
                        matchesAll = false;
                        break;
                    }
                }
                
                if (matchesAll) {
                    results.push({
                        episode_id: ep.episode_id,
                        title: ep.title,
                        raw_date: ep.raw_date || ep.broadcast_date || '',
                        summary: ep.summary || '',
                        full_text: ep.full_text || ''
                    });
                    
                    if (results.length >= 100) break;
                }
            }
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(results));
        return;
    }

    // Clean path to prevent directory traversal
    let safeUrl = req.url.split('?')[0];
    if (safeUrl === '/') safeUrl = '/index.html';
    
    // Resolve full path in workspace
    const filePath = path.join(__dirname, '..', safeUrl);
    
    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('404 Not Found');
            return;
        }
        
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        
        res.writeHead(200, { 'Content-Type': contentType });
        
        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
    });
});

server.listen(PORT, () => {
    console.log(`Local web server running at http://localhost:${PORT}`);
});
