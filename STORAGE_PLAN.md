# Plurk Analyzer 免費資料保存規劃

目標：15 人以內使用，盡量不產生 Cloudflare 費用，避免重複爬蟲與重複 LLM 分析。

## 結論

第一版不保存每次查詢紀錄，只保存每個帳號最新一次分析結果。

第一版建議使用：

- Cloudflare Pages：放 `index.html`
- Cloudflare Worker：執行 Plurk API / 爬蟲 / 分析
- Workers KV：保存每個帳號最新分析 JSON 快取
- Browser Excel 匯出：使用者按下載時，由前端把目前 JSON 轉成 Excel

暫時不需要 R2。只有在你想長期保存大量 raw data、Excel 檔案或多版本快照時，再加 R2。

## 免費額度風險

以 2026-07-08 Cloudflare 官方文件為準：

- Workers KV Free：每天 100,000 reads、1,000 writes、1GB storage
- R2 Free：每月 10 GB-month storage、1M Class A operations、10M Class B operations、Internet egress free

15 人以內只要做快取，KV 通常很夠。更容易超過的不是空間，而是：

- Plurk API / 爬蟲請求太密集
- LLM 分析成本
- Worker 單次請求等待太久

## 儲存策略

### 1. KV 只存最新整理後 JSON

不要把每一則完整原文都永久塞 KV。KV 適合讀多寫少、快速回傳分析結果。

建議 key：

```text
plurk:v1:analysis:{account}
plurk:v1:lock:{account}
```

範例：

```text
plurk:v1:analysis:demo_user
plurk:v1:lock:demo_user
```

不建立這些資料：

```text
plurk:v1:history:{account}:{timestamp}
plurk:v1:query:{user}:{account}:{timestamp}
plurk:v1:export:{account}:{timestamp}
```

也就是說，不保存誰查了誰、不保存每次查詢時間、不保存每次分析快照。

### 2. TTL 建議

一般帳號：

```text
analysis TTL: 7 days
lock TTL: 10 minutes
```

測試或熱門帳號：

```text
analysis TTL: 1 day
lock TTL: 10 minutes
```

意思是：同一帳號 7 天內重查，直接讀 KV，不重爬、不重跑 AI。

### 3. 重新分析按鈕

前端可以提供兩種模式：

```text
GET /api/analyze?user=demo_user
GET /api/analyze?user=demo_user&refresh=1
```

- 沒有 `refresh=1`：優先讀 KV
- 有 `refresh=1`：忽略舊快取，重新爬資料並覆蓋 KV

為了防止濫用，`refresh=1` 可以限制 10 分鐘內同帳號只能跑一次。

## JSON 保存格式

建議保存一份 `analysis.json`，足夠前端畫圖與匯出 Excel。

```json
{
  "schemaVersion": "1.0",
  "account": "demo_user",
  "source": {
    "platform": "plurk",
    "visibility": "public",
    "fetchedAt": "2026-07-08T12:00:00.000Z",
    "fromCache": false,
    "plurkCount": 120,
    "cacheKey": "plurk:v1:analysis:demo_user",
    "saveMode": "latest-only"
  },
  "profile": {
    "displayName": "Demo Plurker",
    "nickName": "demo_user",
    "createdAt": "2021-03-18",
    "followers": 2380,
    "friends": 512,
    "karma": 92.84,
    "totalPlurks": 4860,
    "location": "Taipei",
    "gender": "未公開",
    "language": "zh-Hant",
    "bioKeywords": ["AI", "動漫", "寫作"]
  },
  "posting": {
    "averagePerDay": 2.47,
    "hourly": [2, 1, 0, 0, 1, 2, 4, 8, 12, 18, 24, 30, 28, 22, 18, 26, 35, 42, 48, 44, 38, 25, 12, 6],
    "weekdays": {
      "一": 72,
      "二": 68,
      "三": 81,
      "四": 77,
      "五": 92,
      "六": 61,
      "日": 54
    },
    "monthly": [180, 168, 192, 210, 225, 214, 240, 238, 251, 230, 205, 196],
    "originalRate": 78,
    "replurkRate": 22,
    "replyRate": 63,
    "averageReplies": 18.7,
    "averageFavorites": 9.4,
    "averageReplurks": 2.1
  },
  "text": {
    "keywords": [["AI", 182], ["動畫", 141], ["生活", 128]],
    "topics": [["AI / 科技", 31], ["動漫 / 遊戲", 24], ["生活日常", 21]],
    "sentiment": {
      "positive": 38,
      "neutral": 46,
      "negative": 16
    },
    "hashtags": ["#AI", "#動畫", "#台灣"]
  },
  "interaction": {
    "topPlurks": [
      {
        "id": "123456",
        "postedAt": "2026-07-01T13:20:00.000Z",
        "contentPreview": "整理了一份給非工程朋友看的 AI 工具比較...",
        "topic": "AI / 科技",
        "replies": 146,
        "favorites": 58,
        "replurks": 19,
        "url": "https://www.plurk.com/p/example"
      }
    ],
    "discussionTopics": [["AI / 科技", 42], ["社會政治", 38]]
  },
  "ai": {
    "enabled": true,
    "model": "gpt-4.1-mini",
    "summary": "公開內容主要集中在 AI 工具、動漫評論與生活觀察。",
    "personalityInference": "人格特徵僅能推測：可能偏好分析與資訊整理。",
    "interests": ["AI 工具與模型應用", "動漫作品評論"],
    "recentFocus": ["生成式 AI 工作流", "新番動畫"],
    "communities": ["科技工具圈", "動漫討論圈"],
    "disclaimer": "AI 分析僅根據公開內容推測，不能視為事實或身份判定。"
  }
}
```

## 是否保存 raw plurks

第一版不建議長期保存完整 raw plurks，理由：

- 原文多，KV 會膨脹
- 使用者可能刪文或改隱私，長期保存有資料倫理風險
- 前端圖表其實只需要統計結果

可以短暫保留：

```text
plurk:v1:raw-temp:{account}
TTL: 24 hours
```

用途是除錯或重新產生 Excel。正式資料仍以 `analysis.json` 為主。

## Excel 下載策略

不要把 Excel 存在 Cloudflare。

建議做法：

1. 前端拿到 `analysis.json`
2. 使用瀏覽器端套件或簡單 CSV 產生檔案
3. 使用者直接下載

這樣不會增加 Cloudflare storage，也不會多一次 R2 write。

Excel 工作表建議：

- `Profile`
- `Posting`
- `Keywords`
- `Topics`
- `Sentiment`
- `Top Plurks`
- `AI Summary`

## 何時才需要 R2

符合任一條件再加 R2：

- 想保存每次分析的歷史快照
- 每個帳號 raw data 超過 KV 單筆可接受大小
- 想提供舊版 Excel 重新下載
- 想把大量 raw JSON 留作離線分析

R2 key 可以設計成：

```text
accounts/{account}/raw/{yyyy-mm-dd}.json
accounts/{account}/analysis/{yyyy-mm-dd}.json
accounts/{account}/exports/{yyyy-mm-dd}.xlsx
```

## Worker 流程

```text
GET /api/analyze?user={account}

1. normalize account
2. if refresh != 1:
   2.1 read KV plurk:v1:analysis:{account}
   2.2 if found and not expired, return cached JSON
3. check lock key
4. set lock key with 10 min TTL
5. fetch public profile
6. fetch public plurks
7. build analysis JSON
8. optionally run LLM
9. write analysis JSON to KV with 1-7 day TTL, overwriting the same account key
10. delete or expire lock
11. return analysis JSON
```

## 我的推薦版本

第一版：

```text
Pages + Worker + KV + browser-side Excel
```

第二版，如果資料真的變多：

```text
Pages + Worker + KV for latest analysis + R2 for raw/history/export
```

這樣從小規模免費開始，不會一開始就把架構做重。
