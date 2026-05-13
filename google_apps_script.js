// オーナー様のメールアドレス（GoogleカレンダーIDとしても使用します）
var OWNER_EMAIL = "otegaru.body@gmail.com"; 

// ==========================================
// サイトからのデータ読み取り (GET)
// ==========================================
function doGet(e) {
  try {
    var fullDayEvents = [];
    var timeBlocks = [];

    // --- Googleカレンダーから予定を取得 ---
    var calendar = CalendarApp.getCalendarById(OWNER_EMAIL);
    
    if (calendar) {
      // 本日から3ヶ月後までの予定を取得
      var today = new Date();
      var threeMonthsLater = new Date();
      threeMonthsLater.setMonth(today.getMonth() + 3); 
      
      var events = calendar.getEvents(today, threeMonthsLater);
      
      for (var i = 0; i < events.length; i++) {
        var ev = events[i];
        var title = ev.getTitle();
        
        if (ev.isAllDayEvent()) {
          // 終日予定（営業 or 休業）
          if (title.indexOf("営業") !== -1 || title.indexOf("休業") !== -1) {
            var evDate = ev.getStartTime(); 
            var y = evDate.getFullYear();
            var m = ("0" + (evDate.getMonth() + 1)).slice(-2);
            var d = ("0" + evDate.getDate()).slice(-2);
            var dateStr = y + "-" + m + "-" + d;
            
            var status = title.indexOf("休業") !== -1 ? "休業" : "営業";
            fullDayEvents.push({ date: dateStr, status: status, note: title });
          }
        } else {
          // 時間指定の予定（ブロックする時間帯）
          var start = ev.getStartTime();
          var end = ev.getEndTime();
          
          var y = start.getFullYear();
          var m = ("0" + (start.getMonth() + 1)).slice(-2);
          var d = ("0" + start.getDate()).slice(-2);
          var dateStr = y + "-" + m + "-" + d;
          
          var startH = ("0" + start.getHours()).slice(-2);
          var startMin = ("0" + start.getMinutes()).slice(-2);
          var endH = ("0" + end.getHours()).slice(-2);
          var endMin = ("0" + end.getMinutes()).slice(-2);
          
          timeBlocks.push({
            date: dateStr,
            startTime: startH + ":" + startMin,
            endTime: endH + ":" + endMin,
            title: title
          });
        }
      }
    }

    var responseData = {
      status: "success",
      dates: fullDayEvents,
      timeBlocks: timeBlocks
    };
    
    return ContentService.createTextOutput(JSON.stringify(responseData))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================
// サイトからの予約・キャンセル処理 (POST)
// ==========================================
function doPost(e) {
  try {
    var data;
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else {
      data = { action: "test", name: "テスト実行" };
    }
    
    if (data.action === "test") {
      return ContentService.createTextOutput(JSON.stringify({ "status": "success", "message": "Test OK" })).setMimeType(ContentService.MimeType.JSON);
    }

    var isCancel = (data.action === "cancel");
    var calendar = CalendarApp.getCalendarById(OWNER_EMAIL);

    if (!isCancel && calendar && data.dateRaw && data.time) {
       // --- カレンダーに予約予定を作成 ---
       var parts = data.dateRaw.split("-");
       var year = parseInt(parts[0], 10);
       var month = parseInt(parts[1], 10) - 1;
       var day = parseInt(parts[2], 10);
       
       var timeParts = data.time.split(":");
       var hours = parseInt(timeParts[0], 10);
       var mins = parseInt(timeParts[1], 10);
       
       var startDate = new Date(year, month, day, hours, mins, 0);
       
       // メニューから所要時間を計算 (簡易的)
       var durationMins = 60;
       if (data.menu.indexOf("40分") !== -1) durationMins = 40;
       if (data.menu.indexOf("30分") !== -1) durationMins = 30;
       
       var endDate = new Date(startDate.getTime() + durationMins * 60000);
       
       var eventTitle = "【予約】" + data.name + "様 - " + data.menu;
       var description = "電話番号: " + data.phone + "\nメール: " + data.email + "\n備考: " + (data.notes || "なし");
       
       calendar.createEvent(eventTitle, startDate, endDate, { description: description });
    }

    // --- メール送信処理 ---
    var subject = isCancel ? "【おてがる整体】ご予約のキャンセルを承りました" : "【おてがる整体】ご予約ありがとうございます";
    var ownerSubject = isCancel ? "【キャンセル通知】" + data.date + " " + data.name + "様" : "【新規予約】" + data.date + " " + data.name + "様";
    
    // お客様向けメール本文
    var bodyForCustomer = data.name + " 様\n\n";
    if (isCancel) {
      bodyForCustomer += "以下のご予約のキャンセルを承りました。\n\n";
    } else {
      bodyForCustomer += "この度は、おてがる整体にご予約いただき誠にありがとうございます。\n以下の内容で予約を承りました。\n\n";
    }

    bodyForCustomer += "■ ご予約内容\n"
      + "【日時】" + data.date + " " + data.time + "\n"
      + "【メニュー】" + data.menu + "\n"
      + "【お名前】" + data.name + " 様\n"
      + "【電話番号】" + data.phone + "\n"
      + "【備考】\n" + (data.notes || "なし") + "\n\n";

    if (!isCancel) {
      bodyForCustomer += "ご来店を心よりお待ちしております。\n"
        + "※キャンセルや変更の場合は、サイトの「予約確認」ページからお手続きください。\n\n";
    } else {
      bodyForCustomer += "またのご利用を心よりお待ちしております。\n\n";
    }

    bodyForCustomer += "--------------------------\n"
      + "おてがる整体\n"
      + "仙台市青葉区一番町２丁目２−１１ ＴＫビル 6F\n\n"
      + "▼お問い合わせはこちらでも承っております▼\n"
      + "【公式LINE】 https://lin.ee/ddFvc0y\n"
      + "【Instagram】 https://www.instagram.com/otegaru_body/\n"
      + "--------------------------";

    // オーナー向けメール本文
    var bodyForOwner = (isCancel ? "予約がキャンセルされました。\n\n" : "新しい予約が入りました。\n\n")
      + "■ ご予約内容\n"
      + "【日時】" + data.date + " " + data.time + "\n"
      + "【メニュー】" + data.menu + "\n"
      + "【お名前】" + data.name + " 様\n"
      + "【電話番号】" + data.phone + "\n"
      + "【メール】" + data.email + "\n"
      + "【備考】\n" + (data.notes || "なし") + "\n";

    MailApp.sendEmail(data.email, subject, bodyForCustomer);
    MailApp.sendEmail(OWNER_EMAIL, ownerSubject, bodyForOwner);
    
    return ContentService.createTextOutput(JSON.stringify({ "status": "success" })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
