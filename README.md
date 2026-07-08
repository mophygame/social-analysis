# Plurk Public Analyzer

這是一個可部署到 GitHub + Cloudflare 免費方案的公開噗浪分析平台原型。

## 內容

- `index.html`：純靜態前端，包含帳號輸入、Profile、發文分析、文字分析、互動分析與 GPT 分析 Prompt 複製區。
- `src/app.js`：前端原始 JS，開發時修改這份。
- `assets/app.min.js`：前端部署用 JS，由 build 指令產生，`index.html` 連這份。
- `worker.js`：Cloudflare Worker 原始碼，開發時修改這份。
- `worker.min.js`：Cloudflare Worker 部署用 JS，由 build 指令產生。
- `wrangler.toml`：Worker 部署設定。
- `STORAGE_PLAN.md`：不保存每次查詢、只保存每個帳號最新分析的 KV 規劃。

## 修改與部署 JS

開發時只改原始檔：

```text
src/app.js
worker.js
```

部署前執行：

```bash
npm run build
```

這會重新產生：

```text
assets/app.min.js
worker.min.js
```

`index.html` 已經連到 `assets/app.min.js`，`wrangler.toml` 已經設定部署 `worker.min.js`。

注意：`.min.js` 是壓縮與輕度混淆，不是真正加密。前端程式仍可能被還原閱讀，所以 Plurk API key 等敏感資料仍然只能放在 Cloudflare Worker secrets。

## API 位置

目前 Pages 前端會呼叫 Cloudflare Worker：

```text
https://plurk-public-analyzer-api.mophygame.workers.dev/api/analyze
```

若未來改用自訂網域，可把 `src/app.js` 的 `API_BASE` 改成同網域或新的 Worker URL，然後重新執行 `npm run build`。

## 部署建議

1. 把此資料夾上傳到 GitHub repository。
2. 在 Cloudflare Pages 建立專案，Build command 設為 `npm run build`，Output directory 指向專案根目錄或放置 `index.html` 的資料夾。
3. 另建 Cloudflare Worker，使用 `worker.js` 與 `wrangler.toml`。
4. 在 Worker secrets 設定 Plurk API OAuth 金鑰：

```bash
wrangler secret put PLURK_APP_KEY
wrangler secret put PLURK_APP_SECRET
wrangler secret put PLURK_ACCESS_TOKEN
wrangler secret put PLURK_ACCESS_SECRET
```

5. 建立 KV namespace，用來保存每個帳號最新一份分析 JSON，不保存每次查詢紀錄：

```bash
wrangler kv namespace create PLURK_ANALYSIS_KV
```

然後把產生的 namespace id 貼到 `wrangler.toml` 的 `[[kv_namespaces]]` 區塊。

6. 在 Cloudflare Pages 的 Functions/Routes 或 Worker Routes 中，把 `/api/*` 指到 Worker。

本專案不需要 OpenAI API key。AI 分析改為由前端產生 Prompt，使用者可複製到 ChatGPT、GPTs 或其他 LLM。

## 資料保存方式

本專案預設不保存每次查詢紀錄，只保存每個帳號最新一次分析結果：

```text
plurk:v1:analysis:{account}
plurk:v1:lock:{account}
```

- `analysis`：最新分析 JSON，預設 TTL 7 天。
- `lock`：防止同帳號重複分析，預設 TTL 10 分鐘。
- 同一帳號重新分析時會覆蓋同一筆 KV，不會建立歷史快照。
- Excel 建議由前端根據當下 JSON 即時產生下載，不存到 Cloudflare。

## 注意事項

- 只分析公開內容，GPT Prompt 會要求模型把人格、社群圈與關注話題明確標示為推測。
- 不要把 Plurk API key 放進 `index.html`。
- Worker 中的 Plurk endpoint 依公開 API 命名實作；實際上線前請用你的 Plurk App 權限測試 Profile 與 Timeline endpoint 回傳格式。
- 若 Plurk API 對公開 timeline 有權限或速率限制，需要調整抓取數量、TTL 或改成排程更新。
