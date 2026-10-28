# 使用 ChatGPT 訂閱（本機個人專案）

此模式使用官方 Sign in with ChatGPT，與另外計費的 `OPENAI_API_KEY` 模式分開。資格與可用額度由帳戶及官方政策決定，不保證所有帳戶可用，也不是無限免費。本次改動不部署網站；遠端託管／付費應用需另確認官方資格。

## 啟動

在 PR #5 的最新分支安裝相依套件：`npm.cmd ci`。

第一個 PowerShell 視窗，在專案根目錄執行：

```powershell
npm.cmd run narration:chatgpt
```

第二個視窗執行：

```powershell
npm.cmd run dev
```

開啟 Vite 顯示的網址，展開「AI 連線設定」：

1. 按 **Continue with ChatGPT**，再按「開啟 OpenAI 官方登入頁面」。
2. 在官方頁面自行登入、確認方案使用授權。不要將密碼、授權碼或金鑰貼給任何開發工具。
3. 返回遊戲，按「重新整理連線」，確認已登入且訂閱已授權。
4. 按「取得可用模型」，選擇帳戶實際提供的模型。此步只查模型，不生成故事。
5. 在遊戲提交一次已支援的行動，確認「ChatGPT 訂閱生成」及實際結果。登入成功不等於推論通過。

如果前端不在 5173，例如 5174，需在啟動代理前設定 `NARRATION_ALLOWED_ORIGINS=http://localhost:5174,http://127.0.0.1:5174`。僅允許本機開發來源；不要改成萬用來源。代理預設僅監聽 127.0.0.1:8787。原有 `npm.cmd run narration` 仍依 `NARRATION_PROVIDER` 使用 mock 或 openai；新指令會明確覆寫為 chatgpt，不使用既有 API 金鑰。

## 憑證與帳戶

- OpenAI 官方動態登錄、PKCE、state、nonce；ID token 驗證簽章、issuer、audience、到期及身份。
- access／refresh／ID token 僅保留在代理記憶體，不寫入檔案、遊戲存檔、localStorage、前端或日誌。
- Windows 的 `%LOCALAPPDATA%/ShenzhouThreeKingdoms/chatgpt-registrations.json` 只保存主機 ID、已核驗帳戶標識、email 與 issued client ID；不是密鑰檔。
- 關閉代理後需重新登入。使用「重新登入此帳戶」沿用既有登錄；新帳戶使用 Continue with ChatGPT。不同登錄分開管理。
- 登出停止正在進行的推論，嘗試撤銷 refresh token 並清除本機憑證。若無法確認遠端撤銷，畫面會提示到 ChatGPT 設定斷開應用。

## 額度、錯誤與已知限制

模型從授權帳戶的官方目錄取得，不能沿用 API 模式預設模型作保證。推論使用公開 Responses API，`store:false`、`stream:true`，僅在收到完成事件後採用結果。保持既有行動候選與敘事驗證，登入整合不增加自由文字可執行的遊戲命令範圍。

ChatGPT 此路徑目前不接受 `max_output_tokens`；因此 **API 模式的 900-token 上限不適用此模式**。仍有 30 秒逾時、每程序預設 10 次推論外呼上限及回應大小防護；這些不是帳戶用量硬上限，取消也不保證供應者立即停止已開始的工作。模型目錄與 OAuth 呼叫不計入推論次數。請在 ChatGPT 的用量設定檢查／管理授權，不要為了用量限制自動改走付費 API。

未登入、未授權、到期、額度不足、錯誤或中斷串流會明確提示；遊戲可回退範本／本機解析，但不得標為 AI 成功。已結算遊戲狀態不因敘事重試再次執行。

## 驗證紀錄（2026-10-28）

- 自動測試：動態登錄與重新登入、state／nonce／PKCE、真實 RSA 簽章與過期／audience 拒絕、身份隔離、訂閱 scope、模型目錄、更新單一化、登出撤銷、串流完成／失敗／不完整、HTTP 來源限制。
- 本機瀏覽器：設定區展開、狀態讀取與登入連結建立正常。
- 本人已回報登入與選模型成功。但後續畫面顯示「沒有回傳文字」及「範本回退」，因此不能據先前回報將真實敘事列為通過。
- 2026-10-28 修正串流讀取：累積 output_text.delta，依 output/content 索引組合；done 覆蓋該片段而不重複附加；僅在 completed 後使用。失敗、不完整及中斷仍拒絕部分結果。新增 delta-only 完成事件與跨 UTF-8 分塊的回歸案例。
- 之後本人重新登入成功；使用模型的真實行動解析與敘事各以一次短案例通過。此前的「沒有回傳文字」已作廢，不再列為目前錯誤。新增的 `/api/interaction` 情境分類尚待登入新版代理後實測；短案例不等於廣泛語意品質通過。沒有改走付費 API。
- 此次未新增手機尺寸的瀏覽器實測結論，保留既有響應式樣式；登入後帳戶長文字與模型選擇應在本人驗收時補查。

## 官方來源

- https://developers.openai.com/cookbook/articles/sign-in-with-chatgpt
- https://developers.openai.com/siwc/token-sharing-open-source/sign-in
- https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions
- https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference
- https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations
