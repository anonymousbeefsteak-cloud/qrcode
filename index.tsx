// FIX: Add type declarations for Google Apps Script global objects to resolve TypeScript errors.
declare const Utilities: any;
declare const SpreadsheetApp: any;
declare const UrlFetchApp: any;
declare const ContentService: any;

// ==================== 配置設定 ====================
var CONFIG = {
  restaurant: {
    name: "無名牛排",
    phone: "02-1234-5678",
    address: "臺北市信義區松壽路123號",
    openingHours: "10:00-22:00"
  },
  sheetId: "101phIlp8Eu9czR8rKnIBfv8c1wPVLftlva1eaAl3nCs",
  lineToken: "O3HioQPe67jIFCZUf5xkyESVdEhYTzUqlqAjd8mlOYzCvjiCFsx8nkbKmUpIXdbwWf+vSyn35bwq2rm2srj96L3r8UCXluH2PA/VV/ldKSi8AHRJk75Y8Ig9ML75rPBBSnRpPLRWvoKCzAQNvgpdTwdB04t89/1O/w1cDnyilFU=",
  channelSecret: "f0dde9061285ba2105ba96fbe0e41f9c",
  friendLink: "https://line.me/R/ti/p/@561zotgq",
  ownerLineUserId: "U02013fa93bee9f880df64d0ef0b63c18"
};

// ==================== 工具函數 ====================
function logMessage(message, userId) {
  if (!userId) userId = "system";
  var timestamp = new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });
  // In Google Apps Script, console.log is the standard way to log to Stackdriver.
  console.log("[" + timestamp + "] " + userId + ": " + message);
}

function normalizeText(text) {
  if (typeof text !== 'string') return '';
  // Converts full-width characters to half-width for consistent processing.
  return text.replace(/[０-９ｘＸ＊，]/g, function(s) {
    const map = {
      '０': '0', '１': '1', '２': '2', '３': '3', '４': '4',
      '５': '5', '６': '6', '７': '7', '８': '8', '９': '9',
      'ｘ': 'x', 'Ｘ': 'X', '＊': '*', '，': ','
    };
    return map[s];
  });
}

function verifyWebhookSignature(body, signature) {
  try {
    var crypto = Utilities.computeHmacSha256Signature(body, CONFIG.channelSecret);
    var encodedSignature = Utilities.base64Encode(crypto);
    return signature === encodedSignature;
  } catch (error) {
    logMessage("Webhook signature verification error: " + error.message, "system");
    return false;
  }
}

// ==================== Google Sheet 存儲與載入 ====================
function getSheet(name) {
  try {
    if (!CONFIG.sheetId || CONFIG.sheetId.includes("YOUR_")) {
      throw new Error("CONFIG.sheetId is not set. Please provide a valid Google Sheet ID in the script.");
    }
    
    var spreadsheet = SpreadsheetApp.openById(CONFIG.sheetId);
    var sheet = spreadsheet.getSheetByName(name);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(name);
      
      if (name === "users") {
        sheet.appendRow(["LINE User ID", "LINE 名稱", "手機", "綁定時間", "最後使用時間"]);
        sheet.getRange(1, 1, 1, 5).setFontWeight("bold").setBackground("#f0f0f0");
      }
    }
    return sheet;
  } catch (error) {
    logMessage("Failed to get sheet '" + name + "'. Error: " + error.message, "system");
    return null;
  }
}

function saveUser(lineUserId, lineDisplayName, phone) {
  try {
    var sheet = getSheet("users");
    if (!sheet) throw new Error("Could not get users sheet. Check permissions and sheetId.");
    
    var data = sheet.getDataRange().getValues();
    var now = new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });
    var rowIndex = -1;

    // Find if user already exists
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === lineUserId) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex !== -1) {
      // Update existing user
      sheet.getRange(rowIndex, 2).setValue(lineDisplayName || sheet.getRange(rowIndex, 2).getValue());
      sheet.getRange(rowIndex, 3).setValue(phone || sheet.getRange(rowIndex, 3).getValue());
      sheet.getRange(rowIndex, 5).setValue(now); // Update last used time
      logMessage(`User updated: ${lineUserId}`, lineUserId);
    } else {
      // Create new user
      sheet.appendRow([lineUserId, lineDisplayName || "", phone || "", now, now]);
      logMessage(`User created: ${lineUserId}`, lineUserId);
    }

    return { success: true, action: rowIndex === -1 ? "created" : "updated" };
  } catch (error) {
    logMessage("Failed to save user: " + error.message, lineUserId);
    return { success: false, error: error.message };
  }
}

// ==================== LINE 服務 ====================
function replyToLine(replyToken, message) {
  try {
    if (!replyToken) return;
    var payload = {
      replyToken: replyToken,
      messages: [{ type: "text", text: message.substring(0, 5000) }]
    };
    UrlFetchApp.fetch("https://api.line.me/v2/bot/message/reply", {
      method: "post",
      headers: { "Authorization": "Bearer " + CONFIG.lineToken, "Content-Type": "application/json" },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (error) {
    logMessage("Reply failed: " + error.message, "system");
  }
}

function getLineProfile(userId) {
  try {
    var response = UrlFetchApp.fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
      method: "get",
      headers: { "Authorization": "Bearer " + CONFIG.lineToken },
      muteHttpExceptions: true
    });
    if (response.getResponseCode() === 200) {
      return JSON.parse(response.getContentText());
    }
    return null;
  } catch (error) {
    logMessage("Get LINE profile failed: " + error.message, userId);
    return null;
  }
}

// ==================== 命令處理 ====================
function handleUserProfile(data) {
    try {
        if (!data || typeof data !== 'object') {
            throw new Error("Invalid or missing request data.");
        }
        const lineUserId = data.customerLineId;
        const displayName = data.customerName || "";
        if (!lineUserId) {
            throw new Error("Missing LINE User ID in the received data.");
        }
        
        const phone = data.customerPhone || "";
        const saveResult = saveUser(lineUserId, displayName, phone);

        if (!saveResult.success) {
            throw new Error(saveResult.error || "Failed to save user data to the spreadsheet.");
        }
        
        logMessage("LIFF user binding successful: " + lineUserId, lineUserId);
        return { status: "success", message: "User data has been bound." };
    } catch (error) {
        const userId = data && data.customerLineId ? data.customerLineId : "unknown";
        logMessage("Error in handleUserProfile: " + error.message, userId);
        return { status: "error", message: "System error occurred while processing user data: " + error.message };
    }
}

// ==================== 主處理函數 ====================
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("Invalid request: missing post data");
    }

    var body = e.postData.contents;
    var data;
    try {
      data = JSON.parse(body);
    } catch (parseError) {
      throw new Error("Invalid JSON format in request body");
    }

    // Route 1: Request from LIFF App (distinguished by the 'source' property)
    if (data.source) {
      logMessage("Received data from web source: " + data.source, data.customerLineId || "unknown");
      var result = handleUserProfile(data);
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    } 
    // Route 2: Request from LINE Webhook (distinguished by the 'events' property)
    else if (data.events) {
      var signature = e.headers['x-line-signature'] || e.headers['X-Line-Signature'];
      if (!signature || !verifyWebhookSignature(body, signature)) {
        logMessage("Webhook signature verification failed or signature missing.", "system");
        // Return OK to prevent LINE from retrying failed requests.
        return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
      }
      
      data.events.forEach(function(event) {
        if (event.type === "follow") {
          var lineUserId = event.source.userId;
          var replyToken = event.replyToken;
          if (!lineUserId || !replyToken) return;

          var profile = getLineProfile(lineUserId);
          var displayName = profile ? profile.displayName : "";
          logMessage("User followed: " + lineUserId + ", Name: " + displayName, lineUserId);
          saveUser(lineUserId, displayName, "");
          replyToLine(replyToken, `🎉 感謝您加入 ${CONFIG.restaurant.name}！\n請點擊「立即訂餐」開始點餐，或使用「綁定 0912345678」綁定手機號碼。\n立即訂餐：https://liff.line.me/2008276630-bYNjwMx7`);
        }
      });
      return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
    }
    // Fallback for any other type of request
    else {
      throw new Error("Unknown request type. Does not contain 'source' or 'events'.");
    }
  } catch (error) {
    logMessage("Critical error in doPost: " + error.message, "system");
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "System error: " + error.message })).setMimeType(ContentService.MimeType.JSON);
  }
}
