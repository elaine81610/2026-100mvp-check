/**
 * -----------------------------------------
 * 得獎者資訊確認 Web App - GAS 後端程式碼
 * -----------------------------------------
 * 
 * 部署方式：
 * 1. 在 Google Sheets (包含 Main_Data 與 Pending_Requests 兩個工作表) 開啟指令碼編輯器。
 * 2. 貼上此程式碼。
 * 3. 部署為「網頁應用程式」，執行身分為自己，存取權限設為「所有人」。
 */

const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE'; // 替換為你的試算表 ID，若綁定在試算表可使用 SpreadsheetApp.getActiveSpreadsheet().getId()
const DRIVE_FOLDER_ID = 'YOUR_DRIVE_FOLDER_ID_HERE'; // 替換為你要儲存上傳檔案的 Google Drive 資料夾 ID

// 處理 GET 請求，回傳 Index.html (如果是要直接在 GAS 部署 HTML 頁面才需要)
function doGet(e) {
  // 由於前端將採用獨立 HTML 或外部 Hosting，若要整合進 GAS，可取消下行註解：
  // return HtmlService.createHtmlOutputFromFile('Index').setTitle('得獎者資訊確認系統').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  
  // 作為 API 使用時，回傳簡單說明
  return ContentService.createTextOutput("這是得獎者資訊確認的後端 API。");
}

/**
 * Section 0: 在 Main_Data 搜尋姓名/作品名稱
 * @param {string} query 搜尋關鍵字
 * @returns {object} { success: boolean, data: object|null, message: string }
 */
function searchWinner(query) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Main_Data');
    const data = sheet.getDataRange().getValues();
    
    // 假設欄位順序：A=得獎編號, B=團隊/個人名稱, C=作品名稱, D=聯絡人, E=電話, F=Email, G=地址
    const headers = data[0];
    const idIdx = 0, teamNameIdx = 1, projectNameIdx = 2;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const teamName = String(row[teamNameIdx]);
      const projectName = String(row[projectNameIdx]);
      
      if (teamName.includes(query) || projectName.includes(query)) {
        return {
          success: true,
          data: {
            id: row[idIdx],
            teamName: row[teamNameIdx],
            projectName: row[projectNameIdx]
          },
          message: "查有資料"
        };
      }
    }
    
    return { success: false, data: null, message: "查無獲獎資訊" };
  } catch (error) {
    return { success: false, data: null, message: "系統錯誤: " + error.toString() };
  }
}

/**
 * Section 1: 驗證編號與姓名，回傳該筆得獎者的既有資料
 * @param {string} id 得獎編號
 * @param {string} name 團隊/個人名稱
 * @returns {object} { success: boolean, data: object|null, message: string }
 */
function loginVerify(id, name) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Main_Data');
    const data = sheet.getDataRange().getValues();
    
    // 假設欄位順序：A=得獎編號, B=團隊名稱, C=作品名稱, D=聯絡人, E=電話, F=Email, G=地址
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (String(row[0]) === String(id) && String(row[1]) === String(name)) {
        return {
          success: true,
          data: {
            id: row[0],
            teamName: row[1],
            projectName: row[2],
            contactName: row[3],
            phone: row[4],
            email: row[5],
            address: row[6]
          },
          message: "驗證成功"
        };
      }
    }
    return { success: false, data: null, message: "驗證失敗：得獎編號或姓名錯誤" };
  } catch (error) {
    return { success: false, data: null, message: "系統錯誤: " + error.toString() };
  }
}

/**
 * Section 2: 處理變更申請，寫入 Pending_Requests (待審核表)
 * @param {object} formData 包含所有前端表單欄位與檔案 Base64 的物件
 * @returns {object} { success: boolean, message: string }
 */
function submitPendingRequest(formData) {
  try {
    // 1. 處理檔案上傳 (若有)
    let photoUrl = "";
    let presentationUrl = "";
    
    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    
    if (formData.photoFile && formData.photoFileName) {
      const blob = Utilities.newBlob(Utilities.base64Decode(formData.photoFile), formData.photoMimeType, formData.photoFileName);
      const file = folder.createFile(blob);
      photoUrl = file.getUrl();
    }
    
    if (formData.presentationFile && formData.presentationFileName) {
      const blob = Utilities.newBlob(Utilities.base64Decode(formData.presentationFile), formData.presentationMimeType, formData.presentationFileName);
      const file = folder.createFile(blob);
      presentationUrl = file.getUrl();
    }
    
    // 2. 寫入 Pending_Requests
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Pending_Requests');
    
    const timestamp = new Date();
    const status = "Pending"; // 預設狀態
    
    // 寫入陣列 (依據 Pending_Requests 欄位設計)
    const newRow = [
      timestamp,
      status,
      formData.id,
      formData.teamName,
      formData.contactName,
      formData.phone,
      formData.email,
      formData.address,
      formData.projectName,
      formData.projectDesc,
      formData.thanks,
      formData.attendCeremony,
      formData.attendDinner,
      formData.guestCount,
      formData.diet,
      photoUrl,
      presentationUrl
    ];
    
    sheet.appendRow(newRow);
    
    return { success: true, message: "申請已成功提交，狀態為 Pending" };
  } catch (error) {
    return { success: false, message: "提交失敗: " + error.toString() };
  }
}

/**
 * 自動化審核腳本: 當管理員在 Pending_Requests 將狀態改為 Approved 時觸發
 * 將資料覆蓋回 Main_Data 對應編號的資料列
 * 可以透過 onEdit 觸發器來執行
 */
function onEdit(e) {
  if (!e || !e.range) return;
  
  const sheet = e.range.getSheet();
  if (sheet.getName() !== 'Pending_Requests') return;
  
  // 假設 Status 位於第 2 欄 (B欄)
  const statusColIndex = 2; 
  const editedRow = e.range.getRow();
  const editedCol = e.range.getColumn();
  const newValue = e.value;
  
  // 只在狀態被改為 Approved 時處理，忽略標題列(row 1)
  if (editedCol === statusColIndex && editedRow > 1 && newValue === 'Approved') {
    approveRequest(editedRow, sheet);
  }
}

/**
 * 覆寫資料至 Main_Data (母表)
 * @param {number} rowId 待審核表中的列號
 * @param {GoogleAppsScript.Spreadsheet.Sheet} pendingSheet 待審核表物件
 */
function approveRequest(rowId, pendingSheet) {
  const ss = pendingSheet.getParent();
  const mainSheet = ss.getSheetByName('Main_Data');
  
  // 取得該列資料
  const pendingData = pendingSheet.getRange(rowId, 1, 1, pendingSheet.getLastColumn()).getValues()[0];
  
  // pendingData 對應: [0:Timestamp, 1:Status, 2:ID, 3:TeamName, 4:ContactName, 5:Phone, 6:Email, 7:Address, 8:ProjectName, ...]
  const targetId = pendingData[2]; 
  
  const mainData = mainSheet.getDataRange().getValues();
  let targetMainRow = -1;
  
  // 尋找 Main_Data 中對應的 ID
  for (let i = 1; i < mainData.length; i++) {
    if (String(mainData[i][0]) === String(targetId)) {
      targetMainRow = i + 1; // getRange index starts at 1
      break;
    }
  }
  
  if (targetMainRow !== -1) {
    // 覆蓋母表對應欄位 (依據 Main_Data 實際欄位順序修改)
    // 假設 Main_Data 欄位：編號, 團隊名稱, 作品名稱, 聯絡人, 電話, Email, 地址, 作品簡介, 感謝詞, 典禮, 晚宴, 同行數, 飲食, 合照URL, 簡報URL
    mainSheet.getRange(targetMainRow, 2).setValue(pendingData[3]);  // TeamName
    mainSheet.getRange(targetMainRow, 3).setValue(pendingData[8]);  // ProjectName
    mainSheet.getRange(targetMainRow, 4).setValue(pendingData[4]);  // ContactName
    mainSheet.getRange(targetMainRow, 5).setValue(pendingData[5]);  // Phone
    mainSheet.getRange(targetMainRow, 6).setValue(pendingData[6]);  // Email
    mainSheet.getRange(targetMainRow, 7).setValue(pendingData[7]);  // Address
    mainSheet.getRange(targetMainRow, 8).setValue(pendingData[9]);  // ProjectDesc
    mainSheet.getRange(targetMainRow, 9).setValue(pendingData[10]); // Thanks
    mainSheet.getRange(targetMainRow, 10).setValue(pendingData[11]);// AttendCeremony
    mainSheet.getRange(targetMainRow, 11).setValue(pendingData[12]);// AttendDinner
    mainSheet.getRange(targetMainRow, 12).setValue(pendingData[13]);// GuestCount
    mainSheet.getRange(targetMainRow, 13).setValue(pendingData[14]);// Diet
    mainSheet.getRange(targetMainRow, 14).setValue(pendingData[15]);// PhotoUrl
    mainSheet.getRange(targetMainRow, 15).setValue(pendingData[16]);// PresentationUrl
    
    // 可選：發送通知信給得獎者
    // MailApp.sendEmail(pendingData[6], "得獎者資料審核通過", "您的得獎資料已更新成功。");
  } else {
    // 若找不到對應編號，可以在 Status 欄位標記錯誤
    pendingSheet.getRange(rowId, 2).setValue('Error: ID not found in Main_Data');
  }
}
