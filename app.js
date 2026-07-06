// Global State Management
let appState = {
    chapters: [],
    episodesIndex: [],
    rawEpisodesCache: null,
    chapterEpisodesCache: {}, // Maps chapterId -> full episode lists
    progress: {
        completed: {}, // Map of episodeId -> true
        lastRead: null, // Last read episodeId
        lastScroll: 0  // Scroll offset of the last read episode
    },
    activeChapterId: null,
    activeEpisode: null,
    fontSize: 'medium',
    theme: 'dark-mode',
    zenMode: false
};

// Check if running in a local environment (local server or file:// protocol)
function isLocalEnvironment() {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' || 
           window.location.hostname === '::1' ||
           window.location.hostname === '' ||
           window.location.protocol === 'file:';
}

// DOM Elements
const elements = {
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    globalPercent: document.getElementById('globalPercent'),
    globalProgressBar: document.getElementById('globalProgressBar'),
    globalStats: document.getElementById('globalStats'),
    resumeCard: document.getElementById('resumeCard'),
    resumeTitle: document.getElementById('resumeTitle'),
    resumeBtn: document.getElementById('resumeBtn'),
    chapterList: document.getElementById('chapterList'),
    detailPanel: document.getElementById('detailPanel'),
    closePanelBtn: document.getElementById('closePanelBtn'),
    panelEpIdBadge: document.getElementById('panelEpIdBadge'),
    panelChapterName: document.getElementById('panelChapterName'),
    panelRelativeNum: document.getElementById('panelRelativeNum'),
    panelEpisodeTitle: document.getElementById('panelEpisodeTitle'),
    panelDate: document.getElementById('panelDate'),
    panelCompleteBtn: document.getElementById('panelCompleteBtn'),
    videoContainer: document.getElementById('videoContainer'),
    prevEpisodeBtn: document.getElementById('prevEpisodeBtn'),
    nextEpisodeBtn: document.getElementById('nextEpisodeBtn'),
    videoSearchBtn: document.getElementById('videoSearchBtn'),
    pdfDownloadLink: document.getElementById('pdfDownloadLink'),
    fontDecBtn: document.getElementById('fontDecBtn'),
    fontIncBtn: document.getElementById('fontIncBtn'),
    sutraSummary: document.getElementById('sutraSummary'),
    sutraFullText: document.getElementById('sutraFullText'),
    panelBody: document.querySelector('#detailPanel .panel-body'),
    searchInput: document.getElementById('searchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    searchResults: document.getElementById('searchResults'),
    editModal: document.getElementById('editModal'),
    closeEditModalBtn: document.getElementById('closeEditModalBtn'),
    cancelEditBtn: document.getElementById('cancelEditBtn'),
    saveEditBtn: document.getElementById('saveEditBtn'),
    editEpId: document.getElementById('editEpId'),
    editTitle: document.getElementById('editTitle'),
    editSummary: document.getElementById('editSummary'),
    editFullText: document.getElementById('editFullText'),
    editAuthor: document.getElementById('editAuthor'),
    editDate: document.getElementById('editDate'),
    globalVisits: document.getElementById('globalVisits'),
    panelCompleteStats: document.getElementById('panelCompleteStats'),
    editTitleBtn: document.getElementById('editTitleBtn'),
    editSummaryBtn: document.getElementById('editSummaryBtn'),
    editFullTextBtn: document.getElementById('editFullTextBtn'),
    editTitleSection: document.getElementById('editTitleSection'),
    editSummarySection: document.getElementById('editSummarySection'),
    editFullTextSection: document.getElementById('editFullTextSection'),
    editAuthorSection: document.getElementById('editAuthorSection'),
    editComment: document.getElementById('editComment'),
    editCommentSection: document.getElementById('editCommentSection')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    loadSettingsFromStorage();
    initTheme();
    initEventListeners();
    fetchMetadata();
});

// Load progress & preferences from LocalStorage
function loadSettingsFromStorage() {
    // 1. Progress
    const savedProgress = localStorage.getItem('jingsi_progress');
    if (savedProgress) {
        try {
            appState.progress = JSON.parse(savedProgress);
            if (!appState.progress.completed) appState.progress.completed = {};
        } catch (e) {
            console.error("Error loading progress", e);
        }
    }

    // 2. Font Size
    const savedFontSize = localStorage.getItem('jingsi_fontsize');
    if (savedFontSize) {
        appState.fontSize = savedFontSize;
    }

    // 3. Theme
    const savedTheme = localStorage.getItem('jingsi_theme');
    if (savedTheme) {
        appState.theme = savedTheme;
    }
}

// Save progress to LocalStorage
function saveProgress() {
    localStorage.setItem('jingsi_progress', JSON.stringify(appState.progress));
    updateGlobalProgressBar();
}

// Initialize Theme
function initTheme() {
    if (appState.theme === 'sepia-mode') {
        document.body.classList.remove('dark-mode');
        document.body.classList.add('sepia-mode');
    } else {
        document.body.classList.remove('sepia-mode');
        document.body.classList.add('dark-mode');
    }
}

// Toggle Theme (Dark / Sepia)
function toggleTheme() {
    if (document.body.classList.contains('dark-mode')) {
        document.body.classList.remove('dark-mode');
        document.body.classList.add('sepia-mode');
        appState.theme = 'sepia-mode';
    } else {
        document.body.classList.remove('sepia-mode');
        document.body.classList.add('dark-mode');
        appState.theme = 'dark-mode';
    }
    localStorage.setItem('jingsi_theme', appState.theme);
}

// Bind UI Listeners
function initEventListeners() {
    elements.themeToggleBtn.addEventListener('click', toggleTheme);
    elements.closePanelBtn.addEventListener('click', closeEpisodeDetail);
    elements.panelCompleteBtn.addEventListener('click', toggleActiveEpisodeCompleted);
    
    // YouTube search fallback - copy search string to clipboard
    if (elements.videoSearchBtn) {
        elements.videoSearchBtn.addEventListener('click', () => {
            if (appState.activeEpisode) {
                const queryText = `靜思妙蓮華 第${appState.activeEpisode.episode_id}集 ${appState.activeEpisode.title}`;
                navigator.clipboard.writeText(queryText).then(() => {
                    console.log("Copied search query to clipboard:", queryText);
                }).catch(err => {
                    console.error("Could not copy search query:", err);
                });
            }
        });
    }
    
    // Previous/Next Episode Navigation (supports both regular episodes and pre-read items)
    elements.prevEpisodeBtn.addEventListener('click', () => {
        const preIdx = elements.prevEpisodeBtn.dataset.preReadIdx;
        if (preIdx !== undefined) {
            openPreReadDetail(parseInt(preIdx, 10));
        } else {
            navigateToSiblingEpisode(-1);
        }
    });
    elements.nextEpisodeBtn.addEventListener('click', () => {
        const preIdx = elements.nextEpisodeBtn.dataset.preReadIdx;
        if (preIdx !== undefined) {
            openPreReadDetail(parseInt(preIdx, 10));
        } else {
            navigateToSiblingEpisode(1);
        }
    });
    
    // Resume Reading Button
    elements.resumeBtn.addEventListener('click', () => {
        if (appState.progress.lastRead) {
            openEpisodeDetail(appState.progress.lastRead, true);
        }
    });

    // Font size controls (A- / A+ dynamic adjustment)
    let currentFontSize = parseFloat(localStorage.getItem('jingsi_reading_fontsize') || '1.05');
    function updateReadingFontSize() {
        document.documentElement.style.setProperty('--reading-font-size', `${currentFontSize}rem`);
        localStorage.setItem('jingsi_reading_fontsize', currentFontSize.toString());
    }
    updateReadingFontSize();

    if (elements.fontDecBtn) {
        elements.fontDecBtn.addEventListener('click', () => {
            currentFontSize = Math.max(0.75, currentFontSize - 0.08);
            updateReadingFontSize();
        });
    }
    if (elements.fontIncBtn) {
        elements.fontIncBtn.addEventListener('click', () => {
            currentFontSize = Math.min(1.8, currentFontSize + 0.08);
            updateReadingFontSize();
        });
    }

    // Tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabId = e.currentTarget.dataset.tab;
            setActiveTab(tabId);
        });
    });

    // Save scroll position when user scrolls the panel text
    elements.panelBody.addEventListener('scroll', () => {
        if (appState.activeEpisode && !appState.zenMode) {
            appState.progress.lastScroll = elements.panelBody.scrollTop;
            // Debounce saving in real life, but simple localStorage call works fine for static reading
            localStorage.setItem('jingsi_progress', JSON.stringify(appState.progress));
        }
    });

    // Search input listener
    if (elements.searchInput) {
        elements.searchInput.addEventListener('input', (e) => {
            const query = e.target.value;
            handleSearchInput(query);
        });
    }

    if (elements.clearSearchBtn) {
        elements.clearSearchBtn.addEventListener('click', () => {
            elements.searchInput.value = '';
            handleSearchInput('');
        });
    }

    // Helper to setup edit modal sections
    window.showModalSection = (mode) => {
        appState.editMode = mode;
        if (!appState.activeEpisode) return;
        
        elements.editEpId.textContent = appState.activeEpisode.episode_id;
        
        // Reset comment input
        if (elements.editComment) {
            elements.editComment.value = '';
        }
        
        if (mode === 'title') {
            elements.editTitleSection.classList.remove('hidden');
            elements.editSummarySection.classList.add('hidden');
            elements.editFullTextSection.classList.add('hidden');
            elements.editAuthorSection.classList.add('hidden');
            if (elements.editCommentSection) elements.editCommentSection.classList.add('hidden');
            
            elements.editTitle.value = appState.activeEpisode.title || '';
            if (appState.activeEpisode._isPreRead) {
                document.querySelector('#editModal h3').innerHTML = `修改品前導讀標題`;
            } else {
                document.querySelector('#editModal h3').innerHTML = `手動修改第 <span id="editEpId">${appState.activeEpisode.episode_id}</span> 集標題`;
            }
        } else if (mode === 'summary') {
            elements.editTitleSection.classList.add('hidden');
            elements.editSummarySection.classList.remove('hidden');
            elements.editFullTextSection.classList.add('hidden');
            elements.editAuthorSection.classList.remove('hidden');
            if (elements.editCommentSection) elements.editCommentSection.classList.remove('hidden');

            if (appState.activeEpisode._isPreRead) {
                const idx = appState.activeEpisode._preReadIdx;
                elements.editSummary.value = (window._preReadItems[idx] && window._preReadItems[idx].summary) || '';
                document.querySelector('#editModal h3').innerHTML = `手動修改品前導讀第 ${idx + 1} 集 (大綱)`;
            } else {
                const notesOnlyEpisodes = [16, 17, 19, 20, 23, 29];
                const isNotesOnly = notesOnlyEpisodes.includes(appState.activeEpisode.episode_id) && !appState.activeEpisode.is_edited;
                elements.editSummary.value = isNotesOnly ? (appState.activeEpisode.full_text || '') : (appState.activeEpisode.summary || '');
                document.querySelector('#editModal h3').innerHTML = `手動修改第 <span id="editEpId">${appState.activeEpisode.episode_id}</span> 集 (大綱)`;
            }
        } else if (mode === 'full_text') {
            elements.editTitleSection.classList.add('hidden');
            elements.editSummarySection.classList.add('hidden');
            elements.editFullTextSection.classList.remove('hidden');
            elements.editAuthorSection.classList.remove('hidden');
            if (elements.editCommentSection) elements.editCommentSection.classList.remove('hidden');

            if (appState.activeEpisode._isPreRead) {
                const idx = appState.activeEpisode._preReadIdx;
                elements.editFullText.value = (window._preReadItems[idx] && window._preReadItems[idx].full_text) || '';
                document.querySelector('#editModal h3').innerHTML = `手動修改品前導讀第 ${idx + 1} 集 (全文)`;
            } else {
                const notesOnlyEpisodes = [16, 17, 19, 20, 23, 29];
                const isNotesOnly = notesOnlyEpisodes.includes(appState.activeEpisode.episode_id) && !appState.activeEpisode.is_edited;
                elements.editFullText.value = isNotesOnly ? '' : (appState.activeEpisode.full_text || '');
                document.querySelector('#editModal h3').innerHTML = `手動修改第 <span id="editEpId">${appState.activeEpisode.episode_id}</span> 集 (全文)`;
            }
        }
        
        elements.editAuthor.value = localStorage.getItem('jingsi_edit_author') || '';
        
        const now = new Date();
        const formattedDate = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
        elements.editDate.value = formattedDate;
        
        elements.editModal.classList.remove('hidden');
    };

    if (elements.editTitleBtn) {
        elements.editTitleBtn.addEventListener('click', () => showModalSection('title'));
    }
    if (elements.editSummaryBtn) {
        elements.editSummaryBtn.addEventListener('click', () => showModalSection('summary'));
    }
    if (elements.editFullTextBtn) {
        elements.editFullTextBtn.addEventListener('click', () => showModalSection('full_text'));
    }

    const closeEdit = () => {
        if (elements.editModal) elements.editModal.classList.add('hidden');
    };

    if (elements.closeEditModalBtn) elements.closeEditModalBtn.addEventListener('click', closeEdit);
    if (elements.cancelEditBtn) elements.cancelEditBtn.addEventListener('click', closeEdit);

    if (elements.saveEditBtn) {
        elements.saveEditBtn.addEventListener('click', () => {
            if (!appState.activeEpisode) return;

            // ---- Pre-Read editing (title / summary / full_text) ----
            if (appState.activeEpisode._isPreRead) {
                const mode = appState.editMode;
                const idx = appState.activeEpisode._preReadIdx;
                const entry = window._preReadItems[idx];
                if (!entry) return;

                const now = new Date();
                const dateStr = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')}`;
                const comment = elements.editComment ? elements.editComment.value.trim() : '';

                let payload = { id: idx, mode, date: dateStr, author: '管理員', comment };

                if (mode === 'title') {
                    const newTitle = elements.editTitle.value.trim();
                    if (!newTitle) { alert('標題不能為空！'); return; }
                    entry.title = newTitle;
                    appState.activeEpisode.title = newTitle;
                    if (elements.panelEpisodeTitle) elements.panelEpisodeTitle.textContent = newTitle;
                    payload.title = newTitle;
                } else if (mode === 'summary') {
                    const author = elements.editAuthor.value.trim();
                    if (!author) { alert('請輸入修改者姓名！'); return; }
                    payload.author = author;
                    localStorage.setItem('jingsi_edit_author', author);
                    entry.summary = elements.editSummary.value;
                    payload.summary = entry.summary;
                } else if (mode === 'full_text') {
                    const author = elements.editAuthor.value.trim();
                    if (!author) { alert('請輸入修改者姓名！'); return; }
                    payload.author = author;
                    localStorage.setItem('jingsi_edit_author', author);
                    entry.full_text = elements.editFullText.value;
                    payload.full_text = entry.full_text;
                }

                // Update frontend edit_history in-memory
                if (mode !== 'title') {
                    if (!entry.edit_history) {
                        entry.edit_history = [];
                    }
                    const isDuplicate = entry.edit_history.length > 0 && 
                                        entry.edit_history[0].date === payload.date && 
                                        entry.edit_history[0].author === payload.author && 
                                        entry.edit_history[0].mode === mode &&
                                        entry.edit_history[0].comment === payload.comment;
                    if (!isDuplicate) {
                        entry.edit_history.unshift({
                            date: payload.date,
                            author: payload.author,
                            mode: mode,
                            comment: payload.comment
                        });
                    }
                }

                // Save to localStorage as backup
                const lsKey = 'jingsi_preread_edits';
                const localEdits = JSON.parse(localStorage.getItem(lsKey) || '{}');
                if (!localEdits[idx]) localEdits[idx] = { id: idx, title: entry.title, summary: entry.summary || '', full_text: entry.full_text || '', edit_history: [] };
                localEdits[idx][mode === 'full_text' ? 'full_text' : mode] = payload[mode === 'full_text' ? 'full_text' : mode] || entry[mode === 'full_text' ? 'full_text' : mode];
                localEdits[idx].title = entry.title;
                localEdits[idx].edit_history = entry.edit_history;
                localStorage.setItem(lsKey, JSON.stringify(localEdits));

                elements.saveEditBtn.disabled = true;
                elements.saveEditBtn.textContent = '儲存中...';

                fetch('./api/save_preread', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        alert('品前導讀修改已儲存！');
                    } else {
                        alert('伺服器儲存失敗（已備份至本地）：' + (data.error || '未知錯誤'));
                    }
                })
                .catch(() => {
                    alert('已儲存至本地瀏覽器備份（伺服器未運行）');
                })
                .finally(() => {
                    elements.saveEditBtn.disabled = false;
                    elements.saveEditBtn.textContent = '儲存修改';
                    if (elements.editModal) elements.editModal.classList.add('hidden');
                    // Re-render detail panel to show updated content
                    openPreReadDetail(idx);
                });
                return;
            }

            const mode = appState.editMode;
            const notesOnlyEpisodes = [16, 17, 19, 20, 23, 29];
            const isNotesOnly = notesOnlyEpisodes.includes(appState.activeEpisode.episode_id) && !appState.activeEpisode.is_edited;

            let author = '';
            let title = appState.activeEpisode.title || '';
            let summary = appState.activeEpisode.summary || '';
            let full_text = appState.activeEpisode.full_text || '';
            
            if (mode === 'title') {
                title = elements.editTitle.value.trim();
                if (!title) {
                    alert('集標題不能為空！');
                    return;
                }
                author = '管理員';
            } else {
                author = elements.editAuthor.value.trim();
                if (!author) {
                    alert('請輸入修改者姓名！');
                    return;
                }
                localStorage.setItem('jingsi_edit_author', author);
                
                if (mode === 'summary') {
                    summary = elements.editSummary.value;
                    if (isNotesOnly) {
                        full_text = elements.editSummary.value;
                    }
                } else if (mode === 'full_text') {
                    full_text = elements.editFullText.value;
                    if (isNotesOnly) {
                        summary = appState.activeEpisode.full_text || '';
                    }
                }
            }
            
            const payload = {
                episode_id: appState.activeEpisode.episode_id,
                mode: mode,
                title: title,
                summary: summary,
                full_text: full_text,
                author: author,
                date: elements.editDate.value,
                comment: elements.editComment ? elements.editComment.value.trim() : ''
            };
            
            elements.saveEditBtn.disabled = true;
            elements.saveEditBtn.textContent = '儲存中...';
            
            fetch('./api/save_edit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    const ep = appState.activeEpisode;
                    ep.title = payload.title;
                    
                    if (mode === 'summary') {
                        ep.summary = payload.summary;
                        if (isNotesOnly) {
                            ep.full_text = payload.summary;
                        }
                    } else if (mode === 'full_text') {
                        if (isNotesOnly) {
                            ep.summary = ep.full_text || '';
                        }
                        ep.full_text = payload.full_text;
                    }
                    
                    if (mode !== 'title') {
                        ep.is_edited = true;
                        ep.edited_by = payload.author;
                        ep.edited_date = payload.date;

                        if (!ep.edit_history) {
                            ep.edit_history = [];
                        }
                        const isDuplicate = ep.edit_history.length > 0 && 
                                            ep.edit_history[0].date === payload.date && 
                                            ep.edit_history[0].author === payload.author && 
                                            ep.edit_history[0].mode === mode &&
                                            ep.edit_history[0].comment === payload.comment;
                        if (!isDuplicate) {
                            ep.edit_history.unshift({
                                date: payload.date,
                                author: payload.author,
                                mode: mode,
                                comment: payload.comment
                            });
                        }
                    }
                    
                    const idxEp = appState.episodesIndex.find(e => e.episode_id === ep.episode_id);
                    if (idxEp) {
                        idxEp.title = ep.title;
                        if (mode !== 'title') {
                            idxEp.is_edited = true;
                        }
                    }
                    
                    // Save updated merged states to payload for local storage consistency
                    payload.summary = ep.summary;
                    payload.full_text = ep.full_text;
                    payload.edit_history = ep.edit_history;
                    saveLocalEditBackup(payload);
                    
                    alert('修改成功！');
                    closeEdit();
                    
                    showDetailPanel(ep.episode_id);
                    
                    const titleTextNode = document.querySelector(`#episodeItem-${ep.episode_id} .episode-title`);
                    if (titleTextNode) titleTextNode.textContent = ep.title;
                } else {
                    alert('儲存失敗：' + (data.error || '未知錯誤'));
                }
            })
            .catch(err => {
                console.warn("Server save failed, falling back to local storage:", err.message);
                
                const ep = appState.activeEpisode;
                ep.title = payload.title;
                
                if (mode === 'summary') {
                    ep.summary = payload.summary;
                    if (isNotesOnly) {
                        ep.full_text = payload.summary;
                    }
                } else if (mode === 'full_text') {
                    if (isNotesOnly) {
                        ep.summary = ep.full_text || '';
                    }
                    ep.full_text = payload.full_text;
                }
                
                if (mode !== 'title') {
                    ep.is_edited = true;
                    ep.edited_by = payload.author;
                    ep.edited_date = payload.date;

                    if (!ep.edit_history) {
                        ep.edit_history = [];
                    }
                    const isDuplicate = ep.edit_history.length > 0 && 
                                        ep.edit_history[0].date === payload.date && 
                                        ep.edit_history[0].author === payload.author && 
                                        ep.edit_history[0].mode === mode &&
                                        ep.edit_history[0].comment === payload.comment;
                    if (!isDuplicate) {
                        ep.edit_history.unshift({
                            date: payload.date,
                            author: payload.author,
                            mode: mode,
                            comment: payload.comment
                        });
                    }
                }
                
                const idxEp = appState.episodesIndex.find(e => e.episode_id === ep.episode_id);
                if (idxEp) {
                    idxEp.title = ep.title;
                    if (mode !== 'title') {
                        idxEp.is_edited = true;
                    }
                }
                
                payload.summary = ep.summary;
                payload.full_text = ep.full_text;
                payload.edit_history = ep.edit_history;
                saveLocalEditBackup(payload);
                
                alert('已儲存至本地瀏覽器（伺服器未運行，無法寫入硬碟 JSON 檔）');
                closeEdit();
                showDetailPanel(ep.episode_id);
                
                const titleTextNode = document.querySelector(`#episodeItem-${ep.episode_id} .episode-title`);
                if (titleTextNode) titleTextNode.textContent = ep.title;
            })
            .finally(() => {
                elements.saveEditBtn.disabled = false;
                elements.saveEditBtn.textContent = '儲存修改';
            });
        });
    }
}

function saveLocalEditBackup(payload) {
    let localEdits = JSON.parse(localStorage.getItem('jingsi_local_edits') || '{}');
    localEdits[payload.episode_id] = payload;
    localStorage.setItem('jingsi_local_edits', JSON.stringify(localEdits));
}

function mergeLocalEdits(chapterId) {
    const localEdits = JSON.parse(localStorage.getItem('jingsi_local_edits') || '{}');
    const episodes = appState.chapterEpisodesCache[chapterId];
    if (!episodes) return;
    
    episodes.forEach(ep => {
        const edit = localEdits[ep.episode_id];
        if (edit) {
            ep.title = edit.title || ep.title;
            ep.summary = edit.summary;
            ep.full_text = edit.full_text;
            ep.is_edited = true;
            ep.edited_by = edit.author;
            ep.edited_date = edit.date;
            ep.edit_history = edit.edit_history || ep.edit_history;
        }
    });
}

function mergeLocalPrereadEdits() {
    const localEdits = JSON.parse(localStorage.getItem('jingsi_preread_edits') || '{}');
    if (!window._preReadItems) return;
    
    Object.keys(localEdits).forEach(idx => {
        const item = window._preReadItems[idx];
        if (item) {
            const edit = localEdits[idx];
            item.title = edit.title || item.title;
            item.summary = edit.summary || item.summary;
            item.full_text = edit.full_text || item.full_text;
            item.edit_history = edit.edit_history || item.edit_history;
        }
    });
}


let searchDebounceTimeout = null;

function handleSearchInput(query) {
    const cleanQuery = query.trim();
    
    if (cleanQuery) {
        elements.clearSearchBtn.classList.remove('hidden');
    } else {
        elements.clearSearchBtn.classList.add('hidden');
    }

    if (!cleanQuery) {
        elements.searchResults.classList.add('hidden');
        elements.searchResults.innerHTML = '';
        elements.chapterList.classList.remove('hidden');
        return;
    }

    elements.chapterList.classList.add('hidden');
    elements.searchResults.classList.remove('hidden');
    elements.searchResults.innerHTML = `<div style="text-align: center; padding: 24px; color: var(--text-hint); font-size: 0.9rem;">正在搜尋中...</div>`;

    clearTimeout(searchDebounceTimeout);
    searchDebounceTimeout = setTimeout(() => {
        performSearch(cleanQuery);
    }, 250);
}

function performSearch(query) {
    fetch(`./api/search?q=${encodeURIComponent(query)}`)
        .then(res => {
            if (!res.ok) throw new Error("Search API error");
            return res.json();
        })
        .then(results => {
            renderSearchResults(results, query);
        })
        .catch(async err => {
            console.warn("Falling back to local client-side search:", err.message);
            const results = await localFallbackSearch(query);
            renderSearchResults(results, query);
        });
}

async function localFallbackSearch(query) {
    const clean = query.toLowerCase();
    const keywords = clean.split(/[\s　]+/).filter(k => k.length > 0);
    const results = [];
    
    if (keywords.length === 0) return results;

    // Load raw_episodes.json if not cached yet for full text search online
    if (!appState.rawEpisodesCache) {
        try {
            const res = await fetch('./data/raw_episodes.json');
            if (res.ok) {
                appState.rawEpisodesCache = await res.json();
            }
        } catch (e) {
            console.error("Failed to load raw episodes for search:", e);
        }
    }

    const dataSource = appState.rawEpisodesCache || appState.episodesIndex;

    for (const ep of dataSource) {
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
                raw_date: ep.raw_date || ep.broadcast_date || ''
            });
            if (results.length >= 100) break;
        }
    }
    return results;
}

function renderSearchResults(results, query) {
    elements.searchResults.innerHTML = '';

    if (results.length === 0) {
        elements.searchResults.innerHTML = `<div class="search-results-empty">找不到與「${query}」有關的集數</div>`;
        return;
    }

    results.forEach(res => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.innerHTML = `
            <div class="search-result-info">
                <div class="search-result-title-row">
                    <span class="search-result-number">第 ${res.episode_id} 集</span>
                    <span class="search-result-title">${res.title}</span>
                </div>
                <div class="search-result-date">播出日期：${res.raw_date || '未知'}</div>
            </div>
        `;
        item.addEventListener('click', () => {
            openEpisodeDetail(res.episode_id);
        });
        elements.searchResults.appendChild(item);
    });
}

// Set Active Font Size
function setFontSize(size) {
    appState.fontSize = size;
    localStorage.setItem('jingsi_fontsize', size);
    
    // Update active states
    document.querySelectorAll('.font-btn').forEach(btn => {
        if (btn.dataset.size === size) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Update panel font class
    elements.detailPanel.classList.remove('font-small', 'font-medium', 'font-large');
    if (size === 'small') elements.detailPanel.classList.add('font-small');
    else if (size === 'medium') elements.detailPanel.classList.add('font-medium');
    else if (size === 'large') elements.detailPanel.classList.add('font-large');
}

// Set Active Tab
function setActiveTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.dataset.tab === tabId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    document.querySelectorAll('.tab-pane').forEach(pane => {
        if (pane.id === tabId) {
            pane.classList.add('active');
        } else {
            pane.classList.remove('active');
        }
    });
}

function fetchMetadata() {
    fetch('./data/metadata.json?v=' + Date.now())
        .then(res => res.json())
        .then(data => {
            appState.chapters = data.chapters;
            appState.episodesIndex = data.episodes;
            // Ensure sorted order for sibling navigation
            appState.episodesIndex.sort((a, b) => a.episode_id - b.episode_id);
            
            // Merge local edits to flag is_edited in main index
            const localEdits = JSON.parse(localStorage.getItem('jingsi_local_edits') || '{}');
            appState.episodesIndex.forEach(ep => {
                const edit = localEdits[ep.episode_id];
                if (edit) {
                    ep.is_edited = true;
                    ep.title = edit.title || ep.title;
                }
            });
            
            fetchGlobalStats();
            
            // Automatically detect and show app version from stylesheet version query string
            const cssLink = document.querySelector('link[href*="app.css"]');
            if (cssLink) {
                const match = cssLink.getAttribute('href').match(/v=([\d.]+)/);
                if (match) {
                    const version = match[1];
                    const versionEl = document.getElementById('appVersion');
                    if (versionEl) versionEl.textContent = `網頁版本 v${version}`;
                }
            }
        })
        .catch(err => {
            console.error("Error loading metadata", err);
            elements.chapterList.innerHTML = `
                <div class="loading-spinner-container">
                    <p style="color: red;">載入失敗，請確認資料庫檔案存在或重新整理網頁。</p>
                </div>
            `;
        });
}

function fetchGlobalStats() {
    const isLocalhost = isLocalEnvironment();

    const localText = document.getElementById('localVisitsText');
    const bzContainer = document.getElementById('busuanzi_container_site_pv');

    if (isLocalhost) {
        if (localText) localText.style.display = 'inline';
        if (bzContainer) bzContainer.style.display = 'none';

        fetch('./api/stats')
            .then(res => res.json())
            .then(data => {
                appState.globalStats = data;
                updateGlobalVisitsUI();
                renderChapterList();
                updateGlobalProgressBar();
                updateResumeBookmark();
            })
            .catch(err => {
                console.warn("Could not fetch global stats from local server:", err.message);
                appState.globalStats = { visits: 0, episode_completions: {} };
                updateGlobalVisitsUI();
                renderChapterList();
                updateGlobalProgressBar();
                updateResumeBookmark();
            });
    } else {
        if (localText) localText.style.display = 'none';
        if (bzContainer) bzContainer.style.display = 'inline';

        // Load Busuanzi script dynamically for online static pages
        const script = document.createElement('script');
        script.async = true;
        script.src = "//busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js";
        document.head.appendChild(script);

        appState.globalStats = { visits: 0, episode_completions: {} };
        renderChapterList();
        updateGlobalProgressBar();
        updateResumeBookmark();
    }
}

function updateGlobalVisitsUI() {
    const localText = document.getElementById('localVisitsText');
    if (localText && appState.globalStats) {
        localText.textContent = `累積薰法香人次：${appState.globalStats.visits.toLocaleString()} 人`;
    }
}

// Render Chapter Cards (Accordion List)
function renderChapterList() {
    elements.chapterList.innerHTML = '';
    
    // Prepend special "開經偈 / 爐香讚" card
    const introCard = document.createElement('div');
    introCard.className = 'chapter-card special-intro-card';
    introCard.id = 'chapterCard-intro';
    introCard.innerHTML = `
        <button class="chapter-header" onclick="toggleIntroCard()">
            <div class="chapter-header-main" style="margin-bottom: 0;">
                <span class="chapter-title" style="font-weight: bold; color: var(--accent-color);">開經偈 / 爐香讚</span>
                <svg class="chapter-arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </div>
        </button>
        <div id="episodeListContainer-intro" class="episode-list-container" style="max-height: 0px; overflow: hidden; transition: max-height 0.3s ease-out;">
            <div style="padding: 12px 16px; border-bottom: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 4px; align-items: flex-start; cursor: default;">
                <span class="episode-title" style="font-weight: bold; color: var(--text-primary); font-size: 14px;">開經偈</span>
                <span class="episode-desc fixed-small-intro-text" style="color: var(--text-secondary); white-space: pre-line;">無上甚深微妙法，百千萬劫難遭遇，
我今見聞得受持，願解如來真實義。</span>
            </div>
            <div style="padding: 12px 16px; display: flex; flex-direction: column; gap: 4px; align-items: flex-start; cursor: default;">
                <span class="episode-title" style="font-weight: bold; color: var(--text-primary); font-size: 14px;">爐香讚</span>
                <span class="episode-desc fixed-small-intro-text" style="color: var(--text-secondary); white-space: pre-line;">爐香乍爇。法界蒙薰。諸佛海會悉遙聞。
隨處結祥雲。誠意方殷。諸佛現全身。
南無香雲蓋菩薩摩訶薩（三稱）

南無本師釋迦牟尼佛(三稱)</span>
            </div>
        </div>

    `;
    elements.chapterList.appendChild(introCard);

    // Insert "品前導讀" card between 開經偈 and 序品第一
    const preReadCard = document.createElement('div');
    preReadCard.className = 'chapter-card special-intro-card';
    preReadCard.id = 'chapterCard-preread';
    const preReadData = [
        { name: '法華經總說', links: ['https://youtu.be/lMSoV2CkL1E?si=RhlAONz0AxES8tTY', 'https://youtu.be/Mcl3zDeNOXw?si=fYu_Z8hXpT1hZ19K'] },
        { name: '法華經序', links: ['https://youtu.be/oF0O3UcYNkE?si=2VGYCJXjtxgA2LZW', 'https://youtu.be/upGwvVL6PXY?si=LnvkOycu62z1IBMy'] },
        { name: '序品第一', links: ['https://youtu.be/70An7rQsNUA?si=FuVx_JcY8HMhoEg8'] },
        { name: '方便品第二', links: ['https://youtu.be/dhwKn1cVcZU?si=y6u6wW1H6yMdZCMp', 'https://youtu.be/Xg2PEABaUb4?si=KdvNsAn78OSa9Eyu'] },
        { name: '譬喻品第三', links: ['https://youtu.be/0Iz06z_QTm8?si=v3K0rpbJ0C58ROd6', 'https://youtu.be/aIIn1dXm_j8?si=EuE_1bQ1yIcoUI5d'] },
        { name: '信解品第四', links: ['https://youtu.be/_sqGxEOomB0?si=5AjB7xwiRadvCRiL', 'https://youtu.be/R2EIJKH0OYE?si=YfO98zVHZSQs-7Wg'] },
        { name: '藥草喻品第五', links: ['https://youtu.be/ul1yHr8Rzgw?si=DUUcrHgSA8-yXHSR'] },
        { name: '授記品第六', links: ['https://youtu.be/-WgneEpgOKM?si=m46INTVMAYWWU6Yi'] },
        { name: '化城喻品第七', links: ['https://youtu.be/C2CewpbcsQ0?si=V0zbeFNhI-t_u1IH', 'https://youtu.be/Uprw1GK3vNM?si=jihdyl0JskYCfdtG', 'https://youtu.be/94FIjyraRBk?si=Ax9YrOL_bXn9UtyT'] },
        { name: '五百弟子受記品第八', links: ['https://youtu.be/nBYCGR6oIc0?si=Vf-CxPO6Um1rmUWw', 'https://youtu.be/ct5b-sPao0Y?si=nFjfubLPUtZUxVVp'] },
        { name: '授學無學人記品第九', links: ['https://youtu.be/nraIZJ5uJSM?si=gSxT0N-i-6rIAME8', 'https://youtu.be/I_xL6WPwBos?si=hPUGVRCzEMvidJlE'] },
        { name: '法師品第十', links: ['https://youtu.be/7BN66C_gHrM?si=_cJbztoKZ5VHdnqJ', 'https://youtu.be/wkRcdNLcw1E?si=FznXgXFdmXX3ZEuI'] },
        { name: '見寶塔品第十一', links: ['https://youtu.be/pCSe2nOEaPw?si=PGPy0FnrfiboUVGP', 'https://youtu.be/WU-MDBbESBM?si=DaFiqaMyw04cmpdX', 'https://youtu.be/1mnRdBpilMo?si=dT5LPnMTCffp5yLN'] },
        { name: '提婆達多品第十二', links: ['https://youtu.be/_orxMqNuscE?si=Ke6yNR5oQyuI-3DS', 'https://youtu.be/DO4wu6VwSS8?si=ZOSayKXXf5nNq-Ff'] },
        { name: '勸持品第十三', links: ['https://youtu.be/rtqhZbFRzTo?si=_Cph8yIlmew3hd9g'] },
        { name: '安樂行品第十四', links: ['https://youtu.be/EE5SSkSwkVE?si=euV5PLXWPKFCyOpj', 'https://youtu.be/m3hfjfeKTTY?si=lf-2fUCZa5NAHk0C'] },
        { name: '從地涌出品第十五', links: ['https://youtu.be/v6MJFnIIfhw?si=ifWApAWi0zpeUohm', 'https://youtu.be/nHVLVaq3pxg?si=0ovC8tmbD5vGrHKH'] },
        { name: '如來壽量品第十六', links: ['https://youtu.be/IoUINtLyd0U?si=6JjqTlzd7Nw1dQHb'] },
        { name: '分別功德品第十七', links: ['https://youtu.be/uEBgiAUXZAs?si=kiOYkqFq2I1107Sr', 'https://youtu.be/iheqsmpekPE?si=5z4rSbEfDrvSzV8H'] },
        { name: '隨喜功德品第十八', links: ['https://youtu.be/IrShqy-IrnM?si=Sb83qvAMOIPcFfUd'] },
        { name: '法師功德品第十九', links: ['https://youtu.be/VkLUMFb-cTQ?si=oftabIBEFNMRhs6y', 'https://youtu.be/PoImXnnGPqc?si=j-cbpicdvJIDfNzK'] },
        { name: '常不輕菩薩品第二十', links: ['https://youtu.be/fxBKuKi1yXM?si=3DIGpfkWh0R9QegQ'] },
        { name: '如來神力品第二十一', links: ['https://youtu.be/b6KoJlze8qU?si=y5PlbyasFtQ4OB03'] },
        { name: '囑累品第二十二', links: ['https://youtu.be/_nZBILBsH5A?si=D2YvEPPEXpNqK-vc'] },
        { name: '藥王菩薩本事品第二十三', links: ['https://youtu.be/qkm3CbEkInk?si=6lyMPMf5YFl6IN-N', 'https://youtu.be/7fqBM65iIR4?si=2Y-RymQ0KZWd4Uxe'] }
    ];
    // Build flat list for detail panel navigation
    window._preReadItems = [];
    const chineseNums = ['一','二','三'];
    preReadData.forEach((item) => {
        item.links.forEach((url, i) => {
            const titleLabel = item.links.length > 1
                ? `${item.name}（${chineseNums[i] || (i + 1)}）`
                : item.name;
            window._preReadItems.push({
                title: titleLabel,
                chapterName: item.name,
                url,
                summary: '',
                full_text: '',
                edit_history: []
            });
        });
    });

    // Helper: update pre-read stats bar
    function updatePreReadProgressBar() {
        const completedCount = window._preReadItems.filter((_, idx) => appState.progress.completed[`preread-${idx}`]).length;
        const totalCount = window._preReadItems.length;
        const percent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
        
        const bar = document.getElementById('chapterBar-preread');
        const text = document.getElementById('chapterStats-preread');
        if (bar) bar.style.width = `${percent}%`;
        if (text) text.textContent = `已讀 ${completedCount}/${totalCount}`;
    }

    // Helper: build and inject the preread list HTML into the card container
    function renderPreReadList() {
        const container = document.getElementById('episodeListContainer-preread');
        if (!container) return;
        // Only rebuild inner HTML; preserve expanded/collapsed state
        const wasExpanded = document.getElementById('chapterCard-preread')
            ? document.getElementById('chapterCard-preread').classList.contains('expanded')
            : false;
        container.innerHTML = window._preReadItems.map((entry, idx) => {
            const seqNum = idx + 1;
            const isCompleted = appState.progress.completed[`preread-${idx}`] ? 'completed' : '';
            return `<div class="episode-item ${isCompleted}" id="preReadItem-${idx}" style="cursor:pointer;">
                <div class="checkbox-container">
                    <button class="checkbox-btn" onclick="togglePreReadCompleteInline(event, ${idx})">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </button>
                </div>
                <div class="episode-info" onclick="openPreReadDetail(${idx})">
                    <div class="episode-title-row">
                        <span class="episode-number">${seqNum}</span>
                        <span class="episode-title">${entry.title}</span>
                    </div>
                </div>
            </div>`;
        }).join('');
        
        updatePreReadProgressBar();

        // If already expanded, refresh max-height
        if (wasExpanded) {
            const maxAllowedHeight = 315;
            const targetHeight = Math.min(container.scrollHeight, maxAllowedHeight);
            container.style.maxHeight = targetHeight + 'px';
            container.style.overflowY = container.scrollHeight > maxAllowedHeight ? 'auto' : 'hidden';
        }
    }

    // Global toggle completed inline for pre-read
    window.togglePreReadCompleteInline = function(event, idx) {
        if (event) event.stopPropagation();
        
        const key = `preread-${idx}`;
        const isCompleted = !appState.progress.completed[key];
        if (isCompleted) {
            appState.progress.completed[key] = true;
        } else {
            delete appState.progress.completed[key];
        }
        
        saveProgress();
        
        // Sync inline checkbox in the card list
        const item = document.getElementById(`preReadItem-${idx}`);
        if (item) {
            if (isCompleted) {
                item.classList.add('completed');
            } else {
                item.classList.remove('completed');
            }
        }
        
        // If the active episode is this pre-read item and is currently displayed in the panel, sync it
        if (appState.activeEpisode && appState.activeEpisode._isPreRead && appState.activeEpisode._preReadIdx === idx) {
            const checkbox = elements.panelCompleteBtn;
            if (checkbox) {
                if (isCompleted) {
                    checkbox.classList.add('completed');
                } else {
                    checkbox.classList.remove('completed');
                }
            }
        }
        
        updatePreReadProgressBar();
    };

    preReadCard.innerHTML = `
        <button class="chapter-header" onclick="togglePreReadCard()">
            <div class="chapter-header-main">
                <span class="chapter-title" style="font-weight: bold; color: var(--accent-color);">品前導讀</span>
                <svg class="chapter-arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </div>
            <div class="chapter-progress-wrapper">
                <div class="chapter-progress-bar-bg">
                    <div id="chapterBar-preread" class="chapter-progress-bar" style="width: 0%"></div>
                </div>
                <span id="chapterStats-preread" class="chapter-stats-text">已讀 0/0</span>
            </div>
        </button>
        <div id="episodeListContainer-preread" class="episode-list-container" style="max-height: 0px; overflow: hidden; transition: max-height 0.4s ease-out;">
        </div>
    `;
    elements.chapterList.appendChild(preReadCard);

    // Render initial list (from in-memory defaults)
    renderPreReadList();

    // Async: fetch persisted preread.json and merge saved title/summary/full_text
    fetch('./data/preread.json?v=' + Date.now())
        .then(res => res.json())
        .then(savedList => {
            if (!Array.isArray(savedList)) return;
            savedList.forEach(saved => {
                const item = window._preReadItems[saved.id];
                if (!item) return;
                if (saved.title && saved.title.trim()) item.title = saved.title.trim();
                if (saved.summary !== undefined) item.summary = saved.summary;
                if (saved.full_text !== undefined) item.full_text = saved.full_text;
                if (saved.edit_history) item.edit_history = saved.edit_history;
            });
            mergeLocalPrereadEdits();
            renderPreReadList();
        })
        .catch(() => { 
            mergeLocalPrereadEdits();
            renderPreReadList();
        });

    // Expose renderPreReadList globally so saveEditBtn can call it
    window._renderPreReadList = renderPreReadList;

    appState.chapters.forEach(ch => {
        const card = document.createElement('div');
        card.className = 'chapter-card';
        card.id = `chapterCard-${ch.id}`;
        
        // Calculate progress stats for this specific chapter
        const stats = getChapterProgressStats(ch.id);
        const hasEpisodes = ch.total_episodes > 0;

        card.innerHTML = `
            <button class="chapter-header" onclick="toggleChapter(${ch.id})">
                <div class="chapter-header-main" style="${!hasEpisodes ? 'margin-bottom: 0;' : ''}">
                    <span class="chapter-title">${ch.name}</span>
                    <svg class="chapter-arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </div>
                ${hasEpisodes ? `
                <div class="chapter-progress-wrapper">
                    <div class="chapter-progress-bar-bg">
                        <div id="chapterBar-${ch.id}" class="chapter-progress-bar" style="width: ${stats.percent}%"></div>
                    </div>
                    <span id="chapterStats-${ch.id}" class="chapter-stats-text">已讀 ${stats.completed}/${ch.total_episodes}</span>
                </div>
                ` : `
                <div class="chapter-progress-wrapper" style="margin-top: 4px;">
                    <span class="chapter-stats-text" style="color: var(--text-hint); font-weight: 500;">待新增</span>
                </div>
                `}
            </button>
            <div id="episodeListContainer-${ch.id}" class="episode-list-container">
                <div class="loading-spinner-container">
                    <div class="loading-spinner"></div>
                    <p>正在載入該品逐字稿與大綱...</p>
                </div>
            </div>
        `;
        
        elements.chapterList.appendChild(card);
    });

    // Append special "懺悔 / 發願 / 皈依 / 回向" card at the very bottom
    const outroCard = document.createElement('div');
    outroCard.className = 'chapter-card special-outro-card';
    outroCard.id = 'chapterCard-outro';
    outroCard.innerHTML = `
        <button class="chapter-header" onclick="toggleOutroCard()">
            <div class="chapter-header-main" style="margin-bottom: 0;">
                <span class="chapter-title" style="font-weight: bold; color: var(--accent-color);">懺悔 / 發願 / 皈依 / 回向</span>
                <svg class="chapter-arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </div>
        </button>
        <div id="episodeListContainer-outro" class="episode-list-container" style="max-height: 0px; overflow: hidden; transition: max-height 0.3s ease-out;">
            <div style="padding: 12px 16px; border-bottom: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 4px; align-items: flex-start; cursor: default;">
                <span class="episode-title" style="font-weight: bold; color: var(--text-primary); font-size: 14px;">懺悔</span>
                <span class="episode-desc fixed-small-intro-text" style="color: var(--text-secondary); white-space: pre-line;">往昔所造諸惡業，皆由無始貪瞋癡，
從身語意之所生，一切我今皆懺悔。</span>
            </div>
            <div style="padding: 12px 16px; border-bottom: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 4px; align-items: flex-start; cursor: default;">
                <span class="episode-title" style="font-weight: bold; color: var(--text-primary); font-size: 14px;">發願</span>
                <span class="episode-desc fixed-small-intro-text" style="color: var(--text-secondary); white-space: pre-line;">誠心誓願度眾生，正心誓願斷煩惱，
信心誓願學法門，實心誓願成佛道。</span>
            </div>
            <div style="padding: 12px 16px; border-bottom: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 4px; align-items: flex-start; cursor: default;">
                <span class="episode-title" style="font-weight: bold; color: var(--text-primary); font-size: 14px;">皈依</span>
                <span class="episode-desc fixed-small-intro-text" style="color: var(--text-secondary); white-space: pre-line;">自皈依佛，當願眾生，體解大道，發無上心。
自皈依法，當願眾生，深入經藏，智慧如海。
自皈依僧，當願眾生，統理大眾，一切無礙。</span>
            </div>
            <div style="padding: 12px 16px; display: flex; flex-direction: column; gap: 4px; align-items: flex-start; cursor: default;">
                <span class="episode-title" style="font-weight: bold; color: var(--text-primary); font-size: 14px;">回向</span>
                <span class="episode-desc fixed-small-intro-text" style="color: var(--text-secondary); white-space: pre-line;">願消三障諸煩惱，願得智慧真明了，
普願罪障悉消除，世世常行菩薩道。</span>
            </div>
        </div>
    `;
    elements.chapterList.appendChild(outroCard);
}


// Calculate Progress for a single chapter
function getChapterProgressStats(chapterId) {
    // Find all episodes matching this chapter
    const epHeaders = appState.episodesIndex.filter(ep => ep.chapter_id === chapterId);
    const total = epHeaders.length;
    
    let completedCount = 0;
    epHeaders.forEach(ep => {
        if (appState.progress.completed[ep.episode_id]) {
            completedCount++;
        }
    });

    const percent = total > 0 ? Math.round((completedCount / total) * 100) : 0;
    return { completed: completedCount, total, percent };
}

// Toggle Chapter Accordion
window.toggleChapter = function(chapterId) {
    const card = document.getElementById(`chapterCard-${chapterId}`);
    const container = document.getElementById(`episodeListContainer-${chapterId}`);
    
    const isExpanded = card.classList.contains('expanded');
    
    // Close other chapters first (optional, but keeps phone clean)
    document.querySelectorAll('.chapter-card.expanded').forEach(otherCard => {
        if (otherCard !== card) {
            otherCard.classList.remove('expanded');
            const otherContainer = otherCard.querySelector('.episode-list-container');
            otherContainer.style.maxHeight = '0px';
            otherContainer.style.overflowY = 'hidden';
        }
    });

    if (isExpanded) {
        card.classList.remove('expanded');
        container.style.maxHeight = '0px';
        container.style.overflowY = 'hidden';
    } else {
        card.classList.add('expanded');
        
        // Handle chapters with 0 episodes (waiting for sermon)
        const ch = appState.chapters.find(c => c.id === chapterId);
        if (ch && ch.total_episodes === 0) {
            container.innerHTML = `<p style="padding: 24px 16px; color: var(--text-hint); text-align: center; font-size: 0.9rem;">本品尚無已整理之集數</p>`;
            container.style.maxHeight = container.scrollHeight + "px";
            container.style.overflowY = "hidden";
            return;
        }
        
        // Load details dynamically if not in cache
        if (!appState.chapterEpisodesCache[chapterId]) {
            loadChapterEpisodes(chapterId);
        } else {
            renderEpisodeList(chapterId);
        }
    }
};

// Async Lazy Loading of Chapter Text file
function loadChapterEpisodes(chapterId) {
    fetch(`./data/episodes/chapter_${chapterId}.json?v=` + Date.now())
        .then(res => res.json())
        .then(data => {
            // Sort episodes in ascending order
            data.sort((a, b) => a.episode_id - b.episode_id);
            appState.chapterEpisodesCache[chapterId] = data;
            renderEpisodeList(chapterId);
        })
        .catch(err => {
            console.error(`Error loading chapter ${chapterId}`, err);
            const container = document.getElementById(`episodeListContainer-${chapterId}`);
            container.innerHTML = `<p style="padding: 16px; color: red;">載入失敗，請確認網路連線或檔案存在。</p>`;
        });
}

// Render Episode rows inside Chapter card
function renderEpisodeList(chapterId) {
    const container = document.getElementById(`episodeListContainer-${chapterId}`);
    const episodes = appState.chapterEpisodesCache[chapterId];
    
    container.innerHTML = '';
    
    if (episodes.length === 0) {
        container.innerHTML = `<p style="padding: 16px; color: var(--text-hint);">尚無已整理之集數。</p>`;
        return;
    }

    episodes.forEach((ep, index) => {
        const item = document.createElement('div');
        const isCompleted = appState.progress.completed[ep.episode_id] ? 'completed' : '';
        item.className = `episode-item ${isCompleted}`;
        item.id = `episodeItem-${ep.episode_id}`;
        
        // Calculate relative episode number in the chapter
        const chapter = appState.chapters.find(ch => ch.id === chapterId);
        const chName = chapter ? chapter.name : '';
        let relativeNumLabel = '';
        if (chapter) {
            if (chapter.id === 23) {
                relativeNumLabel = `(第${index + 1}集)`;
            } else {
                relativeNumLabel = `(第${index + 1}集/共${chapter.total_episodes}集)`;
            }
        } else {
            relativeNumLabel = `(第${index + 1}集)`;
        }

        const isLocalhost = isLocalEnvironment();
        const compCount = appState.globalStats && appState.globalStats.episode_completions ? (appState.globalStats.episode_completions[ep.episode_id] || 0) : 0;
        const compText = isLocalhost ? `<span id="episodeCompleteCount-${ep.episode_id}" class="episode-global-completes">（已有 ${compCount} 人完成）</span>` : '';

        item.innerHTML = `
            <div class="checkbox-container">
                <button class="checkbox-btn" onclick="toggleEpisodeCompleteInline(event, ${ep.episode_id}, ${chapterId})">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <polyline points="9 11 12 14 22 4" class="checkmark"></polyline>
                    </svg>
                </button>
            </div>
            <div class="episode-info" onclick="openEpisodeDetail(${ep.episode_id}, false)">
                <div class="episode-title-row">
                    <span class="episode-number">${ep.episode_id}</span>
                    <span class="episode-title">${ep.title}</span>
                </div>
                <div class="episode-sub-row">
                    <span class="episode-chapter-name">${chName}</span>
                    <span class="episode-relative-label">${relativeNumLabel}</span>
                    ${compText}
                </div>
            </div>
        `;
        
        container.appendChild(item);
    });

    // Expand the container with a max constraint of ~5 items for better page length
    const maxAllowedHeight = 315;
    const targetHeight = Math.min(container.scrollHeight, maxAllowedHeight);
    container.style.maxHeight = targetHeight + "px";
    container.style.overflowY = container.scrollHeight > maxAllowedHeight ? "auto" : "hidden";
}

// Inline toggle completed checkbox
window.toggleEpisodeCompleteInline = function(event, episodeId, chapterId) {
    event.stopPropagation(); // Avoid triggering openDetail
    
    const isCompleted = !appState.progress.completed[episodeId];
    if (isCompleted) {
        appState.progress.completed[episodeId] = true;
    } else {
        delete appState.progress.completed[episodeId];
    }
    
    saveProgress();
    
    // Update UI checkmarks
    const item = document.getElementById(`episodeItem-${episodeId}`);
    if (item) {
        if (isCompleted) item.classList.add('completed');
        else item.classList.remove('completed');
    }

    // Recalculate and update the chapter progress bar
    updateChapterProgressBar(chapterId);
    
    // Sync inline completion status to server
    fetch(`./api/complete?episode_id=${episodeId}&completed=${isCompleted}`)
        .then(res => res.json())
        .then(data => {
            if (data.success && appState.globalStats) {
                appState.globalStats.episode_completions[episodeId] = data.count;
                // Sync inline label
                const countLabel = document.getElementById(`episodeCompleteCount-${episodeId}`);
                if (countLabel) {
                    countLabel.textContent = `（已有 ${data.count} 人完成）`;
                }
            }
        })
        .catch(err => console.warn("Failed to sync completion to server:", err.message));
};

// Open Episode Reader overlay panel
window.openEpisodeDetail = function(episodeId, isResume = false) {
    // Find the header metadata first
    const epHeader = appState.episodesIndex.find(ep => ep.episode_id === episodeId);
    if (!epHeader) return;

    const chapterId = epHeader.chapter_id;
    
    // If chapter cache isn't ready, load it first
    if (!appState.chapterEpisodesCache[chapterId]) {
        fetch(`./data/episodes/chapter_${chapterId}.json?v=` + Date.now())
            .then(res => res.json())
            .then(data => {
                appState.chapterEpisodesCache[chapterId] = data;
                mergeLocalEdits(chapterId);
                showDetailPanel(episodeId, isResume);
            });
    } else {
        mergeLocalEdits(chapterId);
        showDetailPanel(episodeId, isResume);
    }
};

// Append bottom info bar containing source note (left) and edit button (right)
function appendBottomInfoBar(container, sourceText, isSummaryTab, editHistoryLines = []) {
    const bar = document.createElement('div');
    bar.className = 'bottom-info-bar';
    
    // 1. Top row containing the edit button (aligned right)
    const topRow = document.createElement('div');
    topRow.className = 'bottom-info-top-row';
    
    if (appState.activeEpisode && !appState.activeEpisode._isOutroCard) {
        const btn = document.createElement('button');
        btn.className = 'edit-action-btn';
        if (isSummaryTab) {
            btn.id = 'editSummaryBtn';
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                <span>修改大綱</span>
            `;
            btn.addEventListener('click', () => window.showModalSection('summary'));
            elements.editSummaryBtn = btn;
        } else {
            btn.id = 'editFullTextBtn';
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                <span>修改全文</span>
            `;
            btn.addEventListener('click', () => window.showModalSection('full_text'));
            elements.editFullTextBtn = btn;
        }
        topRow.appendChild(btn);
    }
    bar.appendChild(topRow);
    
    // 2. Bottom part containing left info block
    const infoLeft = document.createElement('div');
    infoLeft.className = 'bottom-info-left';
    
    const sourceSpan = document.createElement('span');
    sourceSpan.className = 'sermon-source-note';
    sourceSpan.textContent = sourceText;
    infoLeft.appendChild(sourceSpan);
    
    if (editHistoryLines && editHistoryLines.length > 0) {
        const divider = document.createElement('div');
        divider.className = 'bottom-info-divider';
        infoLeft.appendChild(divider);
        
        editHistoryLines.forEach(line => {
            const historySpan = document.createElement('span');
            historySpan.className = 'sermon-edit-history-note';
            historySpan.textContent = line;
            infoLeft.appendChild(historySpan);
        });
    }
    
    bar.appendChild(infoLeft);
    container.appendChild(bar);
}

// Render episode panel once data is available in cache
function showDetailPanel(episodeId, isResume) {
    const epHeader = appState.episodesIndex.find(ep => ep.episode_id === episodeId);
    const chapterId = epHeader.chapter_id;
    const episodes = appState.chapterEpisodesCache[chapterId];
    const episode = episodes.find(ep => ep.episode_id === episodeId);
    
    if (!episode) return;
    
    appState.activeEpisode = episode;
    
    // Update source note text for notes-only episodes
    const notesOnlyEpisodes = [16, 17, 19, 20, 23, 29];
    const isNotesOnly = notesOnlyEpisodes.includes(episodeId) && !episode.is_edited;
    const sermonSourceText = isNotesOnly 
        ? `※ 以上內容摘自「奈普敦智慧平台」 & 大愛電視 YouTube（本集僅有導讀問答與心得筆記，無逐字稿）`
        : `※ 以上內容摘自「奈普敦智慧平台」 & 大愛電視 YouTube`;

    const isLocalhost = isLocalEnvironment();
    if (elements.editTitleBtn) {
        if (isLocalhost) elements.editTitleBtn.classList.remove('hidden');
        else elements.editTitleBtn.classList.add('hidden');
    }
    
    // 1. Populate metadata
    const chapter = appState.chapters.find(ch => ch.id === chapterId);
    const episodeIndex = episodes.findIndex(e => e.episode_id === episodeId);

    if (elements.panelEpIdBadge) {
        elements.panelEpIdBadge.style.display = ''; // Restore default display
        elements.panelEpIdBadge.textContent = episode.episode_id;
    }
    if (elements.panelChapterName) {
        elements.panelChapterName.textContent = chapter ? chapter.name : '開示品次';
    }
    if (elements.panelRelativeNum) {
        if (episodeIndex !== -1) {
            if (chapter && chapter.id === 23) {
                elements.panelRelativeNum.textContent = `(第${episodeIndex + 1}集)`;
            } else {
                elements.panelRelativeNum.textContent = `(第${episodeIndex + 1}集/共${chapter ? chapter.total_episodes : 0}集)`;
            }
        } else {
            elements.panelRelativeNum.textContent = '';
        }
    }
    if (elements.panelEpisodeTitle) {
        elements.panelEpisodeTitle.textContent = episode.title;
    }
    
    elements.panelDate.textContent = `播出日期：${episode.raw_date || '未知'}`;

    if (elements.panelCompleteStats) {
        if (isLocalhost && appState.globalStats) {
            const count = appState.globalStats.episode_completions[episodeId] || 0;
            elements.panelCompleteStats.textContent = `${count} 人已完成`;
            elements.panelCompleteStats.style.display = 'block';
        } else {
            elements.panelCompleteStats.style.display = 'none';
        }
    }

    // 2. Set complete status button active state
    elements.panelCompleteBtn.style.display = 'flex';
    if (appState.progress.completed[episodeId]) {
        elements.panelCompleteBtn.classList.add('completed');
    } else {
        elements.panelCompleteBtn.classList.remove('completed');
    }

    // 3. Embed YouTube Frame
    elements.videoContainer.innerHTML = '';
    const fallbackDiv = document.getElementById('videoFallback');
    
    if (episode.youtube_url) {
        const ytIdMatch = episode.youtube_url.match(/v=([^&]+)/);
        if (ytIdMatch) {
            elements.videoContainer.classList.remove('hidden');
            if (fallbackDiv) fallbackDiv.classList.remove('hidden');
            if (elements.videoSearchBtn) {
                elements.videoSearchBtn.classList.remove('hidden');
                elements.videoSearchBtn.href = `https://www.youtube.com/results?search_query=${encodeURIComponent('靜思妙蓮華 第' + episode.episode_id + '集 ' + episode.title)}`;
            }
            const iframe = document.createElement('iframe');
            iframe.src = `https://www.youtube.com/embed/${ytIdMatch[1]}?autoplay=0&rel=0`;
            iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
            iframe.allowFullscreen = true;
            elements.videoContainer.appendChild(iframe);
        } else {
            elements.videoContainer.classList.add('hidden');
            if (fallbackDiv) fallbackDiv.classList.add('hidden');
            if (elements.videoSearchBtn) elements.videoSearchBtn.classList.add('hidden');
        }
    } else {
        elements.videoContainer.classList.add('hidden');
        if (fallbackDiv) fallbackDiv.classList.add('hidden');
        if (elements.videoSearchBtn) elements.videoSearchBtn.classList.add('hidden');
    }

    // 4. Populate Outline (summary)
    elements.sutraSummary.innerHTML = '';

    if (isNotesOnly && episode.full_text) {
        const bullets = episode.full_text.split('\n');
        bullets.forEach(b => {
            if (!b.trim()) return;
            const div = document.createElement('div');
            div.className = 'outline-item';
            div.innerHTML = `
                <p class="outline-text">${b.trim()}</p>
            `;
            elements.sutraSummary.appendChild(div);
        });
    } else if (episode.summary) {
        const bullets = episode.summary.split('\n');
        bullets.forEach(b => {
            if (!b.trim()) return;
            const div = document.createElement('div');
            div.className = 'outline-item';
            div.innerHTML = `
                <p class="outline-text">${b.trim()}</p>
            `;
            elements.sutraSummary.appendChild(div);
        });
    } else {
        const emptyDiv = document.createElement('div');
        emptyDiv.innerHTML = `<p style="color: var(--text-hint); text-align: center; padding: 20px;">本集尚無經文提綱</p>`;
        elements.sutraSummary.appendChild(emptyDiv);
    }

    // Gather Edit History for Outline
    let summaryHistory = [];
    if (episode.edit_history && episode.edit_history.length > 0) {
        episode.edit_history.forEach(item => {
            if (item.mode === 'summary') {
                if (item.comment) {
                    summaryHistory.push(`※ ${item.date} ${item.author} ${item.comment}`);
                } else {
                    summaryHistory.push(`※ ${item.date} 由 ${item.author} 修改`);
                }
            }
        });
    } else if (episode.is_edited && episode.edited_by && episode.edited_date) {
        summaryHistory.push(`※ ${episode.edited_date} 由 ${episode.edited_by} 修改`);
    }

    // Append bottom bar at Outline tab
    appendBottomInfoBar(elements.sutraSummary, sermonSourceText, true, summaryHistory);

    // 5. Populate Sermon Text (full_text)
    elements.sutraFullText.innerHTML = '';

    if (isNotesOnly) {
        elements.sutraFullText.innerHTML += `<p style="color: var(--text-hint); text-align: center; padding: 20px;">本集僅有導讀問答與心得筆記，無逐字稿內容</p>`;
    } else if (episode.full_text) {
        const paragraphs = episode.full_text.split('\n');
        paragraphs.forEach(p => {
            if (!p.trim()) return;
            const pNode = document.createElement('p');
            pNode.textContent = p.trim();
            elements.sutraFullText.appendChild(pNode);
        });
    } else {
        const emptyP = document.createElement('p');
        emptyP.style.color = "var(--text-hint)";
        emptyP.style.textAlign = "center";
        emptyP.style.padding = "20px";
        emptyP.textContent = "本集尚無逐字稿內容";
        elements.sutraFullText.appendChild(emptyP);
    }

    // Gather Edit History for Transcript
    let fullTextHistory = [];
    if (episode.edit_history && episode.edit_history.length > 0) {
        episode.edit_history.forEach(item => {
            if (item.mode === 'full_text') {
                if (item.comment) {
                    fullTextHistory.push(`※ ${item.date} ${item.author} ${item.comment}`);
                } else {
                    fullTextHistory.push(`※ ${item.date} 由 ${item.author} 修改`);
                }
            }
        });
    } else if (episode.is_edited && episode.edited_by && episode.edited_date && !isNotesOnly) {
        fullTextHistory.push(`※ ${episode.edited_date} 由 ${episode.edited_by} 修改`);
    }

    // Append bottom bar at Transcript tab
    appendBottomInfoBar(elements.sutraFullText, sermonSourceText, false, fullTextHistory);


    // 6. PDF Link
    if (episode.pdf_url) {
        elements.pdfDownloadLink.href = episode.pdf_url;
        elements.pdfDownloadLink.classList.remove('hidden');
    } else {
        elements.pdfDownloadLink.classList.add('hidden');
    }

    // Update navigation buttons state
    const curIdx = appState.episodesIndex.findIndex(ep => ep.episode_id === episodeId);
    if (curIdx > 0) {
        elements.prevEpisodeBtn.disabled = false;
        elements.prevEpisodeBtn.dataset.epId = appState.episodesIndex[curIdx - 1].episode_id;
        delete elements.prevEpisodeBtn.dataset.preReadIdx;
    } else {
        elements.prevEpisodeBtn.disabled = true;
        delete elements.prevEpisodeBtn.dataset.epId;
        delete elements.prevEpisodeBtn.dataset.preReadIdx;
    }

    if (curIdx !== -1 && curIdx < appState.episodesIndex.length - 1) {
        elements.nextEpisodeBtn.disabled = false;
        elements.nextEpisodeBtn.dataset.epId = appState.episodesIndex[curIdx + 1].episode_id;
        delete elements.nextEpisodeBtn.dataset.preReadIdx;
    } else {
        elements.nextEpisodeBtn.disabled = true;
        delete elements.nextEpisodeBtn.dataset.epId;
        delete elements.nextEpisodeBtn.dataset.preReadIdx;
    }

    // 7. Handle font size and tab styling
    setFontSize(appState.fontSize);
    setActiveTab('tab-summary');

    // 8. Open overlay panel
    elements.detailPanel.classList.remove('hidden');
    elements.detailPanel.classList.add('visible');

    // 9. Restore scroll position if resuming
    if (isResume) {
        elements.panelBody.scrollTop = appState.progress.lastScroll;
    } else {
        elements.panelBody.scrollTop = 0;
    }

    // 10. Update last read bookmark
    appState.progress.lastRead = episodeId;
    saveProgress();
    updateResumeBookmark();
}

// Close Episode Reader Panel
function closeEpisodeDetail() {
    // 1. Save scroll position of the panel before closing
    if (appState.activeEpisode) {
        appState.progress.lastScroll = elements.panelBody.scrollTop;
        saveProgress();
    }

    // 2. Hide Panel
    elements.detailPanel.classList.remove('visible');
    elements.detailPanel.classList.add('hidden');
    
    // 3. Clear Video frame to stop audio playback in background!
    elements.videoContainer.innerHTML = '';
    
    // 4. Reset state variables
    appState.activeEpisode = null;
}

// Toggle Complete button inside Detail Panel
function toggleActiveEpisodeCompleted() {
    if (!appState.activeEpisode) return;

    if (appState.activeEpisode._isPreRead) {
        const idx = appState.activeEpisode._preReadIdx;
        const key = `preread-${idx}`;
        const isCompleted = !appState.progress.completed[key];
        
        if (isCompleted) {
            appState.progress.completed[key] = true;
            elements.panelCompleteBtn.classList.add('completed');
        } else {
            delete appState.progress.completed[key];
            elements.panelCompleteBtn.classList.remove('completed');
        }

        saveProgress();

        // Sync inline checkbox in the card list
        const item = document.getElementById(`preReadItem-${idx}`);
        if (item) {
            if (isCompleted) item.classList.add('completed');
            else item.classList.remove('completed');
        }

        updatePreReadProgressBar();
        return;
    }

    const episodeId = appState.activeEpisode.episode_id;
    const isCompleted = !appState.progress.completed[episodeId];
    
    if (isCompleted) {
        appState.progress.completed[episodeId] = true;
        elements.panelCompleteBtn.classList.add('completed');
    } else {
        delete appState.progress.completed[episodeId];
        elements.panelCompleteBtn.classList.remove('completed');
    }

    saveProgress();

    // Sync inline checkbox in the card list
    const item = document.getElementById(`episodeItem-${episodeId}`);
    if (item) {
        if (isCompleted) item.classList.add('completed');
        else item.classList.remove('completed');
    }

    // Recalculate progress for this chapter
    const epHeader = appState.episodesIndex.find(ep => ep.episode_id === episodeId);
    updateChapterProgressBar(epHeader.chapter_id);

    // Sync completion status to server
    fetch(`./api/complete?episode_id=${episodeId}&completed=${isCompleted}`)
        .then(res => res.json())
        .then(data => {
            if (data.success && appState.globalStats) {
                appState.globalStats.episode_completions[episodeId] = data.count;
                // Update details stats UI
                if (elements.panelCompleteStats) {
                    elements.panelCompleteStats.textContent = `開示完成人次：${data.count} 人`;
                }
                // Sync inline label
                const countLabel = document.getElementById(`episodeCompleteCount-${episodeId}`);
                if (countLabel) {
                    countLabel.textContent = `（已有 ${data.count} 人完成）`;
                }
            }
        })
        .catch(err => console.warn("Failed to sync completion to server:", err.message));
}



// Update Single Chapter progress stats and bar UI
function updateChapterProgressBar(chapterId) {
    const stats = getChapterProgressStats(chapterId);
    const bar = document.getElementById(`chapterBar-${chapterId}`);
    const text = document.getElementById(`chapterStats-${chapterId}`);
    
    if (bar) bar.style.width = `${stats.percent}%`;
    if (text) text.textContent = `已讀 ${stats.completed}/${stats.total}`;
}

// Calculate and Update Global Progress card
function updateGlobalProgressBar() {
    const totalCount = 1885;

    let completedCount = 0;
    appState.episodesIndex.forEach(ep => {
        if (appState.progress.completed[ep.episode_id]) {
            completedCount++;
        }
    });

    const percent = Math.round((completedCount / totalCount) * 100);
    
    elements.globalPercent.textContent = `${percent}%`;
    elements.globalProgressBar.style.width = `${percent}%`;
    elements.globalStats.textContent = `已讀完 ${completedCount} 集 / 共 ${totalCount} 集`;
}

// Update Resume Card Shortcut on Header
function updateResumeBookmark() {
    const lastId = appState.progress.lastRead;
    if (lastId) {
        const ep = appState.episodesIndex.find(e => e.episode_id === lastId);
        if (ep) {
            elements.resumeTitle.textContent = `第 ${ep.episode_id} 集 - ${ep.title}`;
            elements.resumeCard.classList.remove('hidden');
            return;
        }
    }
    elements.resumeCard.classList.add('hidden');
}

// Navigate to Previous or Next Episode in Details Panel
function navigateToSiblingEpisode(direction) {
    if (!appState.activeEpisode) return;
    const btn = direction === -1 ? elements.prevEpisodeBtn : elements.nextEpisodeBtn;
    const siblingEpId = parseInt(btn.dataset.epId);
    if (!isNaN(siblingEpId)) {
        openEpisodeDetail(siblingEpId, false);
    }
}

// Special Intro Card Accordion Toggle
window.toggleIntroCard = function() {
    const card = document.getElementById('chapterCard-intro');
    const container = document.getElementById('episodeListContainer-intro');
    if (!card || !container) return;

    const isExpanded = card.classList.contains('expanded');

    // Close other chapters first
    document.querySelectorAll('.chapter-card.expanded').forEach(otherCard => {
        if (otherCard !== card) {
            otherCard.classList.remove('expanded');
            const otherContainer = otherCard.querySelector('.episode-list-container');
            if (otherContainer) {
                otherContainer.style.maxHeight = '0px';
                otherContainer.style.overflowY = 'hidden';
            }
        }
    });

    if (isExpanded) {
        card.classList.remove('expanded');
        container.style.maxHeight = '0px';
        container.style.overflowY = 'hidden';
    } else {
        card.classList.add('expanded');
        // Fit exactly the height of the two items
        container.style.maxHeight = container.scrollHeight + "px";
        container.style.overflowY = "hidden";
    }
};

// Open Special Intro Item Panel View (gatha / praise)
window.openSpecialIntroItem = function(type) {
    const isGatha = type === 'gatha';
    
    // Mock active episode representation
    appState.activeEpisode = {
        episode_id: 0,
        title: isGatha ? "開經偈" : "爐香讚",
        raw_date: "念誦",
        summary: isGatha ? 
                 "開經偈\n無上甚深微妙法，百千萬劫難遭遇。\n我今見聞得受持，願解如來真實義。" :
                 "爐香讚\n爐香乍爇。法界蒙薰。諸佛海會悉遙聞。隨處結祥雲。誠意方殷。諸佛現全身。\n南無香雲蓋菩薩摩訶薩（三稱）",
        full_text: isGatha ? 
                   "開經偈\n無上甚深微妙法，百千萬劫難遭遇。\n我今見聞得受持，願解如來真實義。" :
                   "爐香讚\n爐香乍爇。法界蒙薰。諸佛海會悉遙聞。隨處結祥雲。誠意方殷。諸佛現全身。\n南無香雲蓋菩薩摩訶薩（三稱）",
        chapter_id: 0,
        pdf_url: null,
        youtube_url: null
    };

    // Open detail panel overlay
    elements.detailPanel.classList.remove('hidden');
    elements.detailPanel.classList.add('visible');

    // Populate panel metadata
    if (elements.panelEpIdBadge) {
        elements.panelEpIdBadge.textContent = '前行';
    }
    if (elements.panelChapterName) {
        elements.panelChapterName.textContent = '前行念誦儀軌';
    }
    if (elements.panelRelativeNum) {
        elements.panelRelativeNum.textContent = '';
    }
    if (elements.panelEpisodeTitle) {
        elements.panelEpisodeTitle.textContent = isGatha ? "開經偈" : "爐香讚";
    }
    if (elements.panelDate) {
        elements.panelDate.textContent = '誦經前念誦';
    }

    // Hide completion actions
    elements.panelCompleteBtn.style.display = 'none';
    if (elements.panelCompleteStats) elements.panelCompleteStats.style.display = 'none';

    // Hide Video Containers
    elements.videoContainer.classList.add('hidden');
    elements.videoContainer.innerHTML = '';
    const fallbackDiv = document.getElementById('videoFallback');
    if (fallbackDiv) fallbackDiv.classList.add('hidden');

    // Disable Navigation inside detail panel
    elements.prevEpisodeBtn.disabled = true;
    elements.nextEpisodeBtn.disabled = true;
    if (elements.videoSearchBtn) elements.videoSearchBtn.classList.add('hidden');

    // Populate Sutra Summary (Outline Tab)
    if (isGatha) {
        elements.sutraSummary.innerHTML = `
            <div class="outline-item" style="display: block; text-align: center; padding: 40px 20px;">
                <p class="outline-text" style="font-size: 1.35rem; font-weight: bold; color: var(--accent-color); margin-bottom: 20px; text-align: center;">開經偈</p>
                <p class="outline-text" style="font-size: 1.25rem; line-height: 2.2; white-space: pre-line; color: var(--text-primary); font-weight: 500; text-align: center;">
                    無上甚深微妙法，百千萬劫難遭遇。
                    我今見聞得受持，願解如來真實義。
                </p>
            </div>
        `;
        elements.sutraFullText.innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <h3 style="font-size: 1.35rem; font-weight: bold; color: var(--accent-color); margin-bottom: 20px; text-align: center;">開經偈</h3>
                <p style="font-size: 1.25rem; line-height: 2.2; white-space: pre-line; color: var(--text-primary); font-weight: 500; text-align: center;">
                    無上甚深微妙法，百千萬劫難遭遇。
                    我今見聞得受持，願解如來真實義。
                </p>
            </div>
        `;
    } else {
        elements.sutraSummary.innerHTML = `
            <div class="outline-item" style="display: block; text-align: center; padding: 40px 20px;">
                <p class="outline-text" style="font-size: 1.35rem; font-weight: bold; color: var(--accent-color); margin-bottom: 20px; text-align: center;">爐香讚</p>
                <p class="outline-text" style="font-size: 1.25rem; line-height: 2.2; white-space: pre-line; color: var(--text-primary); font-weight: 500; text-align: center;">
                    爐香乍爇。法界蒙薰。諸佛海會悉遙聞。
                    隨處結祥雲。誠意方殷。諸佛現全身。
                    
                    南無香雲蓋菩薩摩訶薩（三稱）
                </p>
            </div>
        `;
        elements.sutraFullText.innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <h3 style="font-size: 1.35rem; font-weight: bold; color: var(--accent-color); margin-bottom: 20px; text-align: center;">爐香讚</h3>
                <p style="font-size: 1.25rem; line-height: 2.2; white-space: pre-line; color: var(--text-primary); font-weight: 500; text-align: center;">
                    爐香乍爇。法界蒙薰。諸佛海會悉遙聞。
                    隨處結祥雲。誠意方殷。諸佛現全身。
                    
                    南無香雲蓋菩薩摩訶薩（三稱）
                </p>
            </div>
        `;
    }

    // Hide edit and actions
    if (elements.editSummaryBtn) elements.editSummaryBtn.classList.add('hidden');
    if (elements.editFullTextBtn) elements.editFullTextBtn.classList.add('hidden');
    if (elements.editTitleBtn) elements.editTitleBtn.classList.add('hidden');
    elements.pdfDownloadLink.classList.add('hidden');

    // Configure theme and tab styles
    setFontSize(appState.fontSize);
    setActiveTab('tab-summary');

    // Scroll to top
    elements.panelBody.scrollTop = 0;
};

// Special Outro Card Accordion Toggle (懺悔 / 發願 / 皈依 / 回向)
window.toggleOutroCard = function() {
    const card = document.getElementById('chapterCard-outro');
    const container = document.getElementById('episodeListContainer-outro');
    if (!card || !container) return;

    const isExpanded = card.classList.contains('expanded');

    // Close other chapters first
    document.querySelectorAll('.chapter-card.expanded').forEach(otherCard => {
        if (otherCard !== card) {
            otherCard.classList.remove('expanded');
            const otherContainer = otherCard.querySelector('.episode-list-container');
            if (otherContainer) {
                otherContainer.style.maxHeight = '0px';
                otherContainer.style.overflowY = 'hidden';
            }
        }
    });

    if (isExpanded) {
        card.classList.remove('expanded');
        container.style.maxHeight = '0px';
        container.style.overflowY = 'hidden';
    } else {
        card.classList.add('expanded');
        // Fit exactly the height of the items
        container.style.maxHeight = container.scrollHeight + "px";
        container.style.overflowY = "hidden";
    }
};

// Open Special Outro Item Panel View (repentance / vow / refuge / dedication)
window.openSpecialOutroItem = function(type) {
    let title = "";
    let verse = "";
    
    if (type === 'repentance') {
        title = "懺悔";
        verse = "往昔所造諸惡業，皆由無始貪瞋癡，\n從身語意之所生，一切我今皆懺悔。";
    } else if (type === 'vow') {
        title = "發願";
        verse = "誠心誓願度眾生，正心誓願斷煩惱，\n信心誓願學法門，實心誓願成佛道。";
    } else if (type === 'refuge') {
        title = "皈依";
        verse = "自皈依佛，當願眾生，體解大道，發無上心。\n自皈依法，當願眾生，深入經藏，智慧如海。\n自皈依僧，當願眾生，統理大眾，一切無礙。";
    } else {
        title = "回向";
        verse = "願消三障諸煩惱，願得智慧真明了，\n普願罪障悉消除，世世常行菩薩道。";
    }

    // Mock active episode representation
    appState.activeEpisode = {
        episode_id: 0,
        title: title,
        raw_date: "念誦",
        summary: `${title}\n${verse}`,
        full_text: `${title}\n${verse}`,
        chapter_id: 0,
        pdf_url: null,
        youtube_url: null
    };

    // Open detail panel overlay
    elements.detailPanel.classList.remove('hidden');
    elements.detailPanel.classList.add('visible');

    // Populate panel metadata
    if (elements.panelEpIdBadge) {
        elements.panelEpIdBadge.style.display = ''; // Restore default display
        elements.panelEpIdBadge.textContent = '結行';
    }
    if (elements.panelChapterName) {
        elements.panelChapterName.textContent = '結行念誦儀軌';
    }
    if (elements.panelRelativeNum) {
        elements.panelRelativeNum.textContent = '';
    }
    if (elements.panelEpisodeTitle) {
        elements.panelEpisodeTitle.textContent = title;
    }
    if (elements.panelDate) {
        elements.panelDate.textContent = '誦經後念誦';
    }

    // Hide completion actions
    elements.panelCompleteBtn.style.display = 'none';
    if (elements.panelCompleteStats) elements.panelCompleteStats.style.display = 'none';

    // Hide Video Containers
    elements.videoContainer.classList.add('hidden');
    elements.videoContainer.innerHTML = '';
    const fallbackDiv = document.getElementById('videoFallback');
    if (fallbackDiv) fallbackDiv.classList.add('hidden');

    // Disable Navigation inside detail panel
    elements.prevEpisodeBtn.disabled = true;
    elements.nextEpisodeBtn.disabled = true;
    if (elements.videoSearchBtn) elements.videoSearchBtn.classList.add('hidden');

    // Populate Sutra Summary (Outline Tab)
    elements.sutraSummary.innerHTML = `
        <div class="outline-item" style="display: block; text-align: center; padding: 40px 20px;">
            <p class="outline-text" style="font-size: 1.35rem; font-weight: bold; color: var(--accent-color); margin-bottom: 20px; text-align: center;">${title}</p>
            <p class="outline-text" style="font-size: 1.25rem; line-height: 2.2; white-space: pre-line; color: var(--text-primary); font-weight: 500; text-align: center;">
                ${verse}
            </p>
        </div>
    `;

    // Populate Sermon Text (Transcript Tab)
    elements.sutraFullText.innerHTML = `
        <div style="text-align: center; padding: 40px 20px;">
            <h3 style="font-size: 1.35rem; font-weight: bold; color: var(--accent-color); margin-bottom: 20px; text-align: center;">${title}</h3>
            <p style="font-size: 1.25rem; line-height: 2.2; white-space: pre-line; color: var(--text-primary); font-weight: 500; text-align: center;">
                ${verse}
            </p>
        </div>
    `;

    // Hide edit and actions
    if (elements.editSummaryBtn) elements.editSummaryBtn.classList.add('hidden');
    if (elements.editFullTextBtn) elements.editFullTextBtn.classList.add('hidden');
    if (elements.editTitleBtn) elements.editTitleBtn.classList.add('hidden');
    elements.pdfDownloadLink.classList.add('hidden');

    // Configure theme and tab styles
    setFontSize(appState.fontSize);
    setActiveTab('tab-summary');

    // Scroll to top
    elements.panelBody.scrollTop = 0;
};

// Helper: close all expanded special/chapter cards except 'exceptCard'
function collapseOtherCards(exceptCard) {
    document.querySelectorAll('.chapter-card.expanded').forEach(otherCard => {
        if (otherCard !== exceptCard) {
            otherCard.classList.remove('expanded');
            const otherContainer = otherCard.querySelector('.episode-list-container');
            if (otherContainer) {
                otherContainer.style.maxHeight = '0px';
                otherContainer.style.overflowY = 'hidden';
            }
        }
    });
}

// Toggle Pre-Read Card Accordion (品前導讀)
window.togglePreReadCard = function() {
    const card = document.getElementById('chapterCard-preread');
    const container = document.getElementById('episodeListContainer-preread');
    if (!card || !container) return;
    const isExpanded = card.classList.contains('expanded');
    collapseOtherCards(card);
    if (isExpanded) {
        card.classList.remove('expanded');
        container.style.maxHeight = '0px';
        container.style.overflowY = 'hidden';
    } else {
        card.classList.add('expanded');
        const maxAllowedHeight = 315;
        const targetHeight = Math.min(container.scrollHeight, maxAllowedHeight);
        container.style.maxHeight = targetHeight + 'px';
        container.style.overflowY = container.scrollHeight > maxAllowedHeight ? 'auto' : 'hidden';
    }
};

// Toggle Intro Card Accordion (開經偈 / 爐香讚)
window.toggleIntroCard = function() {
    const card = document.getElementById('chapterCard-intro');
    const container = document.getElementById('episodeListContainer-intro');
    if (!card || !container) return;
    const isExpanded = card.classList.contains('expanded');
    collapseOtherCards(card);
    if (isExpanded) {
        card.classList.remove('expanded');
        container.style.maxHeight = '0px';
        container.style.overflowY = 'hidden';
    } else {
        card.classList.add('expanded');
        container.style.maxHeight = container.scrollHeight + 'px';
        container.style.overflowY = 'auto';
    }
};

// Toggle Outro Card Accordion (懺悔 / 發願 / 回向)
window.toggleOutroCard = function() {
    const card = document.getElementById('chapterCard-outro');
    const container = document.getElementById('episodeListContainer-outro');
    if (!card || !container) return;
    const isExpanded = card.classList.contains('expanded');
    collapseOtherCards(card);
    if (isExpanded) {
        card.classList.remove('expanded');
        container.style.maxHeight = '0px';
        container.style.overflowY = 'hidden';
    } else {
        card.classList.add('expanded');
        container.style.maxHeight = container.scrollHeight + 'px';
        container.style.overflowY = 'auto';
    }
};

// Open Pre-Read Detail Panel (品前導讀 detail panel, mirrors showDetailPanel)
window.openPreReadDetail = function(idx) {
    const items = window._preReadItems;
    if (!items || idx < 0 || idx >= items.length) return;
    const entry = items[idx];

    // Store active context so close/nav works
    appState.activeEpisode = {
        episode_id: null,
        _isPreRead: true,
        _preReadIdx: idx,
        title: entry.title,
        youtube_url: entry.url,
        chapter_id: null,
        pdf_url: null
    };

    // --- Populate metadata ---
    if (elements.panelEpIdBadge) {
        elements.panelEpIdBadge.style.display = ''; // Restore default display
        elements.panelEpIdBadge.textContent = idx + 1;
    }
    if (elements.panelChapterName) {
        elements.panelChapterName.textContent = '品前導讀';
    }
    if (elements.panelRelativeNum) {
        elements.panelRelativeNum.textContent = `(第${idx + 1}集/共${window._preReadItems.length}集)`;
    }
    if (elements.panelEpisodeTitle) elements.panelEpisodeTitle.textContent = entry.title;
    if (elements.panelDate) elements.panelDate.textContent = `大愛台 · 品前導讀影片`;

    // Show complete button
    elements.panelCompleteBtn.style.display = '';
    const key = `preread-${idx}`;
    const isCompleted = appState.progress.completed[key];
    if (isCompleted) {
        elements.panelCompleteBtn.classList.add('completed');
    } else {
        elements.panelCompleteBtn.classList.remove('completed');
    }
    if (elements.panelCompleteStats) elements.panelCompleteStats.style.display = 'none';

    // Show editTitleBtn only for admin (localhost); hide summary/fulltext edit buttons
    const isLocalhost = isLocalEnvironment();
    if (elements.editTitleBtn) {
        if (isLocalhost) elements.editTitleBtn.classList.remove('hidden');
        else elements.editTitleBtn.classList.add('hidden');
    }
    if (elements.editSummaryBtn) {
        if (isLocalhost) elements.editSummaryBtn.classList.remove('hidden');
        else elements.editSummaryBtn.classList.add('hidden');
    }
    if (elements.editFullTextBtn) {
        if (isLocalhost) elements.editFullTextBtn.classList.remove('hidden');
        else elements.editFullTextBtn.classList.add('hidden');
    }

    // Hide PDF link
    elements.pdfDownloadLink.classList.add('hidden');

    // --- Embed YouTube ---
    elements.videoContainer.innerHTML = '';
    const fallbackDiv = document.getElementById('videoFallback');
    // Support both ?v= and youtu.be/ formats
    const ytIdMatch = entry.url.match(/(?:v=|youtu\.be\/)([^?&]+)/);
    if (ytIdMatch) {
        elements.videoContainer.classList.remove('hidden');
        if (fallbackDiv) fallbackDiv.classList.remove('hidden');
        if (elements.videoSearchBtn) {
            elements.videoSearchBtn.classList.remove('hidden');
            const searchQuery = encodeURIComponent(entry.title);
            elements.videoSearchBtn.href = `https://www.youtube.com/results?search_query=${searchQuery}`;
            elements.videoSearchBtn.title = `搜尋「${entry.title}」`;
        }
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube.com/embed/${ytIdMatch[1]}?autoplay=0&rel=0`;
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        iframe.allowFullscreen = true;
        elements.videoContainer.appendChild(iframe);
    } else {
        elements.videoContainer.classList.add('hidden');
        if (fallbackDiv) fallbackDiv.classList.add('hidden');
    }

    // --- Outline tab (大綱) ---
    elements.sutraSummary.innerHTML = '';
    if (entry.summary && entry.summary.trim()) {
        entry.summary.split('\n').forEach(line => {
            if (!line.trim()) return;
            const div = document.createElement('div');
            div.className = 'outline-item';
            div.innerHTML = `<p class="outline-text">${line.trim()}</p>`;
            elements.sutraSummary.appendChild(div);
        });
    } else {
        elements.sutraSummary.innerHTML += `
            <div class="outline-item" style="display:block; text-align:center; padding: 24px 16px 8px;">
                <p class="outline-text" style="font-size:1.1rem; font-weight:bold; color:var(--accent-color); margin-bottom:12px;">${entry.title}</p>
                <p class="outline-text" style="color:var(--text-secondary); font-size:0.9rem;">本影片為大愛台製作之「品前導讀」，<br>帶領您在正式聆聽上人開示前先掌握本品要旨。<br><br>（可由管理員在此輸入大綱）</p>
            </div>`;
    }

    // Gather Edit History for Outline
    let summaryHistory = [];
    if (entry.edit_history && entry.edit_history.length > 0) {
        entry.edit_history.forEach(item => {
            if (item.mode === 'summary') {
                if (item.comment) {
                    summaryHistory.push(`※ ${item.date} ${item.author} ${item.comment}`);
                } else {
                    summaryHistory.push(`※ ${item.date} 由 ${item.author} 修改`);
                }
            }
        });
    }

    // Append bottom bar at Outline tab
    appendBottomInfoBar(elements.sutraSummary, `※ 以上內容精選自「大愛台YouTube」`, true, summaryHistory);

    // --- Transcript tab (逐字稿) ---
    elements.sutraFullText.innerHTML = '';
    if (entry.full_text && entry.full_text.trim()) {
        entry.full_text.split('\n').forEach(line => {
            if (!line.trim()) return;
            const p = document.createElement('p');
            p.textContent = line.trim();
            elements.sutraFullText.appendChild(p);
        });
    } else {
        elements.sutraFullText.innerHTML = `
            <div style="text-align:center; padding: 24px 16px 8px;">
                <p style="font-size:1.1rem; font-weight:bold; color:var(--accent-color); margin-bottom:12px;">${entry.title}</p>
                <p style="color:var(--text-hint); font-size:0.9rem;">尚無逐字稿，可由管理員新增。</p>
            </div>`;
    }

    // Gather Edit History for Transcript
    let fullTextHistory = [];
    if (entry.edit_history && entry.edit_history.length > 0) {
        entry.edit_history.forEach(item => {
            if (item.mode === 'full_text') {
                if (item.comment) {
                    fullTextHistory.push(`※ ${item.date} ${item.author} ${item.comment}`);
                } else {
                    fullTextHistory.push(`※ ${item.date} 由 ${item.author} 修改`);
                }
            }
        });
    }

    // Append bottom bar at Transcript tab
    appendBottomInfoBar(elements.sutraFullText, `※ 以上內容精選自「大愛台YouTube」`, false, fullTextHistory);


    // --- Navigation: prev / next among pre-read items ---
    if (idx > 0) {
        elements.prevEpisodeBtn.disabled = false;
        elements.prevEpisodeBtn.dataset.preReadIdx = idx - 1;
        delete elements.prevEpisodeBtn.dataset.epId;
    } else {
        elements.prevEpisodeBtn.disabled = true;
        delete elements.prevEpisodeBtn.dataset.preReadIdx;
    }
    if (idx < items.length - 1) {
        elements.nextEpisodeBtn.disabled = false;
        elements.nextEpisodeBtn.dataset.preReadIdx = idx + 1;
        delete elements.nextEpisodeBtn.dataset.epId;
    } else {
        elements.nextEpisodeBtn.disabled = true;
        delete elements.nextEpisodeBtn.dataset.preReadIdx;
    }

    // --- Open panel ---
    setFontSize(appState.fontSize);
    setActiveTab('tab-summary');
    elements.detailPanel.classList.remove('hidden');
    elements.detailPanel.classList.add('visible');
    elements.panelBody.scrollTop = 0;
};
