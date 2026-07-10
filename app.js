// Google Sheets Web App URL (leave empty "" to run in offline local JSON mode)
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzBixT1lzyqQY5JqsjOfXeHwd3FD0msKQnpCwBrfpA-YfpFHuboBFABLeUXzr1KJx1-2Q/exec";

// 第三方快速登入設定 (請於申請 Google Client ID 與 LINE LIFF ID 後填入以下內容以啟用)
const GOOGLE_CLIENT_ID = "156335217259-n382frpln7k34j0j5v2csgphct2urtt1.apps.googleusercontent.com"; // 靜思妙蓮華 Google 登入 Client ID
const LINE_LIFF_ID = "2010645060-9m47FId4"; // 靜思妙蓮華 LINE 登入 LIFF ID

// Global State Management
let APP_VERSION = "2.7"; // Fallback version, dynamically updated from stylesheet version
let appState = {
    chapters: [],
    episodesIndex: [],
    rawEpisodesCache: null,
    chapterEpisodesCache: {}, // Maps chapterId -> full episode lists
    episodeDetailsCache: {},  // Maps episodeId -> full episode object
    progress: {
        completed: {}, // Map of episodeId -> true (derived from completedEvents)
        completedEvents: {}, // Map of episodeId -> timestamp (positive=checked, negative=unchecked)
        lastRead: null, // Last read episodeId
        lastReadTs: 0,  // Timestamp of the lastRead update (for cross-device merge)
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
    themeToggle: document.getElementById('themeToggle'),
    themeLabel: document.getElementById('themeLabel'),
    globalPercent: document.getElementById('globalPercent'),
    globalProgressBar: document.getElementById('globalProgressBar'),
    globalStats: document.getElementById('globalStats'),
    progressCard: document.getElementById('progressCard'),
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
    zenModeBtn: document.getElementById('zenModeBtn'),
    fontDecBtn: document.getElementById('fontDecBtn'),
    fontIncBtn: document.getElementById('fontIncBtn'),
    sutraSummary: document.getElementById('sutraSummary'),
    sutraFullText: document.getElementById('sutraFullText'),
    panelBody: document.querySelector('#detailPanel .panel-body'),
    searchInput: document.getElementById('searchInput'),
    searchIcon: document.getElementById('searchIcon'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    searchResults: document.getElementById('searchResults'),
    preloadToggle: document.getElementById('preloadToggle'),
    preloadLabel: document.getElementById('preloadLabel'),
    preloadInfoBtn: document.getElementById('preloadInfoBtn'),
    preloadInfoModal: document.getElementById('preloadInfoModal'),
    closePreloadInfoBtn: document.getElementById('closePreloadInfoBtn'),
    understandPreloadBtn: document.getElementById('understandPreloadBtn'),
    settingsToggleBtn: document.getElementById('settingsToggleBtn'),
    settingsDropdown: document.getElementById('settingsDropdown'),
    settingsVersionInfo: document.getElementById('settingsVersionInfo'),
    versionHistoryModal: document.getElementById('versionHistoryModal'),
    closeVersionBtn: document.getElementById('closeVersionBtn'),
    understandVersionBtn: document.getElementById('understandVersionBtn'),
    aboutWebsiteBtn: document.getElementById('aboutWebsiteBtn'),
    aboutWebsiteModal: document.getElementById('aboutWebsiteModal'),
    closeAboutBtn: document.getElementById('closeAboutBtn'),
    understandAboutBtn: document.getElementById('understandAboutBtn'),
    syncStateContainer: document.getElementById('syncStateContainer'),
    syncLoggedOutView: document.getElementById('syncLoggedOutView'),
    syncLoggedInView: document.getElementById('syncLoggedInView'),
    syncAccountNameDisplay: document.getElementById('syncAccountNameDisplay'),
    openSyncModalBtn: document.getElementById('openSyncModalBtn'),
    manualSyncBtn: document.getElementById('manualSyncBtn'),
    syncInfoBtn: document.getElementById('syncInfoBtn'),
    syncInfoModal: document.getElementById('syncInfoModal'),
    closeSyncInfoBtn: document.getElementById('closeSyncInfoBtn'),
    logoutSyncBtn: document.getElementById('logoutSyncBtn'),
    syncAccountModal: document.getElementById('syncAccountModal'),
    closeSyncModalBtn: document.getElementById('closeSyncModalBtn'),
    syncTabLoginBtn: document.getElementById('syncTabLoginBtn'),
    syncTabRegisterBtn: document.getElementById('syncTabRegisterBtn'),
    syncAccountInput: document.getElementById('syncAccountInput'),
    syncPasswordInput: document.getElementById('syncPasswordInput'),
    syncSubmitBtn: document.getElementById('syncSubmitBtn'),
    syncErrorMessage: document.getElementById('syncErrorMessage'),
    syncModalTitle: document.getElementById('syncModalTitle'),
    googleAuthBtn: document.getElementById('googleAuthBtn'),
    lineAuthBtn: document.getElementById('lineAuthBtn'),
    linkGoogleBtn: document.getElementById('linkGoogleBtn'),
    linkLineBtn: document.getElementById('linkLineBtn'),
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
    // Dynamically extract version string from app.css stylesheet link to use for query cache-busting
    const cssLink = document.querySelector('link[href*="app.css"]');
    if (cssLink) {
        const match = cssLink.getAttribute('href').match(/v=([\d.]+)/);
        if (match) {
            APP_VERSION = match[1];
        }
    }

    loadSettingsFromStorage();
    initTheme();
    initEventListeners();

    // Automatically initialize LINE LIFF on page load if ID is configured
    if (typeof LINE_LIFF_ID !== 'undefined' && LINE_LIFF_ID !== "" && typeof liff !== 'undefined') {
        liff.init({ liffId: LINE_LIFF_ID })
            .then(() => {
                window._liffInitialized = true;
                if (liff.isLoggedIn()) {
                    liff.getProfile().then(profile => {
                        const lineUserId = "line-" + profile.userId;
                        const lineDisplayName = profile.displayName;
                        
                        const pendingLinkPrimary = localStorage.getItem('jingsi_link_line_pending');
                        if (pendingLinkPrimary) {
                            localStorage.removeItem('jingsi_link_line_pending');
                            
                            fetch(GOOGLE_SCRIPT_URL, {
                                method: 'POST',
                                body: JSON.stringify({
                                    action: 'linkAccount',
                                    primary_key: pendingLinkPrimary,
                                    secondary_key: lineUserId
                                })
                            })
                            .then(r => r.json())
                            .then(res => {
                                if (res.success) {
                                    alert(`成功將 LINE 帳號 (${lineDisplayName}) 連結至目前進度！\n兩邊帳號已完成共享。`);
                                    localStorage.setItem('jingsi_sync_key', pendingLinkPrimary);
                                    updateSyncUI();
                                    downloadCloudSync(true);
                                } else {
                                    alert("連結 LINE 失敗：" + (res.error || "未知錯誤"));
                                }
                            })
                            .catch(err => console.error("Pending link failed:", err));
                        } else {
                            localStorage.setItem('jingsi_sync_key', lineUserId);
                            updateSyncUI();
                            if (elements.syncAccountNameDisplay) {
                                elements.syncAccountNameDisplay.textContent = `LINE (${lineDisplayName})`;
                            }
                            downloadCloudSync(true);
                        }
                    });
                }
            })
            .catch(err => console.warn("Background LIFF init failed:", err));
    }

    fetchMetadata();

    // Automatically trigger cloud download on page load if logged in with Google/Custom account
    const currentSyncKey = localStorage.getItem('jingsi_sync_key');
    if (currentSyncKey && !currentSyncKey.startsWith('line-')) {
        downloadCloudSync(true);
    }

    // Start background auto-sync polling every 20 seconds if logged in (Real-time Sync)
    setInterval(() => {
        if (localStorage.getItem('jingsi_sync_key')) {
            downloadCloudSync(true);
        }
    }, 20000);

    // Sync localStorage edits to disk automatically on localhost
    if (isLocalEnvironment()) {
        const prereadEdits = localStorage.getItem('jingsi_preread_edits');
        const localEdits = localStorage.getItem('jingsi_local_edits');
        if (prereadEdits || localEdits) {
            fetch('./api/sync_local_edits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prereadEdits, localEdits })
            })
            .then(res => res.json())
            .then(res => {
                if (res.success) {
                    localStorage.removeItem('jingsi_preread_edits');
                    localStorage.removeItem('jingsi_local_edits');
                    if (res.synced) {
                        console.log("Successfully synced localStorage edits to local disk JSON files!");
                        alert("偵測到您瀏覽器快取中的標題/大綱修改！已自動寫入您硬碟中的 JSON 檔案。現在請開啟 GitHub Desktop 上傳變更。");
                    }
                }
            })
            .catch(err => console.warn("Failed to sync local edits to disk:", err));
        }
    }
});

// Load progress & preferences from LocalStorage
function loadSettingsFromStorage() {
    // 1. Progress
    const savedProgress = localStorage.getItem('jingsi_progress');
    if (savedProgress) {
        try {
            appState.progress = JSON.parse(savedProgress);
            if (!appState.progress.completed) appState.progress.completed = {};
            // Migration: if no completedEvents yet, derive from existing completed map
            if (!appState.progress.completedEvents) {
                const now = Date.now();
                appState.progress.completedEvents = {};
                Object.keys(appState.progress.completed).forEach(function(id) {
                    appState.progress.completedEvents[id] = now; // treat all existing as checked "now"
                });
            }
            if (!appState.progress.lastReadTs) appState.progress.lastReadTs = 0;
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
    } else {
        // Auto-detect: first check system preference
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
        
        if (prefersDark) {
            appState.theme = 'dark-mode';
        } else if (prefersLight) {
            appState.theme = 'sepia-mode';
        } else {
            // No system preference found, check local time: 06:00 to 18:00 is light/sepia, else dark
            const currentHour = new Date().getHours();
            if (currentHour >= 6 && currentHour < 18) {
                appState.theme = 'sepia-mode';
            } else {
                appState.theme = 'dark-mode';
            }
        }
    }

    // 4. Sync Key
    // We do not auto-generate a key anymore; they can choose to log in to sync or browse anonymously.
    updateSyncUI();
}

function updateSyncUI() {
    const syncToggle = document.getElementById('syncToggle');
    if (!syncToggle) return;
    
    const syncKey = localStorage.getItem('jingsi_sync_key');
    const syncLoginOptions = document.getElementById('syncLoginOptions');
    const syncConnectedDetails = document.getElementById('syncConnectedDetails');
    const syncAccountNameDisplay = document.getElementById('syncAccountNameDisplay');
    const syncProviderIcons = document.getElementById('syncProviderIcons');
    const linkLineBtn = document.getElementById('linkLineBtn');
    const googleLinkBtnWrapper = document.getElementById('googleLinkBtnWrapper');
    const accountLinkingContainer = document.getElementById('accountLinkingContainer');
    
    if (syncKey) {
        syncToggle.checked = true;
        if (syncLoginOptions) syncLoginOptions.classList.add('hidden');
        if (syncConnectedDetails) syncConnectedDetails.classList.remove('hidden');
        
        if (syncAccountNameDisplay) {
            if (syncKey.startsWith('line-')) {
                if (!syncAccountNameDisplay.textContent.startsWith('LINE (')) {
                    syncAccountNameDisplay.textContent = "LINE 帳號";
                }
            } else {
                syncAccountNameDisplay.textContent = syncKey;
            }
        }
        
        let showGoogle = syncKey.includes('@');
        let showLine = syncKey.startsWith('line-');
        
        const linkedProviders = (appState.progress && appState.progress.linkedProviders) || [];
        if (linkedProviders.includes('google')) showGoogle = true;
        if (linkedProviders.includes('line')) showLine = true;
        
        if (syncProviderIcons) {
            let iconsHtml = '';
            
            if (showGoogle) {
                iconsHtml += `
                    <span style="display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; background-color: white; border-radius: 3px; padding: 2px; flex-shrink: 0;" title="Google 已同步">
                        <svg width="12" height="12" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                        </svg>
                    </span>
                `;
            }
            if (showLine) {
                iconsHtml += `
                    <span style="display: inline-flex; align-items: center; justify-content: center; width: 15px; height: 15px; background-color: #06C755; border-radius: 4px; padding: 1.5px; margin-left: 2px;" title="LINE 已同步">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                            <path d="M24 10.3c0-4.86-5.38-8.8-12-8.8s-12 3.94-12 8.8c0 4.36 4.27 8 10 8.7a1.07 1.07 0 0 1 .68.96c0 .48-.25 1.25-.3 1.74a.43.43 0 0 0 .66.42c1.47-.98 4.24-2.85 5.56-3.87 4.19-.34 7.4-3.52 7.4-7.95zm-15.54 2.88H7.13a.47.47 0 0 1-.47-.47V7.83a.47.47 0 0 1 .47-.47h.33a.47.47 0 0 1 .47.47v4.1h1.07a.47.47 0 0 1 .47.47v.3a.47.47 0 0 1-.47.48zm2.44 0h-.34a.47.47 0 0 1-.47-.47V7.83a.47.47 0 0 1 .47-.47h.34a.47.47 0 0 1 .47.47v4.88a.47.47 0 0 1-.47.47zm5.55 0h-.31a.48.48 0 0 1-.42-.25L13.7 9v3.71a.47.47 0 0 1-.47.47h-.34a.47.47 0 0 1-.47-.47V7.83a.47.47 0 0 1 .47-.47h.31a.48.48 0 0 1 .42.25l2.43 3.49V7.83a.47.47 0 0 1 .47-.47h.34a.47.47 0 0 1 .47.47v4.88a.47.47 0 0 1-.47.47zm3.89-1.21h-1.07V11h1.07a.47.47 0 0 1 .47.47v.3a.47.47 0 0 1-.47.48zm0-1.74h-1.07V9.1h1.07a.47.47 0 0 1 .47.47v.3a.47.47 0 0 1-.47.47zm0-1.73h-1.07V7.83h1.07a.47.47 0 0 1 .47.47v.3a.47.47 0 0 1-.47.47h.33z"/>
                        </svg>
                    </span>
                `;
            }
            syncProviderIcons.innerHTML = iconsHtml;
        }
        
        // Handle linking controls visibility
        if (showGoogle && showLine) {
            // Both linked! Hide the entire section.
            if (accountLinkingContainer) accountLinkingContainer.style.display = 'none';
        } else {
            if (accountLinkingContainer) accountLinkingContainer.style.display = 'flex';
            
            if (showLine) {
                // LINE is connected, show Google link button if not connected
                if (linkLineBtn) linkLineBtn.style.display = 'none';
                if (googleLinkBtnWrapper) {
                    googleLinkBtnWrapper.style.display = 'flex';
                    if (!googleLinkBtnWrapper.querySelector('#linkGoogleBtn')) {
                        googleLinkBtnWrapper.innerHTML = `
                            <button id="linkGoogleBtn" class="about-website-btn" style="padding: 6px; font-size: 0.7rem; border-radius: 6px; border: 1px solid var(--border-color); background: none; color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; font-weight: 500;">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                                </svg>
                                <span>連結 Google 帳號以共享進度</span>
                            </button>
                        `;
                        const dBtn = document.getElementById('linkGoogleBtn');
                        if (dBtn) {
                            dBtn.addEventListener('click', () => {
                                if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === "") {
                                    alert("本站已支援連結 Google 帳號！請於設定中填入 Google Client ID 即可啟用。");
                                    return;
                                }
                                const currentSyncKey = localStorage.getItem('jingsi_sync_key');
                                if (!currentSyncKey) return;
                                
                                google.accounts.id.initialize({
                                    client_id: GOOGLE_CLIENT_ID,
                                    callback: (response) => {
                                        try {
                                            const token = response.credential;
                                            const payload = JSON.parse(atob(token.split('.')[1]));
                                            const email = payload.email;
                                            if (email) {
                                                callLinkAccountAPI(currentSyncKey, email, `成功將 Google 帳號 (${email}) 連結至目前進度！\n兩邊帳號已完成共享。`);
                                            }
                                        } catch(e) {
                                            alert("解析 Google 憑證失敗！");
                                        }
                                    },
                                    auto_select: false
                                });
                                google.accounts.id.prompt();
                            });
                        }
                    }
                }
            } else {
                // Google is connected, show LINE link button if not connected
                if (linkLineBtn) linkLineBtn.style.display = 'flex';
                if (googleLinkBtnWrapper) googleLinkBtnWrapper.style.display = 'none';
            }
        }
    } else {
        syncToggle.checked = false;
        if (syncLoginOptions) syncLoginOptions.classList.add('hidden');
        if (syncConnectedDetails) syncConnectedDetails.classList.add('hidden');
        if (syncProviderIcons) syncProviderIcons.innerHTML = '';
        if (syncAccountNameDisplay) syncAccountNameDisplay.textContent = '';
    }
}

// Save progress to LocalStorage
function saveProgress() {
    localStorage.setItem('jingsi_progress', JSON.stringify(appState.progress));
    updateGlobalProgressBar();

    // Auto-sync in the background if sync key exists!
    const syncKey = localStorage.getItem('jingsi_sync_key');
    if (syncKey && typeof GOOGLE_SCRIPT_URL !== 'undefined' && GOOGLE_SCRIPT_URL !== "") {
        const payload = {
            action: 'saveUserProgress',
            sync_key: syncKey,
            last_read: appState.progress.lastRead || "",
            last_read_ts: appState.progress.lastReadTs || 0,
            completed_list: Object.keys(appState.progress.completed),      // backward compat
            completed_events: appState.progress.completedEvents || {}       // new: timestamp map
        };
        fetch(`${GOOGLE_SCRIPT_URL}?action=saveUserProgress`, {
            method: 'POST',
            body: JSON.stringify(payload)
        })
        .then(r => r.json())
        .then(res => {
            if (res.success) {
                console.log("Reading progress auto-synced to cloud.");
            }
        })
        .catch(err => console.warn("Failed to auto-sync progress:", err));
    }
}

// Initialize Theme
function initTheme() {
    if (appState.theme === 'sepia-mode') {
        document.body.classList.remove('dark-mode');
        document.body.classList.add('sepia-mode');
        if (elements.themeToggle) elements.themeToggle.checked = true;
    } else {
        document.body.classList.remove('sepia-mode');
        document.body.classList.add('dark-mode');
        if (elements.themeToggle) elements.themeToggle.checked = false;
    }
}

// Set Theme Mode (Light/Sepia = true, Dark = false)
function setThemeMode(isLight) {
    if (isLight) {
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

// ----------------- Cross-Device Progress Sync Core Functions -----------------
function uploadCloudSync(quiet = false) {
    const syncKey = localStorage.getItem('jingsi_sync_key');
    if (!syncKey) return Promise.resolve();
    
    if (typeof GOOGLE_SCRIPT_URL === 'undefined' || GOOGLE_SCRIPT_URL === "") {
        return Promise.resolve();
    }
    
    const payload = {
        action: 'saveUserProgress',
        sync_key: syncKey,
        last_read: appState.progress.lastRead || "",
        last_read_ts: appState.progress.lastReadTs || 0,
        completed_list: Object.keys(appState.progress.completed),      // backward compat
        completed_events: appState.progress.completedEvents || {}       // new: timestamp map
    };
    
    return fetch(`${GOOGLE_SCRIPT_URL}?action=saveUserProgress`, {
        method: 'POST',
        body: JSON.stringify(payload)
    })
    .then(r => r.json())
    .then(res => {
        if (res.success) {
            console.log("Progress saved to cloud.");
            if (!quiet) alert("手動上傳備份成功！");
        } else {
            if (!quiet) alert("備份失敗：" + (res.error || "未知錯誤"));
        }
    })
    .catch(err => {
        console.error("Upload sync failed:", err);
        if (!quiet) alert("上傳失敗，請檢查網路連線！");
    });
}

function downloadCloudSync(quiet = false) {
    const syncKey = localStorage.getItem('jingsi_sync_key');
    if (!syncKey) return Promise.resolve();
    
    if (typeof GOOGLE_SCRIPT_URL === 'undefined' || GOOGLE_SCRIPT_URL === "") {
        return Promise.resolve();
    }
    
    if (!quiet && elements.manualSyncBtn) {
        elements.manualSyncBtn.disabled = true;
        elements.manualSyncBtn.textContent = "🔄 同步中...";
    }
    
    return fetch(`${GOOGLE_SCRIPT_URL}?action=getUserProgress&sync_key=${encodeURIComponent(syncKey)}`)
        .then(r => r.json())
        .then(res => {
            if (res.success && res.data) {
                const cloudData = res.data;
                let hasChanges = false;
                
                // --- Last-Write-Wins merge for lastRead ---
                const cloudLastReadTs = cloudData.last_read_ts || 0;
                const localLastReadTs = appState.progress.lastReadTs || 0;
                if (cloudData.last_read && cloudLastReadTs > localLastReadTs) {
                    appState.progress.lastRead = cloudData.last_read;
                    appState.progress.lastReadTs = cloudLastReadTs;
                    hasChanges = true;
                }
                
                // --- Last-Write-Wins merge for completedEvents ---
                const localEvents = appState.progress.completedEvents || {};
                let cloudEvents = cloudData.completed_events || {};
                
                // Fallback: if server has no events yet but has completed_list, treat list entries
                // as events with timestamp 1 (very old) so local changes always win over legacy data
                if (Object.keys(cloudEvents).length === 0 && Array.isArray(cloudData.completed_list)) {
                    cloudData.completed_list.forEach(id => {
                        if (!localEvents[id]) {  // only apply if local has no record at all
                            cloudEvents[id] = 1;
                        }
                    });
                }
                
                // Merge: for each id, keep the record with the larger absolute timestamp
                const allIds = new Set([...Object.keys(localEvents), ...Object.keys(cloudEvents)]);
                allIds.forEach(id => {
                    const localTs  = localEvents[id]  || 0;
                    const cloudTs  = cloudEvents[id]  || 0;
                    const localAbs = Math.abs(localTs);
                    const cloudAbs = Math.abs(cloudTs);
                    
                    if (cloudAbs > localAbs) {
                        // Cloud is newer → adopt cloud's decision
                        appState.progress.completedEvents[id] = cloudTs;
                        if (cloudTs > 0) {
                            appState.progress.completed[id] = true;
                        } else {
                            delete appState.progress.completed[id];
                        }
                        hasChanges = true;
                    }
                    // else: local is newer or equal → keep local (no-op)
                });
                
                if (Array.isArray(cloudData.linked_providers)) {
                    const currentProviders = appState.progress.linkedProviders || [];
                    if (JSON.stringify(currentProviders) !== JSON.stringify(cloudData.linked_providers)) {
                        appState.progress.linkedProviders = cloudData.linked_providers;
                        hasChanges = true;
                    }
                }
                
                if (hasChanges) {
                    localStorage.setItem('jingsi_progress', JSON.stringify(appState.progress));
                    updateGlobalProgressBar();
                    if (window._renderPreReadList) window._renderPreReadList();
                    renderChapterList();
                    updateResumeBookmark();
                    
                    // Push local-newer entries back up to cloud so all devices converge
                    uploadCloudSync(true);
                    
                    if (!quiet) {
                        alert("閱讀紀錄已成功與雲端同步並合併！");
                    }
                } else {
                    if (!quiet) {
                        alert("您的紀錄已是最新狀態，無需同步。");
                    }
                }
                
                // Always refresh the sync UI (icons/toggle) after download
                updateSyncUI();
            }
        })
        .finally(() => {
            if (!quiet && elements.manualSyncBtn) {
                elements.manualSyncBtn.disabled = false;
                elements.manualSyncBtn.textContent = "🔄 手動同步";
            }
        });
}

window._downloadCloudSync = downloadCloudSync;

// Bind UI Listeners
function initEventListeners() {
    if (elements.themeToggle) {
        elements.themeToggle.addEventListener('change', (e) => {
            setThemeMode(e.target.checked);
        });
    }
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
        const lastRead = appState.progress.lastRead;
        if (lastRead) {
            if (typeof lastRead === 'string' && lastRead.startsWith('preread-')) {
                const idx = parseInt(lastRead.replace('preread-', ''), 10);
                if (typeof window.openPreReadDetail === 'function') {
                    window.openPreReadDetail(idx);
                }
            } else {
                openEpisodeDetail(parseInt(lastRead, 10), true);
            }
        }
    });

    // Zen Mode (Full-screen Reading Mode) Toggle
    if (elements.zenModeBtn) {
        elements.zenModeBtn.addEventListener('click', () => {
            appState.zenMode = !appState.zenMode;
            const panel = document.getElementById('detailPanel');
            if (panel) {
                if (appState.zenMode) {
                    panel.classList.add('zen-mode');
                    elements.zenModeBtn.classList.add('active');
                } else {
                    panel.classList.remove('zen-mode');
                    elements.zenModeBtn.classList.remove('active');
                }
            }
        });
    }

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
            handleSearchTyping(query);
        });

        // Trigger search on Enter keypress
        elements.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                triggerSearchSubmit();
            }
        });
    }

    // Trigger search on search icon click
    if (elements.searchIcon) {
        elements.searchIcon.addEventListener('click', () => {
            triggerSearchSubmit();
        });
    }

    if (elements.clearSearchBtn) {
        elements.clearSearchBtn.addEventListener('click', () => {
            elements.searchInput.value = '';
            handleSearchTyping('');
        });
    }

    // -------------------------------------------------------------
    // Detail Panel Hamburger Menu & In-Page Search Event Listeners
    // -------------------------------------------------------------
    const menuToggleBtn = document.getElementById('menuToggleBtn');
    const actionMenuDropdown = document.getElementById('actionMenuDropdown');
    const panelSearchToggleBtn = document.getElementById('panelSearchToggleBtn');
    const panelSearchBar = document.getElementById('panelSearchBar');
    const panelSearchInput = document.getElementById('panelSearchInput');
    const clearPanelSearchBtn = document.getElementById('clearPanelSearchBtn');

    if (menuToggleBtn && actionMenuDropdown) {
        menuToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            actionMenuDropdown.classList.toggle('hidden');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!menuToggleBtn.contains(e.target) && !actionMenuDropdown.contains(e.target)) {
                actionMenuDropdown.classList.add('hidden');
            }
        });
    }

    // Toggle inline search bar from hamburger menu
    if (panelSearchToggleBtn && panelSearchBar && panelSearchInput) {
        panelSearchToggleBtn.addEventListener('click', () => {
            actionMenuDropdown.classList.add('hidden'); // Close menu
            const isHidden = panelSearchBar.classList.contains('hidden');
            if (isHidden) {
                panelSearchBar.classList.remove('hidden');
                panelSearchInput.focus();
            } else {
                panelSearchBar.classList.add('hidden');
                panelSearchInput.value = '';
                if (clearPanelSearchBtn) clearPanelSearchBtn.classList.add('hidden');
                performPanelSearch(''); // Clear highlights
            }
        });
    }

    // Live search inside panel
    if (panelSearchInput) {
        panelSearchInput.addEventListener('input', (e) => {
            const query = e.target.value;
            if (clearPanelSearchBtn) {
                if (query.length > 0) {
                    clearPanelSearchBtn.classList.remove('hidden');
                } else {
                    clearPanelSearchBtn.classList.add('hidden');
                }
            }
            performPanelSearch(query);
        });
    }

    // Clear search
    if (clearPanelSearchBtn && panelSearchInput) {
        clearPanelSearchBtn.addEventListener('click', () => {
            panelSearchInput.value = '';
            clearPanelSearchBtn.classList.add('hidden');
            performPanelSearch('');
            panelSearchInput.focus();
        });
    }

    // Close action dropdown when clicking items inside it
    if (actionMenuDropdown) {
        actionMenuDropdown.querySelectorAll('.menu-item-btn').forEach(btn => {
            if (btn.id !== 'panelSearchToggleBtn') {
                btn.addEventListener('click', () => {
                    actionMenuDropdown.classList.add('hidden');
                });
            }
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

    // ----------------- Settings Dropdown Event Bindings -----------------
    if (elements.settingsToggleBtn && elements.settingsDropdown) {
        elements.settingsToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            elements.settingsDropdown.classList.toggle('hidden');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!elements.settingsDropdown.classList.contains('hidden') && 
                !elements.settingsDropdown.contains(e.target) && 
                e.target !== elements.settingsToggleBtn && 
                !elements.settingsToggleBtn.contains(e.target)) {
                elements.settingsDropdown.classList.add('hidden');
            }
        });
    }

    // ----------------- Preload Info Modal Event Bindings -----------------
    const showPreloadInfoModal = () => {
        if (elements.preloadInfoModal) elements.preloadInfoModal.classList.remove('hidden');
        // Auto hide settings dropdown when showing modal
        if (elements.settingsDropdown) elements.settingsDropdown.classList.add('hidden');
    };
    const closePreloadInfoModal = () => {
        if (elements.preloadInfoModal) elements.preloadInfoModal.classList.add('hidden');
    };
    if (elements.preloadInfoBtn) elements.preloadInfoBtn.addEventListener('click', showPreloadInfoModal);
    if (elements.closePreloadInfoBtn) elements.closePreloadInfoBtn.addEventListener('click', closePreloadInfoModal);
    // understandPreloadBtn removed from HTML

    // ----------------- Sync Info Modal Event Bindings -----------------
    const showSyncInfoModal = () => {
        if (elements.syncInfoModal) elements.syncInfoModal.classList.remove('hidden');
        if (elements.settingsDropdown) elements.settingsDropdown.classList.add('hidden');
    };
    const closeSyncInfoModal = () => {
        if (elements.syncInfoModal) elements.syncInfoModal.classList.add('hidden');
    };
    if (elements.syncInfoBtn) elements.syncInfoBtn.addEventListener('click', showSyncInfoModal);
    if (elements.closeSyncInfoBtn) elements.closeSyncInfoBtn.addEventListener('click', closeSyncInfoModal);

    // ----------------- About Website Modal Event Bindings -----------------
    const showAboutModal = () => {
        if (elements.aboutWebsiteModal) elements.aboutWebsiteModal.classList.remove('hidden');
        if (elements.settingsDropdown) elements.settingsDropdown.classList.add('hidden');
    };
    const closeAboutModal = () => {
        if (elements.aboutWebsiteModal) elements.aboutWebsiteModal.classList.add('hidden');
    };
    if (elements.aboutWebsiteBtn) elements.aboutWebsiteBtn.addEventListener('click', showAboutModal);
    if (elements.closeAboutBtn) elements.closeAboutBtn.addEventListener('click', closeAboutModal);
    if (elements.understandAboutBtn) elements.understandAboutBtn.addEventListener('click', closeAboutModal);

    // ----------------- Version History Modal Event Bindings -----------------
    const showVersionModal = () => {
        if (elements.versionHistoryModal) elements.versionHistoryModal.classList.remove('hidden');
        if (elements.settingsDropdown) elements.settingsDropdown.classList.add('hidden');
    };
    const closeVersionModal = () => {
        if (elements.versionHistoryModal) elements.versionHistoryModal.classList.add('hidden');
    };
    if (elements.settingsVersionInfo) elements.settingsVersionInfo.addEventListener('click', showVersionModal);
    if (elements.closeVersionBtn) elements.closeVersionBtn.addEventListener('click', closeVersionModal);
    if (elements.understandVersionBtn) elements.understandVersionBtn.addEventListener('click', closeVersionModal);

    // ----------------- Preload Database Switch Binding -----------------
    if (elements.preloadToggle) {
        elements.preloadToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                localStorage.setItem('jingsi_preload_all', 'true');
                startPreloadingDatabase();
            } else {
                localStorage.setItem('jingsi_preload_all', 'false');
                stopPreloadingDatabase();
            }
        });

        // Initialize state from localStorage
        const shouldPreload = localStorage.getItem('jingsi_preload_all') === 'true';
        if (shouldPreload) {
            elements.preloadToggle.checked = true;
            // Restore label to cached progress percentage if available
            const cachedPct = localStorage.getItem('jingsi_preload_percent');
            if (cachedPct && elements.preloadLabel) {
                const pct = parseInt(cachedPct, 10);
                if (pct >= 100) {
                    elements.preloadLabel.textContent = '全文預載模式 (100%)';
                } else {
                    elements.preloadLabel.textContent = `全文預載模式 (${pct}%)`;
                }
            }
            setTimeout(() => {
                startPreloadingDatabase();
            }, 100);
        }
    }

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

                const requestUrl = (typeof GOOGLE_SCRIPT_URL !== 'undefined' && GOOGLE_SCRIPT_URL !== "")
                    ? GOOGLE_SCRIPT_URL
                    : './api/save_preread';
                
                if (typeof GOOGLE_SCRIPT_URL !== 'undefined' && GOOGLE_SCRIPT_URL !== "") {
                    payload.action = "savePreRead";
                }

                const fetchOptions = {
                    method: 'POST',
                    body: JSON.stringify(payload)
                };
                if (requestUrl.startsWith('./')) {
                    fetchOptions.headers = { 'Content-Type': 'application/json' };
                }

                fetch(requestUrl, fetchOptions)
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        alert('品前導讀修改已儲存！');
                    } else {
                        alert('伺服器儲存失敗（已備份至本地）：' + (data.error || '未知錯誤'));
                    }
                })
                .catch(() => {
                    if (isLocalEnvironment()) {
                        alert('本地伺服器未運行，修改已儲存至您本地的瀏覽器暫存，無法直接寫入硬碟 JSON 檔。');
                    } else {
                        alert('本網頁為線上預覽版，您的修改已儲存至瀏覽器本地暫存，無法直接同步到公開網站。如需永久變更，請於管理端進行儲存。');
                    }
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
            
            const requestUrl = (typeof GOOGLE_SCRIPT_URL !== 'undefined' && GOOGLE_SCRIPT_URL !== "")
                ? GOOGLE_SCRIPT_URL
                : './api/save_edit';
            
            if (typeof GOOGLE_SCRIPT_URL !== 'undefined' && GOOGLE_SCRIPT_URL !== "") {
                payload.action = "saveEpisode";
            }

            const fetchOptions = {
                method: 'POST',
                body: JSON.stringify(payload)
            };
            if (requestUrl.startsWith('./')) {
                fetchOptions.headers = { 'Content-Type': 'application/json' };
            }

            fetch(requestUrl, fetchOptions)
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
                
                if (isLocalEnvironment()) {
                    alert('本地伺服器未運行，修改已儲存至您本地的瀏覽器暫存，無法直接寫入硬碟 JSON 檔。');
                } else {
                    alert('本網頁為線上預覽版，您的修改已儲存至瀏覽器本地暫存，無法直接同步到公開網站。如需永久變更，請於管理端進行儲存。');
                }
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

    // ----------------- Cross-Device Progress Sync Event Bindings -----------------
    const syncToggle = document.getElementById('syncToggle');
    if (syncToggle) {
        syncToggle.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            const syncKey = localStorage.getItem('jingsi_sync_key');
            if (isChecked) {
                if (!syncKey) {
                    const options = document.getElementById('syncLoginOptions');
                    if (options) options.classList.remove('hidden');
                    const details = document.getElementById('syncConnectedDetails');
                    if (details) details.classList.add('hidden');
                }
            } else {
                if (confirm("確定要關閉進度同步並登出帳號嗎？\n登出後，您的進度將不再自動上傳備份。")) {
                    localStorage.removeItem('jingsi_sync_key');
                    if (typeof liff !== 'undefined' && liff.isLoggedIn()) {
                        liff.logout();
                    }
                    if (appState.progress) {
                        appState.progress.linkedProviders = [];
                    }
                    updateSyncUI();
                    alert("已關閉進度同步，並成功登出帳號。");
                } else {
                    e.target.checked = true;
                }
            }
        });
    }

    // Manual Sync Button (button removed from UI, kept for safety)
    if (elements.manualSyncBtn) {
        elements.manualSyncBtn.addEventListener('click', () => {
            uploadCloudSync(false).then(() => {
                downloadCloudSync(false);
            });
        });
    }

    // Logout Button
    if (elements.logoutSyncBtn) {
        elements.logoutSyncBtn.addEventListener('click', () => {
            if (confirm("確定要登出此同步帳號嗎？\n登出後，您的進度將不再自動上傳備份。")) {
                localStorage.removeItem('jingsi_sync_key');
                updateSyncUI();
                alert("已成功登出同步帳號。");
            }
        });
    }

    // Google Sign-In init & callback
    const handleGoogleCredentialResponse = (response) => {
        try {
            const token = response.credential;
            const payload = JSON.parse(atob(token.split('.')[1]));
            const email = payload.email;
            if (email) {
                elements.googleAuthBtn.disabled = true;
                elements.googleAuthBtn.textContent = "驗證中...";
                
                localStorage.setItem('jingsi_sync_key', email);
                downloadCloudSync(true).then(() => {
                    uploadCloudSync(true).then(() => {
                        updateSyncUI();
                        if (elements.syncAccountModal) elements.syncAccountModal.classList.add('hidden');
                        alert(`已成功使用 Google 帳號 (${email}) 同步！`);
                    });
                })
                .catch(err => {
                    console.error("Google sync integration failed:", err);
                    alert("同步失敗，請確認網路連線。");
                })
                .finally(() => {
                    elements.googleAuthBtn.disabled = false;
                    elements.googleAuthBtn.textContent = "Google 帳號登入";
                });
            }
        } catch (e) {
            console.error("Google login parse error:", e);
            alert("解析 Google 帳號憑證失敗！");
        }
    };

    if (elements.googleAuthBtn) {
        elements.googleAuthBtn.addEventListener('click', () => {
            if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === "") {
                alert("【系統提示】\n本站已支援 Google 一鍵快速同步！\n\n請創作者於專案設定中填入您申請的 Google Client ID 即可正式啟用此按鈕。");
                return;
            }
            try {
                google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: handleGoogleCredentialResponse,
                    auto_select: false
                });
                google.accounts.id.prompt();
            } catch (e) {
                console.error("Google GSI client failed to load:", e);
                alert("無法載入 Google 登入模組，請確認網路或關閉阻擋腳本。");
            }
        });
    }

    // LINE Sign-In Callback
    if (elements.lineAuthBtn) {
        elements.lineAuthBtn.addEventListener('click', () => {
            // Bug fix: LINE LIFF login requires an existing Google login first.
            // If the user has no sync key yet, prompt them to login with Google first.
            const existingSyncKey = localStorage.getItem('jingsi_sync_key');
            if (!existingSyncKey) {
                alert("⚠️ 提示：\n\n若您是首次使用，建議先點擊上方「Google 帳號登入」完成驗證，\n再回到此處點擊「LINE 帳號登入」進行連結與同步。\n\n如您已有 LINE 帳號且確定要直接登入，請繼續。");
            }
            
            ensureLiffInitialized(() => {
                if (liff.isLoggedIn()) {
                    liff.getProfile().then(profile => {
                        const lineUserId = "line-" + profile.userId;
                        const lineDisplayName = profile.displayName;
                        
                        elements.lineAuthBtn.disabled = true;
                        elements.lineAuthBtn.textContent = "連線中...";
                        
                        localStorage.setItem('jingsi_sync_key', lineUserId);
                        downloadCloudSync(true).then(() => {
                            uploadCloudSync(true).then(() => {
                                updateSyncUI();
                                if (elements.syncAccountNameDisplay) {
                                    elements.syncAccountNameDisplay.textContent = `LINE (${lineDisplayName})`;
                                }
                                if (elements.syncAccountModal) elements.syncAccountModal.classList.add('hidden');
                                alert(`已成功使用 LINE 帳號 (${lineDisplayName}) 同步！`);
                            });
                        })
                        .catch(err => {
                            console.error("LINE sync integration failed:", err);
                            alert("同步失敗，請確認網路連線。");
                        })
                        .finally(() => {
                            elements.lineAuthBtn.disabled = false;
                            elements.lineAuthBtn.textContent = "LINE 帳號登入";
                        });
                    });
                } else {
                    // User is not logged into LINE; redirect to LINE login.
                    // Store a flag so that after redirect back, we know to complete LINE sync.
                    if (existingSyncKey) {
                        localStorage.setItem('jingsi_link_line_pending', existingSyncKey);
                    }
                    liff.login();
                }
            }, (err) => {
                console.error("LINE LIFF init error:", err);
                alert("LINE 登入模組初始化失敗。\n\n建議：請先使用「Google 帳號登入」，再於登入後點擊「連結 LINE 帳號」功能。\n\n錯誤訊息：" + (err && err.message ? err.message : err));
            });
        });
    }

    // Account Linking Helpers and Listeners
    const callLinkAccountAPI = (primary, secondary, successMessage) => {
        if (!primary || !secondary) return;
        return fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'linkAccount',
                primary_key: primary,
                secondary_key: secondary
            })
        })
        .then(r => r.json())
        .then(res => {
            if (res.success) {
                alert(successMessage);
                downloadCloudSync(true);
            } else {
                alert("帳號連結失敗：" + (res.error || "未知錯誤"));
            }
        })
        .catch(err => {
            console.error("Account link API failed:", err);
            alert("伺服器連線失敗，請檢查網路！");
        });
    };

    const ensureLiffInitialized = (onSuccess, onError) => {
        if (typeof LINE_LIFF_ID === 'undefined' || LINE_LIFF_ID === "") {
            alert("本站已支援 LINE 登入！請於設定中填入 LINE LIFF ID 即可啟用。");
            return;
        }
        if (window._liffInitialized) {
            onSuccess();
        } else {
            try {
                liff.init({ liffId: LINE_LIFF_ID })
                    .then(() => {
                        window._liffInitialized = true;
                        onSuccess();
                    })
                    .catch(err => {
                        console.error("LINE LIFF init failed:", err);
                        if (onError) onError(err);
                        else alert("LINE 登入模組初始化失敗，請確認設定或網路！");
                    });
            } catch (e) {
                console.error("LINE LIFF SDK failed:", e);
                alert("無法載入 LINE 登入模組，請確認網路！");
            }
        }
    };


    if (elements.linkLineBtn) {
        elements.linkLineBtn.addEventListener('click', () => {
            const currentSyncKey = localStorage.getItem('jingsi_sync_key');
            if (!currentSyncKey) return;
            
            ensureLiffInitialized(() => {
                if (liff.isLoggedIn()) {
                    liff.getProfile().then(profile => {
                        const lineUserId = "line-" + profile.userId;
                        const lineDisplayName = profile.displayName;
                        callLinkAccountAPI(currentSyncKey, lineUserId, `成功將 LINE 帳號 (${lineDisplayName}) 連結至目前進度！\n兩邊帳號已完成共享。`);
                    });
                } else {
                    localStorage.setItem('jingsi_link_line_pending', currentSyncKey);
                    liff.login();
                }
            }, (err) => {
                alert("LINE 連結失敗，登入模組載入失敗！\n\n錯誤訊息：" + (err && err.message ? err.message : err));
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

function mergeLocalEditsForEpisode(episodeId, ep) {
    if (!ep) return;
    const localEdits = JSON.parse(localStorage.getItem('jingsi_local_edits') || '{}');
    const edit = localEdits[episodeId];
    if (edit) {
        ep.title = edit.title || ep.title;
        ep.summary = edit.summary;
        ep.full_text = edit.full_text;
        ep.is_edited = true;
        ep.edited_by = edit.author;
        ep.edited_date = edit.date;
        ep.edit_history = edit.edit_history || ep.edit_history;
    }
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


function handleSearchTyping(query) {
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
        
        elements.progressCard.classList.remove('hidden');
        if (typeof updateResumeBookmark === 'function') {
            updateResumeBookmark();
        }
        return;
    }

    // Hide progress and resume cards
    elements.progressCard.classList.add('hidden');
    elements.resumeCard.classList.add('hidden');
    elements.chapterList.classList.add('hidden');
    elements.searchResults.classList.remove('hidden');
    
    // Show prompt to submit search
    elements.searchResults.innerHTML = `
        <div style="text-align: center; padding: 32px 20px; color: var(--text-hint); display: flex; flex-direction: column; align-items: center; gap: 12px;">
            <svg style="width: 32px; height: 32px; color: var(--text-hint); opacity: 0.7;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <div style="font-size: 0.95rem; font-weight: 500; color: var(--text-color);">已輸入關鍵字</div>
            <div style="font-size: 0.85rem; color: var(--text-secondary);">請按鍵盤上的「搜尋」、「Enter」或點擊左側放大鏡開始搜尋</div>
        </div>
    `;
}

function triggerSearchSubmit() {
    if (!elements.searchInput) return;
    const query = elements.searchInput.value;
    const cleanQuery = query.trim();
    if (!cleanQuery) return;

    elements.progressCard.classList.add('hidden');
    elements.resumeCard.classList.add('hidden');
    elements.chapterList.classList.add('hidden');
    elements.searchResults.classList.remove('hidden');
    elements.searchResults.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 32px; color: var(--text-hint);">
            <div class="loading-spinner" style="width: 20px; height: 20px; border-width: 2px;"></div>
            <span>正在搜尋中...</span>
        </div>
    `;

    // Blur input to dismiss mobile keyboard
    elements.searchInput.blur();

    performSearch(cleanQuery);
}

function performSearch(query) {
    // If the database is preloaded locally, perform high-speed offline search immediately
    if (appState.rawEpisodesCache) {
        console.log("Performing instant offline search on preloaded database...");
        localFallbackSearch(query, true).then(results => {
            renderSearchResults(results, query, true);
        });
        return;
    }

    // 1. Try local server search first (for local development)
    fetch(`./api/search?q=${encodeURIComponent(query)}`)
        .then(res => {
            if (!res.ok) throw new Error("Search API error");
            return res.json();
        })
        .then(results => {
            renderSearchResults(results, query, true);
        })
        .catch(err => {
            // 2. If local server search fails (online), check if GOOGLE_SCRIPT_URL is available
            if (typeof GOOGLE_SCRIPT_URL !== 'undefined' && GOOGLE_SCRIPT_URL !== "") {
                console.log("Using high-speed cloud search...");
                fetch(`${GOOGLE_SCRIPT_URL}?action=search&q=${encodeURIComponent(query)}`)
                    .then(res => res.json())
                    .then(res => {
                        if (res.success && res.data) {
                            renderSearchResults(res.data, query, true);
                        } else {
                            throw new Error(res.error || "Cloud search failed");
                        }
                    })
                    .catch(async cloudErr => {
                        console.warn("Cloud search failed, falling back to client search:", cloudErr.message);
                        // 3. Fallback to client-side fast-title search
                        const results = await localFallbackSearch(query, false);
                        renderSearchResults(results, query, false);
                    });
            } else {
                // 3. Fallback to client-side fast-title search
                localFallbackSearch(query, false).then(results => {
                    renderSearchResults(results, query, false);
                });
            }
        });
}

async function localFallbackSearch(query, forceFullText = false) {
    const clean = query.toLowerCase();
    const keywords = clean.split(/[\s　]+/).filter(k => k.length > 0);
    const results = [];
    
    if (keywords.length === 0) return results;

    // Load raw_episodes.json if forceFullText is enabled and not cached yet
    if (forceFullText && !appState.rawEpisodesCache) {
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
    const isFullText = !!appState.rawEpisodesCache;

    for (const ep of dataSource) {
        const epIdStr = String(ep.episode_id);
        const titleStr = ep.title.toLowerCase();
        const summaryStr = (ep.summary || '').toLowerCase();
        const textStr = (ep.full_text || '').toLowerCase();
        
        let matchesAll = true;
        for (const kw of keywords) {
            if (!(epIdStr === kw || 
                  titleStr.includes(kw) || 
                  (isFullText && (summaryStr.includes(kw) || textStr.includes(kw))))) {
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

    // Also search prereads (always perform full text search as they are in-memory and few)
    if (window._preReadItems && Array.isArray(window._preReadItems)) {
        window._preReadItems.forEach((entry, idx) => {
            const titleStr = entry.title.toLowerCase();
            const summaryStr = (entry.summary || '').toLowerCase();
            const textStr = (entry.full_text || '').toLowerCase();
            
            let matchesAll = true;
            for (const kw of keywords) {
                if (!(titleStr.includes(kw) || 
                      summaryStr.includes(kw) || 
                      textStr.includes(kw))) {
                    matchesAll = false;
                    break;
                }
            }
            
            if (matchesAll) {
                results.push({
                    is_preread: true,
                    episode_id: `preread-${idx}`,
                    title: entry.title,
                    summary: entry.summary || '',
                    full_text: entry.full_text || '',
                    raw_date: '品前導讀'
                });
            }
        });
    }

    return results;
}

function renderSearchResults(results, query, isCloudOrFullText = false) {
    elements.searchResults.innerHTML = '';

    if (results.length === 0) {
        elements.searchResults.innerHTML = `<div class="search-results-empty">找不到與「${query}」有關的集數</div>`;
        if (!isCloudOrFullText && !appState.rawEpisodesCache) {
            appendFullTextSearchBanner(query);
        }
        return;
    }

    // Sort so that pre-read items are placed at the very top
    results.sort((a, b) => {
        const isAPreRead = a.is_preread || (typeof a.episode_id === 'string' && a.episode_id.startsWith('preread-'));
        const isBPreRead = b.is_preread || (typeof b.episode_id === 'string' && b.episode_id.startsWith('preread-'));
        if (isAPreRead && !isBPreRead) return -1;
        if (!isAPreRead && isBPreRead) return 1;
        return 0;
    });

    const cleanQuery = query.toLowerCase().trim();
    const keywords = cleanQuery.split(/[\s　]+/).filter(k => k.length > 0);

    results.forEach(res => {
        // Extract matching snippet containing ALL matching keywords
        const fullContent = ((res.summary || '') + ' ' + (res.full_text || '')).replace(/\s+/g, ' ');
        const lowerContent = fullContent.toLowerCase();
        
        // Find positions of all matched keywords in the text
        const keywordPositions = [];
        keywords.forEach(kw => {
            const idx = lowerContent.indexOf(kw);
            if (idx !== -1) {
                keywordPositions.push({ kw, idx });
            }
        });
        
        let snippet = '';
        if (keywordPositions.length > 0) {
            // Sort by index ascending
            keywordPositions.sort((a, b) => a.idx - b.idx);
            
            // Build ranges: window size is 12 characters before and after
            const ranges = keywordPositions.map(pos => {
                const idx = pos.idx;
                const len = pos.kw.length;
                return {
                    start: Math.max(0, idx - 12),
                    end: Math.min(fullContent.length, idx + len + 12)
                };
            });
            
            // Merge overlapping/close ranges (if gap <= 8 characters)
            const mergedRanges = [];
            let current = ranges[0];
            for (let i = 1; i < ranges.length; i++) {
                let next = ranges[i];
                if (next.start <= current.end + 8) {
                    current.end = Math.max(current.end, next.end);
                } else {
                    mergedRanges.push(current);
                    current = next;
                }
            }
            mergedRanges.push(current);
            
            // Generate snippet parts
            let snippetParts = [];
            mergedRanges.forEach((r, index) => {
                let part = fullContent.substring(r.start, r.end).trim();
                if (index === 0 && r.start > 0) {
                    part = '…' + part;
                }
                if (index > 0) {
                    part = '…' + part;
                }
                if (index === mergedRanges.length - 1 && r.end < fullContent.length) {
                    part = part + '…';
                }
                snippetParts.push(part);
            });
            snippet = '「' + snippetParts.join('') + '」';
        } else {
            snippet = res.summary ? '「' + res.summary.substring(0, 100) + '…」' : '';
        }
        
        // Highlight keywords in the snippet
        let highlightedSnippet = snippet;
        if (keywords.length > 0) {
            keywords.forEach(kw => {
                const escaped = kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                const regex = new RegExp(escaped, 'gi');
                highlightedSnippet = highlightedSnippet.replace(regex, `<mark class="search-highlight">$&</mark>`);
            });
        }

        const isPreRead = res.is_preread || (typeof res.episode_id === 'string' && res.episode_id.startsWith('preread-'));
        let badgeLabel = `第 ${res.episode_id} 集`;
        if (isPreRead) {
            const idxStr = String(res.episode_id).replace('preread-', '');
            const idxVal = parseInt(idxStr, 10);
            const numVal = !isNaN(idxVal) ? (idxVal + 1) : '';
            badgeLabel = numVal ? `第 ${numVal} 集 品前導讀` : '品前導讀';
        }

        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.innerHTML = `
            <div class="search-result-info">
                <div class="search-result-title-row">
                    <span class="search-result-number">${badgeLabel}</span>
                    <span class="search-result-title">${res.title}</span>
                </div>
                <div class="search-result-snippet">${highlightedSnippet}</div>
                <div class="search-result-date">${isPreRead ? '品前導讀影片' : `播出日期：${res.raw_date || '未知'}`}</div>
            </div>
        `;
        item.addEventListener('click', () => {
            openEpisodeDetail(res.episode_id);
        });
        elements.searchResults.appendChild(item);
    });

    if (!isCloudOrFullText && !appState.rawEpisodesCache) {
        appendFullTextSearchBanner(query);
    }
}

function appendFullTextSearchBanner(query) {
    const banner = document.createElement('div');
    banner.className = 'full-text-search-banner';
    banner.style.margin = '20px auto 10px auto';
    banner.style.padding = '16px';
    banner.style.backgroundColor = 'var(--accent-light)';
    banner.style.borderRadius = '12px';
    banner.style.textAlign = 'center';
    banner.style.maxWidth = '560px';
    banner.style.border = '1px dashed var(--accent-color)';
    banner.style.color = 'var(--text-color)';
    banner.style.fontSize = '0.9rem';
    banner.style.display = 'flex';
    banner.style.flexDirection = 'column';
    banner.style.alignItems = 'center';
    banner.style.gap = '10px';

    banner.innerHTML = `
        <div style="font-weight: 500;">💡 目前僅搜尋「集數與標題」。找不到想要的內容？</div>
        <div style="font-size: 0.78rem; color: var(--text-secondary); line-height: 1.4; max-width: 480px;">
            您可以啟用「全文逐字稿搜尋」，這將會搜尋大綱與逐字稿中的所有文字。<br>
            ⚠️ 此動作需要下載約 33MB 的資料庫檔案，建議在 Wi-Fi 連線下啟用。
        </div>
        <button id="enableFullTextSearchBtn" style="
            background-color: var(--accent-color);
            color: white;
            border: none;
            padding: 8px 20px;
            border-radius: 20px;
            font-size: 0.85rem;
            cursor: pointer;
            font-weight: 500;
            transition: opacity 0.2s;
        ">啟用「全文逐字稿搜尋」</button>
    `;

    const btn = banner.querySelector('#enableFullTextSearchBtn');
    btn.addEventListener('click', () => {
        banner.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px; color: var(--text-color); padding: 4px 0;">
                <div class="loading-spinner" style="width: 16px; height: 16px; border-width: 2px;"></div>
                <span>正在載入全文資料庫（33MB），請稍候...</span>
            </div>
        `;
        localFallbackSearch(query, true)
            .then(newResults => {
                renderSearchResults(newResults, query, true);
            })
            .catch(err => {
                console.error("Failed full text search:", err);
                banner.innerHTML = `<span style="color: red;">載入失敗，請確認網路連線。</span>`;
            });
    });

    elements.searchResults.appendChild(banner);
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
            
            // Fetch live titles from Google Sheets in the background to update list titles dynamically!
            if (typeof GOOGLE_SCRIPT_URL !== 'undefined' && GOOGLE_SCRIPT_URL !== "") {
                fetch(`${GOOGLE_SCRIPT_URL}?action=getAllEpisodeTitles`)
                    .then(r => r.json())
                    .then(res => {
                        if (res.success && Array.isArray(res.data)) {
                            res.data.forEach(item => {
                                const ep = appState.episodesIndex.find(e => e.episode_id === item.episode_id);
                                if (ep && item.title) {
                                    ep.title = item.title;
                                }
                            });
                            // Re-render the chapter list to show new titles!
                            renderChapterList();
                        }
                    })
                    .catch(err => console.warn("Background title sync failed:", err));
            }
            
            // Automatically detect and show app version from stylesheet version query string
            const cssLink = document.querySelector('link[href*="app.css"]');
            if (cssLink) {
                const match = cssLink.getAttribute('href').match(/v=([\d.]+)/);
                if (match) {
                    const version = match[1];
                    const versionEl = document.getElementById('appVersion');
                    if (versionEl) versionEl.textContent = `v${version}`;
                }
            }

            // Handle URL Query Parameter routing for SEO
            handleUrlRouting();

            // Automatically download latest progress in the background if sync key exists!
            if (window._downloadCloudSync) {
                window._downloadCloudSync(true);
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
        { name: '藥王菩薩本事品第二十三', links: ['https://youtu.be/7fqBM65iIR4?si=2Y-RymQ0KZWd4Uxe', 'https://youtu.be/qkm3CbEkInk?si=6lyMPMf5YFl6IN-N'] }
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
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <polyline points="9 11 12 14 22 4" class="checkmark"></polyline>
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
        const ts = Date.now();
        if (isCompleted) {
            appState.progress.completed[key] = true;
            appState.progress.completedEvents[key] = ts;    // positive = checked
        } else {
            delete appState.progress.completed[key];
            appState.progress.completedEvents[key] = -ts;   // negative = unchecked
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
                <span class="chapter-title" style="font-weight: bold; color: var(--gold-color);">品前導讀(菩提心要)</span>
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

    const proceedWithSavedPrereads = (savedList) => {
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
    };

    if (typeof GOOGLE_SCRIPT_URL !== 'undefined' && GOOGLE_SCRIPT_URL !== "") {
        fetch(`${GOOGLE_SCRIPT_URL}?action=getAllPreReads`)
            .then(res => res.json())
            .then(res => {
                if (res.success && res.data) {
                    proceedWithSavedPrereads(res.data);
                } else {
                    // Fallback to static JSON
                    fetch('./data/preread.json?v=' + APP_VERSION)
                        .then(r => r.json())
                        .then(proceedWithSavedPrereads)
                        .catch(() => {
                            mergeLocalPrereadEdits();
                            renderPreReadList();
                        });
                }
            })
            .catch(() => {
                // Fallback to static JSON
                fetch('./data/preread.json?v=' + APP_VERSION)
                    .then(r => r.json())
                    .then(proceedWithSavedPrereads)
                    .catch(() => {
                        mergeLocalPrereadEdits();
                        renderPreReadList();
                    });
            });
    } else {
        fetch('./data/preread.json?v=' + APP_VERSION)
            .then(res => res.json())
            .then(proceedWithSavedPrereads)
            .catch(() => {
                mergeLocalPrereadEdits();
                renderPreReadList();
            });
    }

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
        
        // Render episode list instantly using preloaded metadata index
        renderEpisodeList(chapterId);
    }
};



// Render Episode rows inside Chapter card
function renderEpisodeList(chapterId) {
    const container = document.getElementById(`episodeListContainer-${chapterId}`);
    // Filter episodes from the main index instead of waiting for chapter JSON!
    const episodes = appState.episodesIndex.filter(ep => ep.chapter_id === chapterId);
    
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
    const ts = Date.now();
    if (isCompleted) {
        appState.progress.completed[episodeId] = true;
        appState.progress.completedEvents[episodeId] = ts;    // positive = checked
    } else {
        delete appState.progress.completed[episodeId];
        appState.progress.completedEvents[episodeId] = -ts;   // negative = unchecked
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
    if (typeof episodeId === 'string' && episodeId.startsWith('preread-')) {
        const idx = parseInt(episodeId.replace('preread-', ''), 10);
        if (!isNaN(idx)) {
            window.openPreReadDetail(idx);
        }
        return;
    }

    // Find the header metadata first
    const epHeader = appState.episodesIndex.find(ep => ep.episode_id === episodeId);
    if (!epHeader) return;

    const chapterId = epHeader.chapter_id;
    
    // Update browser URL query parameter for SEO routing
    if (typeof episodeId === 'string' && episodeId.startsWith('preread-')) {
        const idx = episodeId.replace('preread-', '');
        history.replaceState(null, '', `?preread=${idx}`);
    } else {
        history.replaceState(null, '', `?ep=${episodeId}`);
    }
    
    // Check if raw preloaded database contains this episode, extract if not cached
    if (appState.rawEpisodesCache && !appState.episodeDetailsCache[episodeId]) {
        const epFromRaw = appState.rawEpisodesCache.find(e => e.episode_id === episodeId);
        if (epFromRaw) {
            appState.episodeDetailsCache[episodeId] = epFromRaw;
            mergeLocalEditsForEpisode(episodeId, epFromRaw);
        }
    }
    
    // Function to fetch latest from Google Sheets in the background
    const fetchLatestFromSheets = () => {
        if (typeof GOOGLE_SCRIPT_URL !== 'undefined' && GOOGLE_SCRIPT_URL !== "") {
            fetch(`${GOOGLE_SCRIPT_URL}?action=getEpisode&id=${episodeId}`)
                .then(res => res.json())
                .then(res => {
                    if (res.success && res.data) {
                        const epInCache = appState.episodeDetailsCache[episodeId];
                        if (epInCache) {
                            // Check if anything actually changed
                            const changed = epInCache.title !== res.data.title ||
                                            epInCache.summary !== res.data.summary ||
                                            epInCache.full_text !== res.data.full_text ||
                                            JSON.stringify(epInCache.edit_history) !== JSON.stringify(res.data.edit_history);
                                            
                            if (changed) {
                                epInCache.title = res.data.title;
                                epInCache.summary = res.data.summary;
                                epInCache.full_text = res.data.full_text;
                                epInCache.edit_history = res.data.edit_history;
                                epInCache.is_edited = res.data.edit_history && res.data.edit_history.length > 0;
                                
                                // If the panel is STILL showing this episode, refresh the panel content!
                                if (appState.activeEpisode && appState.activeEpisode.episode_id === episodeId && !appState.activeEpisode._isPreRead) {
                                    // Refresh title
                                    if (elements.panelEpisodeTitle) elements.panelEpisodeTitle.textContent = res.data.title;
                                    
                                    // Re-render summary tab content
                                    elements.sutraSummary.innerHTML = '';
                                    if (res.data.summary && res.data.summary.trim()) {
                                        res.data.summary.split('\n').forEach(line => {
                                            if (!line.trim()) return;
                                            const div = document.createElement('div');
                                            div.className = 'outline-item';
                                            div.innerHTML = `<p class="outline-text">${line.trim()}</p>`;
                                            elements.sutraSummary.appendChild(div);
                                        });
                                    }
                                    let summaryHistory = [];
                                    if (res.data.edit_history && res.data.edit_history.length > 0) {
                                        res.data.edit_history.forEach(item => {
                                            if (item.mode === 'summary') {
                                                summaryHistory.push(item.comment ? `※ ${item.date} ${item.author} ${item.comment}` : `※ ${item.date} 由 ${item.author} 修改`);
                                            }
                                        });
                                    }
                                    const notesOnlyEpisodes = [16, 17, 19, 20, 23, 29];
                                    const isNotesOnly = notesOnlyEpisodes.includes(episodeId) && !res.data.edit_history.length;
                                    const sermonSourceText = isNotesOnly 
                                        ? `※ 以上內容摘自「奈普敦智慧平台」 & 大愛電視 YouTube（本集僅有導讀問答與心得筆記，無逐字稿）`
                                        : `※ 以上內容摘自「奈普敦智慧平台」 & 大愛電視 YouTube`;
                                    appendBottomInfoBar(elements.sutraSummary, sermonSourceText, true, summaryHistory);

                                    // Re-render full text tab content
                                    elements.sutraFullText.innerHTML = '';
                                    if (res.data.full_text && res.data.full_text.trim()) {
                                        res.data.full_text.split('\n').forEach(line => {
                                            if (!line.trim()) return;
                                            const p = document.createElement('p');
                                            p.textContent = line.trim();
                                            elements.sutraFullText.appendChild(p);
                                        });
                                    }
                                    let fullTextHistory = [];
                                    if (res.data.edit_history && res.data.edit_history.length > 0) {
                                        res.data.edit_history.forEach(item => {
                                            if (item.mode === 'full_text') {
                                                fullTextHistory.push(item.comment ? `※ ${item.date} ${item.author} ${item.comment}` : `※ ${item.date} 由 ${item.author} 修改`);
                                            }
                                        });
                                    }
                                    appendBottomInfoBar(elements.sutraFullText, sermonSourceText, false, fullTextHistory);
                                }
                            }
                        }
                    }
                })
                .catch(err => console.warn('Background Sheets fetch failed:', err));
        }
    };

    // Open detail panel overlay instantly using cached lightweight epHeader metadata!
    showDetailPanel(episodeId, isResume);

    // If cache isn't ready, load it in the background
    if (!appState.episodeDetailsCache[episodeId]) {
        fetch(`./data/episodes/episode_${episodeId}.json?v=` + APP_VERSION)
            .then(res => res.json())
            .then(data => {
                appState.episodeDetailsCache[episodeId] = data;
                mergeLocalEditsForEpisode(episodeId, data);
                
                // If the user is STILL viewing this episode, populate the texts!
                if (appState.activeEpisode && appState.activeEpisode.episode_id === episodeId) {
                    populateEpisodeTexts(episodeId);
                }
                
                // Background Sheet fetch
                fetchLatestFromSheets();
            })
            .catch(err => {
                console.error(`Error loading episode JSON:`, err);
                if (appState.activeEpisode && appState.activeEpisode.episode_id === episodeId) {
                    const errorHTML = `<p style="padding: 20px; color: red; text-align: center;">載入失敗，請確認網路連線或檔案存在。</p>`;
                    elements.sutraSummary.innerHTML = errorHTML;
                    elements.sutraFullText.innerHTML = errorHTML;
                }
            });
    } else {
        // Cache is ready, sync from Sheets in background
        fetchLatestFromSheets();
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
    if (!epHeader) return;
    const chapterId = epHeader.chapter_id;
    const episode = appState.episodeDetailsCache[episodeId];
    
    appState.activeEpisode = episode || epHeader;
    
    // Update source note text for notes-only episodes
    const notesOnlyEpisodes = [16, 17, 19, 20, 23, 29];
    const isNotesOnly = notesOnlyEpisodes.includes(episodeId) && (!episode || !episode.is_edited);
    
    const isLocalhost = isLocalEnvironment();
    if (elements.editTitleBtn) {
        if (isLocalhost) elements.editTitleBtn.classList.remove('hidden');
        else elements.editTitleBtn.classList.add('hidden');
    }
    
    // 1. Populate metadata
    const chapter = appState.chapters.find(ch => ch.id === chapterId);
    const episodes = appState.episodesIndex.filter(e => e.chapter_id === chapterId);
    const episodeIndex = episodes.findIndex(e => e.episode_id === episodeId);

    if (elements.panelEpIdBadge) {
        elements.panelEpIdBadge.style.display = ''; // Restore default display
        elements.panelEpIdBadge.textContent = epHeader.episode_id;
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
        elements.panelEpisodeTitle.textContent = epHeader.title;
    }
    
    elements.panelDate.textContent = `播出日期：${epHeader.broadcast_date || epHeader.raw_date || '未知'}`;

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
    
    if (epHeader.youtube_url) {
        const ytIdMatch = epHeader.youtube_url.match(/v=([^&]+)/);
        if (ytIdMatch) {
            elements.videoContainer.classList.remove('hidden');
            if (fallbackDiv) fallbackDiv.classList.remove('hidden');
            if (elements.videoSearchBtn) {
                elements.videoSearchBtn.classList.remove('hidden');
                elements.videoSearchBtn.href = `https://www.youtube.com/results?search_query=${encodeURIComponent('靜思妙蓮華 第' + epHeader.episode_id + '集 ' + epHeader.title)}`;
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

    // 4. Populate Outline and Transcript with either spinner or actual text
    if (episode) {
        populateEpisodeTexts(episodeId);
    } else {
        const spinnerHTML = `
            <div class="loading-spinner-container" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; gap: 12px; color: var(--text-hint);">
                <div class="loading-spinner"></div>
                <p>正在載入此集大綱與逐字稿...</p>
            </div>
        `;
        elements.sutraSummary.innerHTML = spinnerHTML;
        elements.sutraFullText.innerHTML = spinnerHTML;
    }

    // 5. PDF Link (from cached epHeader metadata)
    if (epHeader.pdf_url) {
        elements.pdfDownloadLink.href = epHeader.pdf_url;
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
    appState.progress.lastReadTs = Date.now();
    saveProgress();
    updateResumeBookmark();

    // 11. Save original HTML for inline search and clear previous search input
    if (typeof saveOriginalPanelHTML === 'function') {
        saveOriginalPanelHTML();
    }
    const searchBar = document.getElementById('panelSearchBar');
    if (searchBar) searchBar.classList.add('hidden');
    const searchInput = document.getElementById('panelSearchInput');
    if (searchInput) searchInput.value = '';
    const clearSearchBtn = document.getElementById('clearPanelSearchBtn');
    if (clearSearchBtn) clearSearchBtn.classList.add('hidden');
}

// Close Episode Reader Panel
function closeEpisodeDetail() {
    // 1. Save scroll position of the panel before closing
    if (appState.activeEpisode) {
        appState.progress.lastScroll = elements.panelBody.scrollTop;
        saveProgress();
    }

    // Exit Zen Mode
    appState.zenMode = false;
    elements.detailPanel.classList.remove('zen-mode');
    if (elements.zenModeBtn) elements.zenModeBtn.classList.remove('active');

    // 2. Hide Panel
    elements.detailPanel.classList.remove('visible');
    elements.detailPanel.classList.add('hidden');
    
    // 3. Clear Video frame to stop audio playback in background!
    elements.videoContainer.innerHTML = '';
    
    // Update browser URL to remove query parameters for SEO routing
    history.replaceState(null, '', window.location.pathname);
    
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
        const ts = Date.now();
        
        if (isCompleted) {
            appState.progress.completed[key] = true;
            appState.progress.completedEvents[key] = ts;    // positive = checked
            elements.panelCompleteBtn.classList.add('completed');
        } else {
            delete appState.progress.completed[key];
            appState.progress.completedEvents[key] = -ts;   // negative = unchecked
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
    const ts = Date.now();
    
    if (isCompleted) {
        appState.progress.completed[episodeId] = true;
        appState.progress.completedEvents[episodeId] = ts;    // positive = checked
        elements.panelCompleteBtn.classList.add('completed');
    } else {
        delete appState.progress.completed[episodeId];
        appState.progress.completedEvents[episodeId] = -ts;   // negative = unchecked
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
    // If the user is currently searching, always keep resumeCard hidden
    if (elements.searchInput && elements.searchInput.value.trim().length > 0) {
        elements.resumeCard.classList.add('hidden');
        return;
    }

    const lastId = appState.progress.lastRead;
    if (lastId) {
        if (typeof lastId === 'string' && lastId.startsWith('preread-')) {
            const idx = parseInt(lastId.replace('preread-', ''), 10);
            const items = window._preReadItems;
            if (items && items[idx]) {
                const entry = items[idx];
                elements.resumeTitle.textContent = `品前導讀(第${idx + 1}集) - ${entry.title}`;
                elements.resumeCard.classList.remove('hidden');
                return;
            }
        } else {
            const epId = parseInt(lastId, 10);
            const ep = appState.episodesIndex.find(e => e.episode_id === epId);
            if (ep) {
                elements.resumeTitle.textContent = `第 ${ep.episode_id} 集 - ${ep.title}`;
                elements.resumeCard.classList.remove('hidden');
                return;
            }
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

    const proceedToRender = () => {
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

        // Update last read bookmark for pre-read
        appState.progress.lastRead = `preread-${idx}`;
        appState.progress.lastReadTs = Date.now();
        saveProgress();
        updateResumeBookmark();

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
        const canEdit = isLocalhost || (typeof GOOGLE_SCRIPT_URL !== 'undefined' && GOOGLE_SCRIPT_URL !== "");
        if (elements.editTitleBtn) {
            if (isLocalhost) elements.editTitleBtn.classList.remove('hidden');
            else elements.editTitleBtn.classList.add('hidden');
        }
        if (elements.editSummaryBtn) {
            if (canEdit) elements.editSummaryBtn.classList.remove('hidden');
            else elements.editSummaryBtn.classList.add('hidden');
        }
        if (elements.editFullTextBtn) {
            if (canEdit) elements.editFullTextBtn.classList.remove('hidden');
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

        // Save original HTML for inline search and clear previous search input
        if (typeof saveOriginalPanelHTML === 'function') {
            saveOriginalPanelHTML();
        }
        const searchBar = document.getElementById('panelSearchBar');
        if (searchBar) searchBar.classList.add('hidden');
        const searchInput = document.getElementById('panelSearchInput');
        if (searchInput) searchInput.value = '';
        const clearSearchBtn = document.getElementById('clearPanelSearchBtn');
        if (clearSearchBtn) clearSearchBtn.classList.add('hidden');
    };

    // Render instantly using cached memory
    proceedToRender();

    // Fetch latest in the background
    if (typeof GOOGLE_SCRIPT_URL !== 'undefined' && GOOGLE_SCRIPT_URL !== "") {
        fetch(`${GOOGLE_SCRIPT_URL}?action=getPreRead&id=${idx}`)
            .then(res => res.json())
            .then(res => {
                if (res.success && res.data) {
                    const changed = entry.title !== res.data.title ||
                                    entry.summary !== res.data.summary ||
                                    entry.full_text !== res.data.full_text ||
                                    JSON.stringify(entry.edit_history) !== JSON.stringify(res.data.edit_history);
                    if (changed) {
                        entry.title = res.data.title;
                        entry.summary = res.data.summary;
                        entry.full_text = res.data.full_text;
                        entry.edit_history = res.data.edit_history;

                        // If the panel is STILL showing this pre-read item, refresh it!
                        if (appState.activeEpisode && appState.activeEpisode._isPreRead && appState.activeEpisode._preReadIdx === idx) {
                            if (elements.panelEpisodeTitle) elements.panelEpisodeTitle.textContent = res.data.title;
                            
                            // Re-render summary
                            elements.sutraSummary.innerHTML = '';
                            if (res.data.summary && res.data.summary.trim()) {
                                res.data.summary.split('\n').forEach(line => {
                                    if (!line.trim()) return;
                                    const div = document.createElement('div');
                                    div.className = 'outline-item';
                                    div.innerHTML = `<p class="outline-text">${line.trim()}</p>`;
                                    elements.sutraSummary.appendChild(div);
                                });
                            } else {
                                elements.sutraSummary.innerHTML += `
                                    <div class="outline-item" style="display:block; text-align:center; padding: 24px 16px 8px;">
                                        <p class="outline-text" style="font-size:1.1rem; font-weight:bold; color:var(--accent-color); margin-bottom:12px;">${res.data.title}</p>
                                        <p class="outline-text" style="color:var(--text-secondary); font-size:0.9rem;">本影片為大愛台製作之「品前導讀」，<br>帶領您在正式聆聽上人開示前先掌握本品要旨。<br><br>（可由管理員在此輸入大綱）</p>
                                    </div>`;
                            }
                            let summaryHistory = [];
                            if (res.data.edit_history && res.data.edit_history.length > 0) {
                                res.data.edit_history.forEach(item => {
                                    if (item.mode === 'summary') {
                                        summaryHistory.push(item.comment ? `※ ${item.date} ${item.author} ${item.comment}` : `※ ${item.date} 由 ${item.author} 修改`);
                                    }
                                });
                            }
                            appendBottomInfoBar(elements.sutraSummary, `※ 以上內容精選自「大愛台YouTube」`, true, summaryHistory);

                            // Re-render full text
                            elements.sutraFullText.innerHTML = '';
                            if (res.data.full_text && res.data.full_text.trim()) {
                                res.data.full_text.split('\n').forEach(line => {
                                    if (!line.trim()) return;
                                    const p = document.createElement('p');
                                    p.textContent = line.trim();
                                    elements.sutraFullText.appendChild(p);
                                });
                            } else {
                                elements.sutraFullText.innerHTML = `
                                    <div style="text-align:center; padding: 24px 16px 8px;">
                                        <p style="font-size:1.1rem; font-weight:bold; color:var(--accent-color); margin-bottom:12px;">${res.data.title}</p>
                                        <p style="color:var(--text-hint); font-size:0.9rem;">尚無逐字稿，可由管理員新增。</p>
                                    </div>`;
                            }
                            let fullTextHistory = [];
                            if (res.data.edit_history && res.data.edit_history.length > 0) {
                                res.data.edit_history.forEach(item => {
                                    if (item.mode === 'full_text') {
                                        fullTextHistory.push(item.comment ? `※ ${item.date} ${item.author} ${item.comment}` : `※ ${item.date} 由 ${item.author} 修改`);
                                    }
                                });
                            }
                            appendBottomInfoBar(elements.sutraFullText, `※ 以上內容精選自「大愛台YouTube」`, false, fullTextHistory);
                            if (typeof saveOriginalPanelHTML === 'function') {
                                saveOriginalPanelHTML();
                            }
                        }
                    }
                }
            })
            .catch(err => console.warn('Background Sheets fetch failed:', err));
    }
};

// -------------------------------------------------------------
// In-Page Search & Highlight Helper Functions
// -------------------------------------------------------------
function saveOriginalPanelHTML() {
    appState.originalOutlineHTML = elements.sutraSummary.innerHTML;
    appState.originalTranscriptHTML = elements.sutraFullText.innerHTML;
    
    // If there is currently a search query in the search bar, re-apply it!
    const panelSearchInput = document.getElementById('panelSearchInput');
    if (panelSearchInput && panelSearchInput.value.trim()) {
        performPanelSearch(panelSearchInput.value);
    }
}

function performPanelSearch(query) {
    const summaryContainer = elements.sutraSummary;
    const textContainer = elements.sutraFullText;
    if (!summaryContainer || !textContainer) return;

    // 1. Restore original HTML (clear old highlights)
    if (appState.originalOutlineHTML !== undefined) {
        summaryContainer.innerHTML = appState.originalOutlineHTML;
    }
    if (appState.originalTranscriptHTML !== undefined) {
        textContainer.innerHTML = appState.originalTranscriptHTML;
    }

    const clean = query.trim();
    if (!clean) return;

    // 2. Escape special characters for regex
    const escaped = clean.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');

    // 3. Highlight matches in text nodes recursively
    highlightTextInNode(summaryContainer, regex);
    highlightTextInNode(textContainer, regex);
}

function highlightTextInNode(node, regex) {
    if (node.nodeType === Node.TEXT_NODE) {
        const text = node.nodeValue;
        if (regex.test(text)) {
            const parent = node.parentNode;
            
            // Create a document fragment to hold the new structure
            const fragment = document.createDocumentFragment();
            let lastIdx = 0;
            
            // Replace matching terms
            text.replace(regex, (match, offset) => {
                // Add preceding text
                if (offset > lastIdx) {
                    fragment.appendChild(document.createTextNode(text.substring(lastIdx, offset)));
                }
                
                // Add highlighted span
                const span = document.createElement('span');
                span.className = 'highlight-term';
                span.textContent = match;
                fragment.appendChild(span);
                
                lastIdx = offset + match.length;
            });
            
            // Add trailing text
            if (lastIdx < text.length) {
                fragment.appendChild(document.createTextNode(text.substring(lastIdx)));
            }
            
            // Replace original node with fragment
            parent.replaceChild(fragment, node);
        }
    } else if (node.nodeType === Node.ELEMENT_NODE && node.childNodes) {
        // Skip tags that we shouldn't modify
        if (node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE' && !node.classList.contains('highlight-term')) {
            // Walk child nodes
            const children = Array.from(node.childNodes);
            for (let i = 0; i < children.length; i++) {
                highlightTextInNode(children[i], regex);
            }
        }
    }
}

// Populate Outline and Transcript tabs once JSON data is ready
function populateEpisodeTexts(episodeId) {
    const epHeader = appState.episodesIndex.find(ep => ep.episode_id === episodeId);
    if (!epHeader) return;
    const episode = appState.episodeDetailsCache[episodeId];
    if (!episode) return;

    // Update activeEpisode to the full details
    appState.activeEpisode = episode;

    // Update source note text for notes-only episodes
    const notesOnlyEpisodes = [16, 17, 19, 20, 23, 29];
    const isNotesOnly = notesOnlyEpisodes.includes(episodeId) && !episode.is_edited;
    const sermonSourceText = isNotesOnly 
        ? `※ 以上內容摘自「奈普敦智慧平台」 & 大愛電視 YouTube（本集僅有導讀問答與心得筆記，無逐字稿）`
        : `※ 以上內容摘自「奈普敦智慧平台」 & 大愛電視 YouTube`;

    // 1. Populate Outline (summary)
    elements.sutraSummary.innerHTML = '';

    if (isNotesOnly && episode.full_text) {
        const bullets = episode.full_text.split('\n');
        bullets.forEach(b => {
            if (!b.trim()) return;
            const div = document.createElement('div');
            div.className = 'outline-item';
            div.innerHTML = `<p class="outline-text">${b.trim()}</p>`;
            elements.sutraSummary.appendChild(div);
        });
    } else if (episode.summary) {
        const bullets = episode.summary.split('\n');
        bullets.forEach(b => {
            if (!b.trim()) return;
            const div = document.createElement('div');
            div.className = 'outline-item';
            div.innerHTML = `<p class="outline-text">${b.trim()}</p>`;
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

    // 2. Populate Sermon Text (full_text)
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

    // 3. Save original HTML for inline search
    if (typeof saveOriginalPanelHTML === 'function') {
        saveOriginalPanelHTML();
    }
}

// AbortController for preload download (allows mid-download cancellation)
let _preloadAbortController = null;

// Start preloading the entire database raw_episodes.json in the background
function startPreloadingDatabase() {
    if (!elements.preloadLabel) return;
    
    // If it's already fully cached in memory (100% done), skip download entirely
    if (appState.rawEpisodesCache) {
        elements.preloadLabel.textContent = '全文預載模式 (100%)';
        elements.preloadLabel.style.color = '';
        localStorage.setItem('jingsi_preload_percent', '100');
        return;
    }
    
    // If already completed a previous session (localStorage says 100%), still need to re-fetch
    // BUT browser cache will serve it instantly — so it won't re-consume real traffic.
    const cachedPct = parseInt(localStorage.getItem('jingsi_preload_percent') || '0', 10);
    
    // Cancel any ongoing download before starting fresh
    if (_preloadAbortController) {
        _preloadAbortController.abort();
    }
    _preloadAbortController = new AbortController();
    const signal = _preloadAbortController.signal;
    
    // Restore last known progress in the label while download starts
    if (cachedPct > 0 && cachedPct < 100) {
        elements.preloadLabel.textContent = `全文預載模式 (${cachedPct}%)`;
    } else if (cachedPct >= 100) {
        elements.preloadLabel.textContent = '全文預載模式 (100%)';
    } else {
        elements.preloadLabel.textContent = '全文預載模式 (0%)';
    }
    elements.preloadLabel.style.color = '';
    
    fetch('./data/raw_episodes.json', { signal })
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            
            // Get content length
            const contentLength = response.headers.get('content-length');
            const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
            
            if (!response.body) {
                // Fallback if ReadableStream is not supported
                return response.json();
            }
            
            const reader = response.body.getReader();
            let loadedBytes = 0;
            
            return new ReadableStream({
                start(controller) {
                    function read() {
                        reader.read().then(({ done, value }) => {
                            // If the switch was turned off, abort reading
                            if (signal.aborted) {
                                reader.cancel();
                                controller.error(new DOMException('Aborted', 'AbortError'));
                                return;
                            }
                            
                            if (done) {
                                controller.close();
                                return;
                            }
                            
                            loadedBytes += value.byteLength;
                            
                            // Calculate percentage progress
                            let percent = cachedPct;
                            if (totalBytes > 0) {
                                percent = Math.min(100, Math.round((loadedBytes / totalBytes) * 100));
                                elements.preloadLabel.textContent = `全文預載模式 (${percent}%)`;
                                // Persist current progress in case of interruption
                                localStorage.setItem('jingsi_preload_percent', String(percent));
                            } else {
                                const loadedMB = (loadedBytes / (1024 * 1024)).toFixed(1);
                                elements.preloadLabel.textContent = `全文預載模式 (${loadedMB}MB)`;
                            }
                            
                            controller.enqueue(value);
                            read();
                        }).catch(error => {
                            if (error.name === 'AbortError') return;
                            controller.error(error);
                        });
                    }
                    read();
                }
            });
        })
        .then(stream => {
            if (!stream) return null;
            // If stream is a ReadableStream, we must convert it back to JSON
            if (stream instanceof ReadableStream) {
                return new Response(stream).json();
            }
            // Fallback case where stream is already the parsed JSON
            return stream;
        })
        .then(data => {
            if (!data) return; // aborted
            
            // If the toggle checkbox was unchecked during download, discard data
            if (elements.preloadToggle && !elements.preloadToggle.checked) {
                appState.rawEpisodesCache = null;
                elements.preloadLabel.textContent = '雲端模式';
                elements.preloadLabel.style.color = '';
                return;
            }
            
            appState.rawEpisodesCache = data;
            elements.preloadLabel.textContent = '全文預載模式 (100%)';
            elements.preloadLabel.style.color = '';
            // Mark as fully downloaded — won't re-download next session (browser cache handles it)
            localStorage.setItem('jingsi_preload_percent', '100');
            
            // If search is active, trigger search immediately using local cache
            if (elements.searchInput && elements.searchInput.value.trim().length > 0) {
                triggerSearchSubmit();
            }
        })
        .catch(err => {
            if (err && err.name === 'AbortError') {
                // Download was intentionally stopped by user turning off the switch
                console.log('Preload download aborted by user.');
                return;
            }
            console.error('Failed to preload full database:', err);
            elements.preloadLabel.textContent = '全文預載模式 ✕ 載入失敗';
            elements.preloadLabel.style.color = '';
            if (elements.preloadToggle) {
                elements.preloadToggle.checked = false;
            }
            localStorage.setItem('jingsi_preload_all', 'false');
        });
}

// Stop preloading — aborts ongoing download and reverts to cloud mode
function stopPreloadingDatabase() {
    // Abort any ongoing fetch
    if (_preloadAbortController) {
        _preloadAbortController.abort();
        _preloadAbortController = null;
    }
    // Clear in-memory cache (keeps localStorage percent so next open resumes label)
    appState.rawEpisodesCache = null;
    if (elements.preloadLabel) {
        elements.preloadLabel.textContent = '雲端模式';
        elements.preloadLabel.style.color = '';
    }
}

// Handle URL routing based on query parameters (e.g. ?ep=96 or ?preread=0)
function handleUrlRouting() {
    const params = new URLSearchParams(window.location.search);
    const epVal = params.get('ep');
    const prereadVal = params.get('preread');
    
    if (epVal) {
        const epId = parseInt(epVal, 10);
        if (!isNaN(epId)) {
            setTimeout(() => {
                window.openEpisodeDetail(epId);
            }, 250);
        }
    } else if (prereadVal) {
        const idx = parseInt(prereadVal, 10);
        if (!isNaN(idx)) {
            setTimeout(() => {
                window.openEpisodeDetail(`preread-${idx}`);
            }, 250);
        }
    }
}
