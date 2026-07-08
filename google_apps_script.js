/**
 * 靜思妙蓮華 - Google 試算表雲端資料庫 API
 * 
 * 部署說明：
 * 1. 在 Google 試算表中，點選「擴充功能」➔「Apps Script」
 * 2. 清空原本的程式碼，將此檔案的所有內容貼上
 * 3. 點選儲存，並點選「部署」➔「新增部署」
 *    - 類型選擇：「網頁應用程式 (Web App)」
 *    - 執行身分：「我 (Me)」
 *    - 誰有權限存取：「所有人 (Anyone)」
 * 4. 點選「部署」，並授予必要權限後，複製產生的「網頁應用程式 URL」
 * 5. 一鍵匯入資料：在 Apps Script 編輯器上方選擇「initializeDatabase」函數並按「執行」，即可自動將全網站 1800+ 集資料匯入您的試算表。
 */

// 讀取單集或導讀
function doGet(e) {
  var action = e.parameter.action;
  var id = e.parameter.id;
  
  var response = { success: false, error: "未知錯誤" };
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === "getEpisode") {
      var sheet = ss.getSheetByName("episodes");
      if (!sheet) {
        throw new Error("找不到 episodes 工作表");
      }
      var data = sheet.getDataRange().getValues();
      var targetId = Number(id);
      
      for (var i = 1; i < data.length; i++) {
        if (Number(data[i][0]) === targetId) {
          response = {
            success: true,
            data: {
              episode_id: Number(data[i][0]),
              title: data[i][1] || "",
              summary: data[i][2] || "",
              full_text: data[i][3] || "",
              edit_history: data[i][4] ? JSON.parse(data[i][4]) : []
            }
          };
          break;
        }
      }
      if (!response.success) {
        response = { success: false, error: "找不到該集數 " + id };
      }
      
    } else if (action === "getPreRead") {
      var sheet = ss.getSheetByName("preread");
      if (!sheet) {
        throw new Error("找不到 preread 工作表");
      }
      var data = sheet.getDataRange().getValues();
      var targetId = Number(id);
      
      for (var i = 1; i < data.length; i++) {
        if (Number(data[i][0]) === targetId) {
          response = {
            success: true,
            data: {
              id: Number(data[i][0]),
              title: data[i][1] || "",
              summary: data[i][2] || "",
              full_text: data[i][3] || "",
              edit_history: data[i][4] ? JSON.parse(data[i][4]) : []
            }
          };
          break;
        }
      }
      if (!response.success) {
        response = { success: false, error: "找不到該導讀 " + id };
      }
    } else if (action === "getAllPreReads") {
      var sheet = ss.getSheetByName("preread");
      if (!sheet) {
        throw new Error("找不到 preread 工作表");
      }
      var data = sheet.getDataRange().getValues();
      var list = [];
      for (var i = 1; i < data.length; i++) {
        list.push({
          id: Number(data[i][0]),
          title: data[i][1] || "",
          summary: data[i][2] || "",
          full_text: data[i][3] || "",
          edit_history: data[i][4] ? JSON.parse(data[i][4]) : []
        });
      }
      response = { success: true, data: list };
    } else if (action === "getAllEpisodeTitles") {
      var sheet = ss.getSheetByName("episodes");
      if (!sheet) {
        throw new Error("找不到 episodes 工作表");
      }
      var data = sheet.getDataRange().getValues();
      var list = [];
      for (var i = 1; i < data.length; i++) {
        list.push({
          episode_id: Number(data[i][0]),
          title: data[i][1] || ""
        });
      }
      response = { success: true, data: list };
    } else if (action === "search") {
      var query = (e.parameter.q || "").toLowerCase().trim();
      if (!query) {
        throw new Error("搜尋關鍵字不可為空");
      }
      var keywords = query.split(/[\s　]+/).filter(function(k) { return k.length > 0; });
      if (keywords.length === 0) {
        throw new Error("搜尋關鍵字不可為空");
      }
      
      var sheet = ss.getSheetByName("episodes");
      if (!sheet) {
        throw new Error("找不到 episodes 工作表");
      }
      var data = sheet.getDataRange().getValues();
      var list = [];
      for (var i = 1; i < data.length; i++) {
        var episodeId = Number(data[i][0]);
        var title = data[i][1] || "";
        var summary = data[i][2] || "";
        var fullText = data[i][3] || "";
        
        var matches = true;
        for (var k = 0; k < keywords.length; k++) {
          var kw = keywords[k];
          if (!(String(episodeId) === kw || 
                title.toLowerCase().indexOf(kw) !== -1 ||
                summary.toLowerCase().indexOf(kw) !== -1 ||
                fullText.toLowerCase().indexOf(kw) !== -1)) {
            matches = false;
            break;
          }
        }
        
        if (matches) {
          list.push({
            episode_id: episodeId,
            title: title,
            summary: summary,
            full_text: fullText
          });
        }
        if (list.length >= 100) break;
      }
      
      // Also search preread sheet
      var prereadSheet = ss.getSheetByName("preread");
      if (prereadSheet) {
        var prereadData = prereadSheet.getDataRange().getValues();
        for (var i = 1; i < prereadData.length; i++) {
          var prereadId = Number(prereadData[i][0]);
          var title = prereadData[i][1] || "";
          var summary = prereadData[i][2] || "";
          var fullText = prereadData[i][3] || "";
          
          var matches = true;
          for (var k = 0; k < keywords.length; k++) {
            var kw = keywords[k];
            if (!(title.toLowerCase().indexOf(kw) !== -1 ||
                  summary.toLowerCase().indexOf(kw) !== -1 ||
                  fullText.toLowerCase().indexOf(kw) !== -1)) {
              matches = false;
              break;
            }
          }
          
          if (matches) {
            list.push({
              is_preread: true,
              episode_id: "preread-" + prereadId,
              title: title,
              summary: summary,
              full_text: fullText
            });
          }
          if (list.length >= 100) break;
        }
      }
      
      response = { success: true, data: list };
    } else if (action === "getUserProgress") {
      var syncKey = (e.parameter.sync_key || "").trim().toLowerCase();
      if (!syncKey) {
        throw new Error("同步金鑰不可為空");
      }
      
      syncKey = resolveMasterKey(ss, syncKey);
      
      var sheet = ss.getSheetByName("user_progress");
      if (!sheet) {
        sheet = ss.insertSheet("user_progress");
        sheet.appendRow(["sync_key", "last_read", "completed_list", "last_updated"]);
      }
      
      var found = null;
      var finder = sheet.createTextFinder(syncKey).matchEntireCell(true).useRegularExpression(false);
      var cell = finder.findNext();
      if (cell) {
        var foundRow = cell.getRow();
        var rowData = sheet.getRange(foundRow, 1, 1, 4).getValues()[0];
        found = {
          sync_key: rowData[0],
          last_read: rowData[1] || "",
          completed_list: rowData[2] ? JSON.parse(rowData[2]) : [],
          last_updated: rowData[3] || ""
        };
      }
      response = { success: true, data: found };
    } else {
      response = { success: false, error: "無效的操作" };
    }
  } catch (err) {
    response = { success: false, error: err.toString() };
  }
  
  return ContentService.createTextOutput(JSON.stringify(response))
                       .setMimeType(ContentService.MimeType.JSON);
}

// 訪客修改儲存
function doPost(e) {
  var response = { success: false, error: "未知錯誤" };
  
  try {
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === "saveEpisode") {
      var sheet = ss.getSheetByName("episodes");
      var episodeId = Number(payload.episode_id);
      var mode = payload.mode;
      var author = payload.author;
      var date = payload.date;
      var comment = payload.comment || "";
      
      var dataRange = sheet.getDataRange();
      var data = dataRange.getValues();
      var foundRow = -1;
      
      for (var i = 1; i < data.length; i++) {
        if (Number(data[i][0]) === episodeId) {
          foundRow = i + 1; // Row index is 1-based, and header is row 1
          break;
        }
      }
      
      if (foundRow !== -1) {
        // Update content fields
        if (mode === "title") {
          sheet.getRange(foundRow, 2).setValue(payload.title);
        } else if (mode === "summary") {
          sheet.getRange(foundRow, 3).setValue(payload.summary);
          // If notes-only episode, sync full text
          var notesOnly = [16, 17, 19, 20, 23, 29];
          var isEdited = data[foundRow-1][5] === true || data[foundRow-1][5] === "TRUE";
          if (notesOnly.indexOf(episodeId) !== -1 && !isEdited) {
            sheet.getRange(foundRow, 4).setValue(payload.summary);
          }
        } else if (mode === "full_text") {
          sheet.getRange(foundRow, 4).setValue(payload.full_text);
        }
        
        // Write edit history
        if (mode !== "title") {
          var historyStr = data[foundRow-1][4] || "[]";
          var history = JSON.parse(historyStr);
          
          // Check for duplicate consecutive entry
          var isDuplicate = history.length > 0 && 
                             history[0].date === date && 
                             history[0].author === author && 
                             history[0].mode === mode &&
                             history[0].comment === comment;
                             
          if (!isDuplicate) {
            history.unshift({
              date: date,
              author: author,
              mode: mode,
              comment: comment
            });
            sheet.getRange(foundRow, 5).setValue(JSON.stringify(history));
          }
        }
        response = { success: true };
      } else {
        response = { success: false, error: "找不到該集數 " + episodeId };
      }
      
    } else if (action === "savePreRead") {
      var sheet = ss.getSheetByName("preread");
      var preReadId = Number(payload.id);
      var mode = payload.mode;
      var author = payload.author;
      var date = payload.date;
      var comment = payload.comment || "";
      
      var dataRange = sheet.getDataRange();
      var data = dataRange.getValues();
      var foundRow = -1;
      
      for (var i = 1; i < data.length; i++) {
        if (Number(data[i][0]) === preReadId) {
          foundRow = i + 1;
          break;
        }
      }
      
      if (foundRow !== -1) {
        if (mode === "title") {
          sheet.getRange(foundRow, 2).setValue(payload.title);
        } else if (mode === "summary") {
          sheet.getRange(foundRow, 3).setValue(payload.summary);
        } else if (mode === "full_text") {
          sheet.getRange(foundRow, 4).setValue(payload.full_text);
        }
        
        if (mode !== "title") {
          var historyStr = data[foundRow-1][4] || "[]";
          var history = JSON.parse(historyStr);
          
          var isDuplicate = history.length > 0 && 
                             history[0].date === date && 
                             history[0].author === author && 
                             history[0].mode === mode &&
                             history[0].comment === comment;
                             
          if (!isDuplicate) {
            history.unshift({
              date: date,
              author: author,
              mode: mode,
              comment: comment
            });
            sheet.getRange(foundRow, 5).setValue(JSON.stringify(history));
          }
        }
        response = { success: true };
      } else {
        response = { success: false, error: "找不到該導讀 " + preReadId };
      }
    } else if (action === "saveUserProgress") {
      var syncKey = (payload.sync_key || "").trim().toLowerCase();
      if (!syncKey) {
        throw new Error("同步金鑰不可為空");
      }
      
      syncKey = resolveMasterKey(ss, syncKey);
      
      var sheet = ss.getSheetByName("user_progress");
      if (!sheet) {
        sheet = ss.insertSheet("user_progress");
        sheet.appendRow(["sync_key", "last_read", "completed_list", "last_updated"]);
      }
      
      var foundRow = -1;
      var finder = sheet.createTextFinder(syncKey).matchEntireCell(true).useRegularExpression(false);
      var cell = finder.findNext();
      if (cell) {
        foundRow = cell.getRow();
      }
      
      var nowStr = Utilities.formatDate(new Date(), "GMT+8", "yyyy/MM/dd HH:mm:ss");
      var completedStr = JSON.stringify(payload.completed_list || []);
      
      if (foundRow !== -1) {
        sheet.getRange(foundRow, 2).setValue(payload.last_read || "");
        sheet.getRange(foundRow, 3).setValue(completedStr);
        sheet.getRange(foundRow, 4).setValue(nowStr);
      } else {
        sheet.appendRow([syncKey, payload.last_read || "", completedStr, nowStr]);
      }
      response = { success: true };
    } else if (action === "linkAccount") {
      var primaryKey = (payload.primary_key || "").trim().toLowerCase();
      var secondaryKey = (payload.secondary_key || "").trim().toLowerCase();
      
      if (!primaryKey || !secondaryKey) {
        throw new Error("主要帳號或綁定帳號不可為空");
      }
      
      if (primaryKey === secondaryKey) {
        throw new Error("無法將帳號綁定至自身");
      }
      
      var resolvedPrimary = resolveMasterKey(ss, primaryKey);
      var resolvedSecondary = resolveMasterKey(ss, secondaryKey);
      
      if (resolvedPrimary === resolvedSecondary) {
        response = { success: true, message: "帳號已處於連結狀態" };
      } else {
        var linkSheet = ss.getSheetByName("account_links");
        if (!linkSheet) {
          linkSheet = ss.insertSheet("account_links");
          linkSheet.appendRow(["login_id", "master_account_id", "linked_date"]);
        }
        
        var nowStr = Utilities.formatDate(new Date(), "GMT+8", "yyyy/MM/dd HH:mm:ss");
        
        // Remove existing link for secondaryKey
        var finder = linkSheet.createTextFinder(resolvedSecondary).matchEntireCell(true).useRegularExpression(false);
        var cell = finder.findNext();
        if (cell && cell.getColumn() === 1) {
          linkSheet.deleteRow(cell.getRow());
        }
        
        linkSheet.appendRow([resolvedSecondary, resolvedPrimary, nowStr]);
        
        // Merge progress: Read secondary progress and merge it into primary
        var progressSheet = ss.getSheetByName("user_progress");
        if (progressSheet) {
          var primaryProgressCell = progressSheet.createTextFinder(resolvedPrimary).matchEntireCell(true).findNext();
          var secondaryProgressCell = progressSheet.createTextFinder(resolvedSecondary).matchEntireCell(true).findNext();
          
          var primaryList = [];
          var primaryLastRead = "";
          var primaryRow = -1;
          
          if (primaryProgressCell) {
            primaryRow = primaryProgressCell.getRow();
            primaryLastRead = progressSheet.getRange(primaryRow, 2).getValue() || "";
            var pListStr = progressSheet.getRange(primaryRow, 3).getValue();
            if (pListStr) primaryList = JSON.parse(pListStr);
          }
          
          if (secondaryProgressCell) {
            var secondaryRow = secondaryProgressCell.getRow();
            var secondaryLastRead = progressSheet.getRange(secondaryRow, 2).getValue() || "";
            var sListStr = progressSheet.getRange(secondaryRow, 3).getValue();
            var secondaryList = [];
            if (sListStr) secondaryList = JSON.parse(sListStr);
            
            // Merge lists
            var mergedMap = {};
            primaryList.forEach(function(id) { mergedMap[id] = true; });
            secondaryList.forEach(function(id) { mergedMap[id] = true; });
            var mergedList = Object.keys(mergedMap);
            
            var finalLastRead = primaryLastRead || secondaryLastRead;
            
            if (primaryRow !== -1) {
              progressSheet.getRange(primaryRow, 2).setValue(finalLastRead);
              progressSheet.getRange(primaryRow, 3).setValue(JSON.stringify(mergedList));
              progressSheet.getRange(primaryRow, 4).setValue(nowStr);
            } else {
              progressSheet.appendRow([resolvedPrimary, finalLastRead, JSON.stringify(mergedList), nowStr]);
            }
            
            // Delete secondary progress record
            progressSheet.deleteRow(secondaryRow);
          }
        }
        
        response = { success: true };
      }
    } else {
      response = { success: false, error: "無效的操作" };
    }
  } catch (err) {
    response = { success: false, error: err.toString() };
  }
  
  return ContentService.createTextOutput(JSON.stringify(response))
                       .setMimeType(ContentService.MimeType.JSON);
}

// 一鍵初始化匯入資料庫
function initializeDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. 建立或初始化 episodes 工作表
  var sheetEp = ss.getSheetByName("episodes");
  if (!sheetEp) {
    sheetEp = ss.insertSheet("episodes");
  } else {
    sheetEp.clear();
  }
  sheetEp.appendRow(["episode_id", "title", "summary", "full_text", "edit_history"]);
  
  // 2. 建立或初始化 preread 工作表
  var sheetPr = ss.getSheetByName("preread");
  if (!sheetPr) {
    sheetPr = ss.insertSheet("preread");
  } else {
    sheetPr.clear();
  }
  sheetPr.appendRow(["id", "title", "summary", "full_text", "edit_history"]);
  
  // 3. 獲取線上的原始 episodes 資料
  var epUrl = "https://vbgrdmental-bit.github.io/jingsi-lotus/data/raw_episodes.json";
  var responseEp = UrlFetchApp.fetch(epUrl);
  var rawEpisodes = JSON.parse(responseEp.getContentText());
  
  var rowsEp = [];
  rawEpisodes.forEach(function(ep) {
    rowsEp.push([
      ep.episode_id,
      ep.title || "",
      ep.summary || "",
      ep.full_text || "",
      JSON.stringify(ep.edit_history || [])
    ]);
  });
  
  if (rowsEp.length > 0) {
    sheetEp.getRange(2, 1, rowsEp.length, 5).setValues(rowsEp);
  }
  
  // 4. 獲取線上的導讀 preread 資料
  try {
    var prUrl = "https://vbgrdmental-bit.github.io/jingsi-lotus/data/preread.json";
    var responsePr = UrlFetchApp.fetch(prUrl);
    var rawPrereads = JSON.parse(responsePr.getContentText());
    
    var rowsPr = [];
    rawPrereads.forEach(function(pr) {
      rowsPr.push([
        pr.id,
        pr.title || "",
        pr.summary || "",
        pr.full_text || "",
        JSON.stringify(pr.edit_history || [])
      ]);
    });
    
    if (rowsPr.length > 0) {
      sheetPr.getRange(2, 1, rowsPr.length, 5).setValues(rowsPr);
    }
  } catch (e) {
    Logger.log("品前導讀無線上備份，僅寫入預設首列：" + e.message);
    var rowsPr = [];
    for (var idx = 0; idx < 43; idx++) {
      rowsPr.push([idx, "", "", "", "[]"]);
    }
    sheetPr.getRange(2, 1, rowsPr.length, 5).setValues(rowsPr);
  }
  
  Logger.log("資料庫初始化完成！已匯入 " + rawEpisodes.length + " 集項目。");
}

function resolveMasterKey(ss, key) {
  if (!key) return "";
  var cleanKey = key.trim().toLowerCase();
  
  var sheet = ss.getSheetByName("account_links");
  if (!sheet) {
    sheet = ss.insertSheet("account_links");
    sheet.appendRow(["login_id", "master_account_id", "linked_date"]);
    return cleanKey;
  }
  
  var finder = sheet.createTextFinder(cleanKey).matchEntireCell(true).useRegularExpression(false);
  var cell = finder.findNext();
  if (cell && cell.getColumn() === 1) {
    var row = cell.getRow();
    var masterId = sheet.getRange(row, 2).getValue().toString().trim().toLowerCase();
    if (masterId && masterId !== cleanKey) {
      return resolveMasterKey(ss, masterId);
    }
  }
  return cleanKey;
}
