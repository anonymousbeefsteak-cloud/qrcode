// Fix: Add declarations for Google Apps Script global objects to resolve TypeScript errors.
declare var Utilities: any;
declare var SpreadsheetApp: any;
declare var UrlFetchApp: any;
declare var ContentService: any;

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
function generateOrderId() {
  var timestamp = new Date().getTime().toString().slice(-6);
  var randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
  return "ORD-" + timestamp + randomStr;
}

function logMessage(message, userId) {
  if (!userId) userId = "system";
  var timestamp = new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });
  console.log("[" + timestamp + "] " + userId + ": " + message);
}

function formatPhone(phone) {
  if (!phone) return "";
  var phoneStr = phone.toString();
  if (phoneStr.startsWith("09") && phoneStr.length === 10) {
    return phoneStr.replace(/^(\d{4})(\d{3})(\d{3})$/, "$1-$2-$3");
  }
  return phoneStr;
}

function validatePhone(phone) {
  if (!phone) return false;
  var phoneStr = phone.toString();
  return /^09\d{8}$/.test(phoneStr);
}

function sanitizeText(text) {
  if (typeof text !== 'string') return '';
  return text.trim().replace(/[<>]/g, '');
}

function normalizeText(text) {
  if (typeof text !== 'string') return '';
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
      
      if (name === "orders") {
        sheet.appendRow([
          "訂單編號", "來源", "用戶ID", "LINE User ID", "顧客姓名", 
          "手機", "餐點內容", "總金額", "取餐時間", "備註", 
          "下單時間", "狀態"
        ]);
        sheet.getRange(1, 1, 1, 12).setFontWeight("bold").setBackground("#f0f0f0");
      } else if (name === "users") {
        sheet.appendRow(["LINE User ID", "LINE 名稱", "手機", "綁定時間", "最後使用時間"]);
        sheet.getRange(1, 1, 1, 5).setFontWeight("bold").setBackground("#f0f0f0");
      } else if (name === "menu") {
        sheet.appendRow(["編號", "名稱", "價格", "類別"]);
        sheet.getRange(1, 1, 1, 4).setFontWeight("bold").setBackground("#f0f0f0");
        [
          [1, "滷肉飯", 35, "主食"], [2, "雞肉飯", 40, "主食"],
          [3, "蚵仔煎", 65, "小吃"], [4, "大腸麵線", 50, "湯類"],
          [5, "珍珠奶茶", 45, "飲料"], [6, "鹽酥雞", 60, "小吃"],
          [7, "甜不辣", 40, "小吃"], [8, "蚵仔酥", 70, "小吃"],
          [9, "肉圓", 45, "小吃"], [10, "碗粿", 35, "主食"]
        ].forEach(item => sheet.appendRow(item));
      }
    }
    return sheet;
  } catch (error) {
    logMessage("Failed to get sheet: " + error.message, "system");
    return null;
  }
}

function getSheetData(sheetName) {
  try {
    var sheet = getSheet(sheetName);
    if (!sheet) throw new Error("Could not get sheet: " + sheetName);
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return [];
    var headers = data[0];
    return data.slice(1).map(row => {
      let obj = {};
      headers.forEach((header, index) => obj[header] = row[index]);
      return obj;
    });
  } catch (error) {
    logMessage("Failed to load sheet data: " + error.message, "system");
    return [];
  }
}

function saveOrder(orderData) {
  try {
    var sheet = getSheet("orders");
    if (!sheet) throw new Error("Unable to get orders sheet.");
    
    var orderId = generateOrderId();
    var now = new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });
    
    var row = [
      orderId,
      orderData.source || "UNKNOWN",
      orderData.userId || "unknown",
      orderData.lineUserId || "",
      orderData.customerName || "",
      formatPhone(orderData.customerPhone) || "",
      orderData.items || "",
      orderData.total || 0,
      orderData.pickupTime || now,
      orderData.notes || "",
      now,
      "已確認"
    ];
    
    sheet.appendRow(row);
    logMessage("Order saved successfully: " + orderId, orderData.userId);
    
    var ownerMessage = `🔔 您有新訂單！\n\n訂單編號：${orderId}\n顧客：${orderData.customerName || 'LINE 用戶'}\n手機：${formatPhone(orderData.customerPhone) || '未綁定'}\n餐點：${orderData.items}\n總金額：$${orderData.total}\n備註：${orderData.notes || '無'}`;
    pushMessage(CONFIG.ownerLineUserId, ownerMessage);
    
    return { success: true, orderId: orderId };
  } catch (error) {
    logMessage("Failed to save order: " + error.message, orderData.userId);
    return { success: false, error: error.message };
  }
}

function saveLineOrder(lineUserId, phone, items, total, notes) {
  var profile = getLineProfile(lineUserId);
  var orderData = {
    source: "LINE",
    userId: lineUserId,
    lineUserId: lineUserId,
    customerName: profile ? profile.displayName : "LINE User",
    customerPhone: phone,
    items: items,
    total: total,
    notes: notes
  };
  return saveOrder(orderData);
}

function getUserPhone(lineUserId) {
  try {
    var sheet = getSheet("users");
    if (!sheet) return null;
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === lineUserId) {
        return data[i][2]; 
      }
    }
    return null;
  } catch (error) {
    logMessage("Failed to get user phone: " + error.message, lineUserId);
    return null;
  }
}

function saveUser(lineUserId, lineDisplayName, phone) {
  try {
    var sheet = getSheet("users");
    if (!sheet) throw new Error("Could not get users sheet.");
    
    var data = sheet.getDataRange().getValues();
    var now = new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });
    var rowIndex = -1;

    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === lineUserId) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex !== -1) {
      sheet.getRange(rowIndex, 2).setValue(lineDisplayName || sheet.getRange(rowIndex, 2).getValue());
      sheet.getRange(rowIndex, 3).setValue(phone || sheet.getRange(rowIndex, 3).getValue());
      sheet.getRange(rowIndex, 5).setValue(now); // Update last used time
      logMessage(`User updated: ${lineUserId}`, lineUserId);
    } else {
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
function pushMessage(userId, message) {
  try {
    if (!userId) return false;
    UrlFetchApp.fetch("https://api.line.me/v2/bot/message/push", {
      method: "post",
      headers: { "Authorization": "Bearer " + CONFIG.lineToken, "Content-Type": "application/json" },
      payload: JSON.stringify({ to: userId, messages: [{ type: "text", text: message.substring(0, 5000) }] }),
      muteHttpExceptions: true
    });
    return true;
  } catch (error) {
    logMessage("Push message failed: " + error.message, userId);
    return false;
  }
}

function replyToLine(replyToken, message) {
  try {
    if (!replyToken) return false;
    UrlFetchApp.fetch("https://api.line.me/v2/bot/message/reply", {
      method: "post",
      headers: { "Authorization": "Bearer " + CONFIG.lineToken, "Content-Type": "application/json" },
      payload: JSON.stringify({ replyToken: replyToken, messages: [{ type: "text", text: message.substring(0, 5000) }] }),
      muteHttpExceptions: true
    });
    return true;
  } catch (error) {
    logMessage("Reply failed: " + error.message, "system");
    return false;
  }
}

function getLineProfile(userId) {
  try {
    var response = UrlFetchApp.fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
      method: "get",
      headers: { "Authorization": "Bearer " + CONFIG.lineToken },
      muteHttpExceptions: true
    });
    if (response.getResponseCode() !== 200) return null;
    return JSON.parse(response.getContentText());
  } catch (error) {
    logMessage("Get LINE profile failed: " + error.message, userId);
    return null;
  }
}

// ==================== 命令處理 ====================
function handleMenu() {
  var menuData = getSheetData("menu");
  var menuText = "📋 " + CONFIG.restaurant.name + " 菜單\n\n";
  
  if (menuData.length === 0) {
    menuText += "⚠️ 菜單暫時無法載入，請稍後再試。\n";
  } else {
    var categories = {};
    menuData.forEach(item => {
      if (!categories[item["類別"]]) {
        categories[item["類別"]] = [];
      }
      categories[item["類別"]].push(item);
    });
    
    for (var category in categories) {
      menuText += `【${category}】\n`;
      categories[category].forEach(item => {
        menuText += `${item["編號"]}. ${item["名稱"]} - $${item["價格"]}\n`;
      });
      menuText += "\n";
    }
  }
  
  menuText += "📝 訂餐格式：1 x2, 4 x1\n";
  menuText += "💡 可加備註：1 x2 備註不要香菜\n";
  menuText += "⏰ 營業時間：" + CONFIG.restaurant.openingHours;
  
  return menuText;
}

function handleOrder(orderText, lineUserId) {
  try {
    var normalizedOrderText = normalizeText(orderText);
    var menuData = getSheetData("menu");
    if (menuData.length === 0) return "❌ 菜單載入失敗，無法訂餐。";
    
    var userPhone = getUserPhone(lineUserId);
    var items = [];
    var total = 0;
    var notes = "";
    
    var partsWithNotes = normalizedOrderText.split('備註');
    if (partsWithNotes.length > 1) {
      normalizedOrderText = partsWithNotes[0].trim();
      notes = sanitizeText(partsWithNotes[1]);
    }
    
    var parts = normalizedOrderText.split(/[,]/);
    var hasValidItems = false;
    
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i].trim();
      if (!part) continue;
      
      var match = part.match(/(\d+)\s*[xX*]\s*(\d+)/);
      if (match) {
        var itemId = parseInt(match[1]);
        var quantity = parseInt(match[2]);
        
        if (quantity <= 0 || isNaN(quantity) || quantity > 50) return `❌ 數量錯誤：${part}`;
        
        var menuItem = menuData.find(item => item["編號"] == itemId);
        if (!menuItem) return `❌ 未知的餐點編號：${itemId}`;
        
        var itemTotal = menuItem["價格"] * quantity;
        total += itemTotal;
        items.push(menuItem["名稱"] + " x" + quantity);
        hasValidItems = true;
      }
    }

    if (!hasValidItems) return "❌ 未找到有效訂單項目。請使用格式：1 x2, 4 x1";

    var saveResult = saveLineOrder(lineUserId, userPhone, items.join(", "), total, notes);
    if (!saveResult.success) return "❌ 訂單儲存失敗，請稍後重試。";

    var response = `✅ 訂單已確認！\n\n訂單編號：${saveResult.orderId}\n` +
                   `🍽️ 內容：\n${items.join("\n")}\n\n` +
                   `💵 總金額：$${total}\n` +
                   (notes ? `📝 備註：${notes}\n` : '') +
                   `\n📍 ${CONFIG.restaurant.address}\n` +
                   `📞 ${CONFIG.restaurant.phone}\n`;

    if (!userPhone) response += "\n⚠️ 提醒：您尚未綁定手機，請使用「綁定 0912345678」進行綁定。";
    
    return response;
  } catch (error) {
    logMessage("Failed to handle order: " + error.message, lineUserId);
    return "❌ 系統錯誤，訂單處理失敗。";
  }
}

function handleBind(bindText, lineUserId) {
  try {
    var normalizedBindText = normalizeText(bindText);
    var phone = normalizedBindText.replace(/^綁定\s*/, "").trim().replace(/[^\d]/g, "");
    if (!validatePhone(phone)) return "❌ 手機格式錯誤，請使用：綁定 0912345678";
    
    var profile = getLineProfile(lineUserId);
    var saveResult = saveUser(lineUserId, profile ? profile.displayName : "", phone);
    if (!saveResult.success) return "❌ 綁定失敗，請稍後重試。";

    return `✅ 綁定成功！\n📱 手機號碼：${formatPhone(phone)}`;
  } catch (error) {
    logMessage("Failed to handle bind: " + error.message, lineUserId);
    return "❌ 綁定時發生錯誤。";
  }
}

function handleHelp() {
    return "🤖 " + CONFIG.restaurant.name + " 訂餐系統\n\n" +
           "🍽️ 可用指令：\n" +
           "• 「菜單」 - 查看完整菜單\n" +
           "• 「1 x2, 4 x1」 - 下單訂餐\n" +
           "• 「綁定 0912345678」 - 綁定手機號碼\n" +
           "• 「幫助」 - 顯示此說明";
}


function handleUserProfile(data) {
    try {
        const lineUserId = data.customerLineId;
        const displayName = data.customerName;

        if (!lineUserId) {
            logMessage("User profile request is missing a LINE User ID.", "system");
            return { status: "error", message: "Missing LINE User ID in the received data." };
        }
        
        const phone = data.customerPhone || "";
        const saveResult = saveUser(lineUserId, displayName, phone);

        if (!saveResult.success) {
            logMessage(`Failed to save user data for ${lineUserId}. Error: ${saveResult.error}`, lineUserId);
            return { status: "error", message: "Failed to save user data to the spreadsheet." };
        }
        
        logMessage("LIFF user binding successful: " + lineUserId, lineUserId);
        return { status: "success", message: "User data has been bound." };
    } catch (error) {
        const userId = data.customerLineId || "unknown";
        logMessage("An unexpected error occurred in handleUserProfile: " + error.message, userId);
        return { status: "error", message: "A system error occurred while processing user data." };
    }
}

// ==================== 主處理函數 ====================
function doPost(e) {
  try {
    var body = e.postData.contents;
    var data = JSON.parse(body);

    // Route 1: Request from LIFF App (has a 'source' property)
    if (data.source) {
      logMessage("Received data from web source: " + data.source, data.customerLineId);
      var result = handleUserProfile(data);
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    } 
    // Route 2: Request from LINE Webhook (has an 'events' property)
    else if (data.events) {
      var signature = e.headers['x-line-signature'] || e.headers['X-Line-Signature'];
      if (!signature || !verifyWebhookSignature(body, signature)) {
        logMessage("Webhook signature verification failed or signature missing.", "system");
        // It's better to return OK for verification fails to prevent LINE from retrying.
        return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
      }
      
      data.events.forEach(function(event) {
        var lineUserId = event.source.userId;
        var replyToken = event.replyToken;
        if (!lineUserId || !replyToken) return;

        // Handle follow event
        if (event.type === "follow") {
          var profile = getLineProfile(lineUserId);
          var displayName = profile ? profile.displayName : "";
          logMessage("User followed: " + lineUserId + ", Name: " + displayName, lineUserId);
          saveUser(lineUserId, displayName, "");
          replyToLine(replyToken, `🎉 感謝您加入 ${CONFIG.restaurant.name}！\n請點擊「立即訂餐」開始點餐，或使用「綁定 0912345678」綁定手機號碼。\n立即訂餐：https://liff.line.me/2008276630-bYNjwMx7`);
        
        // Handle text message event
        } else if (event.type === "message" && event.message.type === "text") {
            var messageText = sanitizeText(event.message.text);
            logMessage("Received message: " + messageText, lineUserId);
            var response;
            var lowerText = messageText.toLowerCase();

            if (lowerText === "菜單" || lowerText === "menu") {
                response = handleMenu();
            } else if (lowerText.startsWith("綁定")) {
                response = handleBind(messageText, lineUserId);
            } else if (lowerText === "幫助" || lowerText === "help") {
                response = handleHelp();
            } else {
                response = handleOrder(messageText, lineUserId);
            }
            replyToLine(replyToken, response);
        }
      });
      return ContentService.createTextOutput("OK").setMimeType(ContentService.MimeType.TEXT);
    }
    // Fallback for unknown requests
    else {
      logMessage("Unknown POST request type.", "system");
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Unknown request type" })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    logMessage("doPost Error: " + error.message, "system");
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "System error: " + error.message })).setMimeType(ContentService.MimeType.JSON);
  }
}
