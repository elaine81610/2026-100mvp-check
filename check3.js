    // 您已經更新好正確 ID 的最新 API 網址
    const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxFajKhxD3dLT7NlE5mx4PfvkiDRFClklSnH9PTgAbT80XtTNyFubYtlfm_lUKZoiNwXA/exec";

    document.getElementById('searchBtn').addEventListener('click', async () => {
      const orderIdQuery = document.getElementById('searchOrderId').value.trim();
      const nameQuery = document.getElementById('searchName').value.trim();
      const resultDiv = document.getElementById('searchResult');
      const searchBtn = document.getElementById('searchBtn');
      
      if (!orderIdQuery && !nameQuery) {
        resultDiv.innerHTML = `<div class="text-danger fw-bold mt-3 text-center">請至少輸入一項查詢條件</div>`;
        return;
      }

      // 載入狀態
      searchBtn.disabled = true;
      searchBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>查詢中...';
      resultDiv.innerHTML = '';

      try {
        const response = await fetch(GAS_API_URL, {
          method: 'POST',
          body: JSON.stringify({
            orderId: orderIdQuery,
            candidateName: nameQuery
          }),
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          }
        });

        const result = await response.json();

        if (result.status === 'success' && result.data) {
          const found = result.data;
          const statusRaw = String(found.statusRaw || "").toLowerCase();
          
          // 模糊比對得獎關鍵字 (依據貴司實際情況調整)
          const isWinner = statusRaw.includes('得獎') || statusRaw.includes('入選') || statusRaw.includes('正取') || statusRaw === 'super' || statusRaw === '1~super' || statusRaw === '0.5' || statusRaw === '是';

          if (isWinner) {
            // 情境 3: 得獎
            resultDiv.innerHTML = `
              <div class="mt-4 p-4 text-center rounded-4" style="background: rgba(198, 154, 85, 0.05); border: 1px dashed var(--accent-gold); animation: fadeIn 0.4s ease;">
                <h5 class="mb-3 fs-4" style="color: var(--accent-gold); font-weight: 800;"> 恭喜您榮獲 2026 年第 19 屆 100MVP 經理人！ </h5>
                <div class="mb-4 fs-5" style="color: var(--text-main);">
                  <strong class="fs-4">候選人：${found.candidateName}</strong>
                </div>
                <p class="mb-4" style="color: var(--text-main); line-height: 1.6;">
                  為保障個人隱私，專屬登入資訊已寄送至您報名時留存的電子信箱。<br>
                  <span class="text-muted" style="font-size: 0.95rem;">請點擊下方按鈕，前往確認得主相關資料。</span>
                </p>
                <a href="#" target="_blank" class="btn btn-brand-primary px-4 shadow-sm" onclick="alert('稍後請將這裡的 href 替換為【得獎人資料確認頁】的網址');">前往資料確認頁</a>
              </div>
            `;
          } else {
            // 情境 2: 落選
            resultDiv.innerHTML = `
              <div class="mt-4 p-4 text-center bg-white shadow-sm rounded-4 border border-light" style="animation: fadeIn 0.4s ease;">
                <h5 class="mb-3 fs-5 text-muted fw-bold">感謝您的參與</h5>
                <p class="text-muted mb-0" style="line-height: 1.6;">經評審團決議，很遺憾您未在此次獲獎名單中。<br>感謝您對本活動的支持，期待未來能再次看到您的優秀表現！</p>
              </div>
            `;
          }
        } else if (result.status === 'not_found') {
          // 情境 1: 查無資料
          resultDiv.innerHTML = `
            <div class="mt-4 p-4 text-center bg-white shadow-sm rounded-4 border border-light" style="animation: fadeIn 0.4s ease;">
              <h5 class="mb-3 fs-5 text-danger fw-bold">查無資料</h5>
              <p class="text-muted mb-4">請確認您輸入的「Event Go 訂單編號」或「候選人姓名」是否正確。<br>若持續無法查詢，請聯繫主辦單位。</p>
              <div class="p-3 rounded-3" style="background-color: #F9F7F3; border: 1px solid #EAE6DF;">
                <p class="mb-1 text-dark fw-bold">100MVP 專案小組</p>
                <p class="mb-0 text-muted small">信箱：100mvp@managertoday.com.tw</p>
              </div>
            </div>
          `;
        } else {
           resultDiv.innerHTML = `
             <div class="mt-4 p-4 text-start text-danger fw-bold bg-white shadow-sm rounded-4 border border-light" style="word-break: break-all;">
               <h5>系統偵錯資訊：</h5>
               <p class="fw-normal mb-0">${result.message}</p>
             </div>
           `;
        }
      } catch (error) {
        resultDiv.innerHTML = `<div class="mt-4 p-4 text-center text-danger fw-bold bg-white shadow-sm rounded-4 border border-light">網路連線異常，請確認網路狀態後再試一次。</div>`;
      } finally {
        searchBtn.disabled = false;
        searchBtn.innerHTML = '確認查詢';
      }
    });
