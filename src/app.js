const demoData = {
  account: {
    displayName: "Demo Plurker",
    nickName: "demo_user",
    createdAt: "2021-03-18",
    followers: 2380,
    friends: 512,
    lastActiveAt: "2026-07-08T12:35:00+08:00",
    karma: 92.84,
    totalPlurks: 4860,
    averagePerDay: 2.47,
    location: "Taipei",
    gender: "未公開",
    language: "zh-Hant",
    bioKeywords: ["AI", "動漫", "寫作", "日常觀察"],
    avatarUrl: ""
  },
  posting: {
    hourly: [2,1,0,0,1,2,4,8,12,18,24,30,28,22,18,26,35,42,48,44,38,25,12,6],
    weekdays: { "一": 72, "二": 68, "三": 81, "四": 77, "五": 92, "六": 61, "日": 54 },
    monthly: [180,168,192,210,225,214,240,238,251,230,205,196],
    originalRate: 78,
    replurkRate: 22,
    replyRate: 63,
    averageReplies: 18.7,
    averageFavorites: 9.4,
    averageReplurks: 2.1
  },
  text: {
    wordCloud: [
      ["AI", 34], ["模型", 28], ["動畫", 25], ["工作", 20], ["台灣", 18], ["咖啡", 14],
      ["創作", 22], ["政治", 16], ["朋友", 13], ["生活", 30], ["資料", 18], ["閱讀", 15]
    ],
    keywords: [["AI", 182], ["動畫", 141], ["生活", 128], ["模型", 113], ["創作", 96], ["政治", 74]],
    topics: [["AI / 科技", 31], ["動漫 / 遊戲", 24], ["生活日常", 21], ["社會政治", 13], ["創作寫作", 11]],
    sentiment: { positive: 38, neutral: 46, negative: 16 },
    hashtags: ["#AI", "#動畫", "#台灣", "#創作", "#日常"]
  },
  interaction: {
    recentPlurks: [
      { content: "晚上把幾個 prompt 模板整理完，發現真正省時間的是命名而不是堆功能。", postedAt: "2026-07-08T11:20:00.000Z", replies: 18, favorites: 7, replurks: 1, topic: "AI / 科技", responseItems: [
        { displayName: "路過的使用者", nickName: "reader_a", postedAt: "2026-07-08T11:28:00.000Z", content: "命名真的會影響後面維護，我懂。" },
        { displayName: "整理控", nickName: "organizer", postedAt: "2026-07-08T11:35:00.000Z", content: "模板如果分情境命名會更好找。" }
      ] },
      { content: "今天的咖啡有點太酸，但很適合拿來配修稿。", postedAt: "2026-07-08T05:42:00.000Z", replies: 9, favorites: 4, replurks: 0, topic: "生活日常", responseItems: [
        { displayName: "咖啡友", nickName: "coffee_friend", postedAt: "2026-07-08T05:55:00.000Z", content: "酸香配文字工作很可以。" }
      ] },
      { content: "新番第三集的分鏡比前兩集更穩，情緒推進很漂亮。", postedAt: "2026-07-07T14:10:00.000Z", replies: 31, favorites: 12, replurks: 2, topic: "動漫 / 遊戲" },
      { content: "公共討論如果不先定義詞，最後很容易只是在吵不同問題。", postedAt: "2026-07-06T13:05:00.000Z", replies: 44, favorites: 19, replurks: 5, topic: "社會政治" },
      { content: "把舊筆記搬到新的資料夾結構，終於比較像能長期維護的東西。", postedAt: "2026-07-05T09:35:00.000Z", replies: 14, favorites: 6, replurks: 0, topic: "創作寫作" }
    ],
    topPlurks: [
      { content: "整理了一份給非工程朋友看的 AI 工具比較，意外引起很多補充。", replies: 146, favorites: 58, replurks: 19, topic: "AI / 科技" },
      { content: "這季動畫的節奏真的比預期穩，角色弧線很漂亮。", replies: 112, favorites: 42, replurks: 8, topic: "動漫 / 遊戲" },
      { content: "關於公共議題的討論，最難的是先把詞定義清楚。", replies: 98, favorites: 35, replurks: 12, topic: "社會政治" }
    ],
    discussionTopics: [["AI / 科技", 42], ["社會政治", 38], ["動漫 / 遊戲", 31], ["創作寫作", 26]]
  },
  ai: {
    summary: "此帳號近期內容偏向 AI 工具、動漫評論與生活觀察。寫作風格多為條理式短評，常用具體例子帶出立場；互動高峰集中在傍晚到晚間，討論型貼文比純日常貼文更容易收到回覆。",
    personality: "人格特徵僅能推測：可能偏好分析、資訊整理與社群討論，也常透過作品與日常經驗建立連結。",
    interests: ["AI 工具與模型應用", "動漫作品評論", "台灣社會議題", "創作與寫作方法", "咖啡與城市生活"],
    recentFocus: ["生成式 AI 工作流", "新番動畫", "平台內容治理"],
    communities: ["科技工具圈", "動漫討論圈", "台灣公共議題圈"]
  }
};

const $ = (id) => document.getElementById(id);
const fmt = (value) => new Intl.NumberFormat("zh-TW").format(value ?? 0);
const pct = (value) => `${Number(value || 0).toFixed(0)}%`;
const API_BASE = "https://plurk-public-analyzer-api.mophygame.workers.dev";
const isProvided = (value) => value !== null && value !== undefined && value !== "";
const fieldValue = (value) => isProvided(value) ? value : "未提供";
const numberField = (value) => isProvided(value) ? fmt(value) : "未提供";

function render(data) {
  renderProfile(data.account);
  renderMetrics(data);
  renderPosting(data.posting);
  renderText(data.text);
  renderInteraction(data.interaction);
  renderPrompt(data);
}

function renderProfile(account) {
  $("displayName").textContent = account.displayName || account.nickName || "公開帳號";
  $("nickName").textContent = `@${account.nickName || "unknown"}`;
  $("avatar").innerHTML = account.avatarUrl
    ? `<img alt="" src="${escapeAttr(account.avatarUrl)}">`
    : (account.displayName || account.nickName || "P").slice(0, 1).toUpperCase();

  const facts = [
    ["建立時間", fieldValue(account.createdAt)],
    ["粉絲 / 好友", `${numberField(account.followers)} / ${numberField(account.friends)}`],
    ["最後上線", isProvided(account.lastActiveAt) ? formatDateTime(account.lastActiveAt) : "未提供"],
    ["Karma", fieldValue(account.karma)],
    ["所在地", fieldValue(account.location)],
    ["性別", fieldValue(account.gender)],
    ["語言", fieldValue(account.language)],
    ["簡介關鍵字", (account.bioKeywords || []).join("、") || "未提供"]
  ];
  $("profileFacts").innerHTML = facts.map(([label, value]) => `
    <div class="side-item"><span>${label}</span><strong>${escapeHtml(String(value))}</strong></div>
  `).join("");
}

function renderMetrics(data) {
  const a = data.account;
  const p = data.posting;
  const metrics = [
    ["發文總數", fmt(a.totalPlurks)],
    ["平均每天發文", `${a.averagePerDay ?? 0} 則`],
    ["平均回覆數", `${p.averageReplies ?? 0} 則`],
    ["回覆比例", pct(p.replyRate)]
  ];
  $("metrics").innerHTML = metrics.map(([label, value]) => `
    <article class="metric"><span>${label}</span><strong>${value}</strong></article>
  `).join("");
}

function renderPosting(posting) {
  const maxHour = Math.max(...posting.hourly, 1);
  $("hourHeatmap").innerHTML = posting.hourly.map((count, hour) => `
    <div class="bar-cell" title="${hour}:00 - ${count} 則">
      <div class="bar" style="height:${Math.max(4, count / maxHour * 138)}px"></div>
      <small>${hour}</small>
    </div>
  `).join("");

  const weekdayMax = Math.max(...Object.values(posting.weekdays), 1);
  $("weekdayChart").innerHTML = Object.entries(posting.weekdays).map(([day, count]) => `
    <div class="rowbar">
      <b>${day}</b>
      <div class="track"><div class="fill" style="width:${count / weekdayMax * 100}%"></div></div>
      <span>${count}</span>
    </div>
  `).join("");

  const monthMax = Math.max(...posting.monthly, 1);
  $("frequencyChart").innerHTML = posting.monthly.map((count, index) => `
    <div class="bar-cell" title="第 ${index + 1} 月：${count} 則">
      <div class="bar" style="height:${Math.max(6, count / monthMax * 112)}px"></div>
      <small>${index + 1}</small>
    </div>
  `).join("");

  $("ratioChart").style.setProperty("--original", posting.originalRate || 1);
  $("ratioChart").style.setProperty("--replurk", posting.replurkRate || 1);
  $("ratioChart").innerHTML = `
    <div>原創 ${pct(posting.originalRate)}</div>
    <div>轉噗 ${pct(posting.replurkRate)}</div>
  `;
  $("replyStats").innerHTML = [
    ["平均收藏", posting.averageFavorites ?? "無資料"],
    ["平均轉噗", posting.averageReplurks ?? "無資料"],
    ["回覆比例", pct(posting.replyRate)]
  ].map(([label, value]) => `<div class="sent"><strong>${value}</strong><span>${label}</span></div>`).join("");
}

function renderText(text) {
  const cloudMax = Math.max(...text.wordCloud.map(([, value]) => value), 1);
  $("wordCloud").innerHTML = text.wordCloud.map(([word, value]) => `
    <span style="font-size:${13 + value / cloudMax * 22}px">${escapeHtml(word)}</span>
  `).join("");
  renderRankBars("keywordRank", text.keywords, varColor("--accent"));
  renderRankBars("topicRank", text.topics, varColor("--accent-2"));
  $("sentimentChart").innerHTML = [
    ["正向", text.sentiment.positive, "var(--good)"],
    ["中性", text.sentiment.neutral, "var(--neutral)"],
    ["負向", text.sentiment.negative, "var(--bad)"]
  ].map(([label, value, color]) => `
    <div class="sent" style="border-top: 4px solid ${color}">
      <strong>${pct(value)}</strong><span>${label}</span>
    </div>
  `).join("");
  $("hashtags").innerHTML = (text.hashtags || []).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
}

function renderInteraction(interaction) {
  $("recentPlurks").innerHTML = (interaction.recentPlurks || []).map(item => renderPlurkCard(item, true)).join("");
  $("topPlurks").innerHTML = (interaction.topPlurks || []).map(item => renderPlurkCard(item, false)).join("");
  renderRankBars("discussionTopics", interaction.discussionTopics, varColor("--accent-3"));
}

function renderPlurkCard(item, showPostedAt) {
  const responses = item.responseItems || [];
  const meta = [
    showPostedAt ? formatDateTime(item.postedAt) : "",
    item.topic || "未分類",
    `回覆 ${fmt(item.replies)}`,
    `收藏 ${fmt(item.favorites ?? 0)}`,
    `轉噗 ${fmt(item.replurks ?? 0)}`
  ].filter(Boolean);

  return `
    <details class="plurk">
      <summary>
        <span class="plurk-content">${escapeHtml(item.content || "內容未提供")}</span>
        <span class="plurk-meta">${meta.map(value => `<span>${escapeHtml(String(value))}</span>`).join("")}</span>
      </summary>
      <div class="responses">
        ${responses.length ? responses.map(renderResponse).join("") : `<p class="muted">沒有抓到公開回應內容，或 Plurk API 未提供。</p>`}
      </div>
    </details>
  `;
}

function renderResponse(item) {
  const name = item.nickName ? `${item.displayName || item.nickName} @${item.nickName}` : (item.displayName || "公開使用者");
  return `
    <article class="response">
      <div class="response-head">
        <strong>${escapeHtml(name)}</strong>
        <span>${formatDateTime(item.postedAt)}</span>
      </div>
      <p>${escapeHtml(item.content || "內容未提供")}</p>
    </article>
  `;
}

function renderPrompt(data) {
  $("analysisPrompt").value = buildAnalysisPrompt(data);
}

function renderRankBars(id, rows, color) {
  const max = Math.max(...rows.map(([, value]) => value), 1);
  $(id).innerHTML = rows.map(([label, value]) => `
    <div class="keyword">
      <b>${escapeHtml(label)}</b>
      <div class="track"><div class="fill" style="width:${value / max * 100}%; background:${color}"></div></div>
      <span>${fmt(value)}</span>
    </div>
  `).join("");
}

function varColor(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function normalizePayload(payload, account) {
  const merged = emptyAnalysis(account);
  return deepMerge(merged, payload || { account: { nickName: account } });
}

function emptyAnalysis(account = "") {
  return {
    account: {
      displayName: account,
      nickName: account,
      createdAt: null,
      followers: null,
      friends: null,
      lastActiveAt: null,
      karma: null,
      totalPlurks: 0,
      averagePerDay: null,
      location: "",
      gender: null,
      language: "",
      bioKeywords: [],
      avatarUrl: ""
    },
    posting: {
      hourly: Array.from({ length: 24 }, () => 0),
      weekdays: { "一": 0, "二": 0, "三": 0, "四": 0, "五": 0, "六": 0, "日": 0 },
      monthly: Array.from({ length: 12 }, () => 0),
      originalRate: 0,
      replurkRate: 0,
      replyRate: 0,
      averageReplies: 0,
      averageFavorites: 0,
      averageReplurks: 0
    },
    text: {
      wordCloud: [],
      keywords: [],
      topics: [],
      sentiment: { positive: 0, neutral: 0, negative: 0 },
      hashtags: []
    },
    interaction: {
      recentPlurks: [],
      topPlurks: [],
      discussionTopics: []
    },
    ai: {
      summary: "",
      personality: "",
      interests: [],
      recentFocus: [],
      communities: []
    }
  };
}

function renderNotFound(account, message) {
  $("displayName").textContent = "找不到用戶";
  $("nickName").textContent = account ? `@${account.replace(/^@/, "")}` : "@unknown";
  $("avatar").textContent = "?";
  renderProfile({
    displayName: "找不到用戶",
    nickName: account.replace(/^@/, ""),
    createdAt: null,
    followers: null,
    friends: null,
    lastActiveAt: null,
    karma: null,
    location: null,
    gender: null,
    language: null,
    bioKeywords: [],
    avatarUrl: ""
  });
  renderEmptyDashboard("找不到用戶", message || "Plurk 沒有回傳此公開帳號。");
}

function renderEmptyDashboard(title, message) {
  $("metrics").innerHTML = [
    ["發文總數", "0"],
    ["平均每天發文", "0 則"],
    ["平均回覆數", "0 則"],
    ["回覆比例", "0%"]
  ].map(([label, value]) => `
    <article class="metric"><span>${label}</span><strong>${value}</strong></article>
  `).join("");
  $("hourHeatmap").innerHTML = emptyMessage(`${title}，沒有可分析的發文時間。`);
  $("weekdayChart").innerHTML = emptyMessage(`${title}，沒有星期活躍資料。`);
  $("frequencyChart").innerHTML = emptyMessage(`${title}，沒有發文頻率資料。`);
  $("ratioChart").style.setProperty("--original", 1);
  $("ratioChart").style.setProperty("--replurk", 1);
  $("ratioChart").innerHTML = "<div>原創 0%</div><div>轉噗 0%</div>";
  $("replyStats").innerHTML = [
    ["0", "平均收藏"],
    ["0", "平均轉噗"],
    ["0%", "回覆比例"]
  ].map(([value, label]) => `<div class="sent"><strong>${value}</strong><span>${label}</span></div>`).join("");
  $("wordCloud").innerHTML = emptyMessage(`${title}，沒有文字資料。`);
  $("keywordRank").innerHTML = emptyMessage(`${title}，沒有關鍵字資料。`);
  $("topicRank").innerHTML = emptyMessage(`${title}，沒有主題資料。`);
  $("sentimentChart").innerHTML = [
    ["正向", 0, "var(--good)"],
    ["中性", 0, "var(--neutral)"],
    ["負向", 0, "var(--bad)"]
  ].map(([label, value, color]) => `
    <div class="sent" style="border-top: 4px solid ${color}">
      <strong>${pct(value)}</strong><span>${label}</span>
    </div>
  `).join("");
  $("hashtags").innerHTML = emptyMessage(`${title}，沒有 Hashtag 資料。`);
  $("recentPlurks").innerHTML = emptyMessage(`${title}，沒有最近文章。`);
  $("topPlurks").innerHTML = emptyMessage(`${title}，沒有互動文章。`);
  $("discussionTopics").innerHTML = emptyMessage(`${title}，沒有討論主題。`);
  $("analysisPrompt").value = message;
}

function emptyMessage(message) {
  return `<p class="muted empty-state">${escapeHtml(message)}</p>`;
}

function deepMerge(target, source) {
  for (const [key, value] of Object.entries(source || {})) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      target[key] = deepMerge(target[key] || {}, value);
    } else {
      target[key] = value;
    }
  }
  return target;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

function formatDateTime(value) {
  if (!value) return "時間未提供";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function buildAnalysisPrompt(data) {
  const payload = {
    profile: data.account,
    posting: data.posting,
    text: data.text,
    interaction: data.interaction,
    source: data.source || {
      platform: "plurk",
      visibility: "public",
      fromCache: false
    }
  };

  return `你是一位繁體中文社群內容分析師。請根據以下 Plurk 公開資料統計，產出一份清楚、克制、可讀的分析報告。

重要限制：
- 只能根據提供的公開資料與統計結果推測。
- 不要把人格、政治立場、健康、宗教、性傾向、財務狀況等敏感資訊講成事實。
- 若提到人格特徵、社群圈、關注話題，必須明確標示「推測」。
- 不要臆測真實姓名、私人身份、未公開所在地或其他個資。
- 請用繁體中文回答。

請輸出以下段落：
1. 帳號概覽
2. 興趣排行榜
3. 最近關注話題
4. 寫作風格
5. 互動表現與容易引起討論的主題
6. 人格特徵摘要，必須標示為推測
7. 常討論的社群圈，必須標示為推測
8. 可驗證的限制與分析風險

資料如下：

\`\`\`json
${JSON.stringify(payload, null, 2)}
\`\`\``;
}

function analyzeUrl(account) {
  const base = API_BASE.replace(/\/$/, "");
  return `${base}/api/analyze?user=${encodeURIComponent(account)}`;
}

async function copyPrompt() {
  const prompt = $("analysisPrompt").value;
  try {
    await navigator.clipboard.writeText(prompt);
    $("copyStatus").textContent = "已複製，可以貼到 GPT。";
  } catch {
    $("analysisPrompt").select();
    document.execCommand("copy");
    $("copyStatus").textContent = "已選取並嘗試複製。";
  }
}

$("searchForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const account = $("accountInput").value.trim();
  if (!account) return;
  $("dashboard").classList.add("loading");
  $("status").classList.remove("error");
  $("status").textContent = `正在分析 @${account} 的公開資料...`;
  try {
    const response = await fetch(analyzeUrl(account));
    if (!response.ok) {
      const apiError = await describeApiError(response);
      if (response.status === 404) {
        renderNotFound(account, apiError.message);
        $("status").classList.add("error");
        $("status").textContent = `找不到用戶 @${account}。`;
        return;
      }
      throw new Error(apiError.message);
    }
    const payload = await response.json();
    render(normalizePayload(payload, account));
    $("status").textContent = payload.source?.fromCache
      ? `已從快取載入 @${account} 的最新分析，沒有重新爬取。`
      : `已完成 @${account} 的公開資料分析，並覆蓋保存最新結果。`;
  } catch (error) {
    render(normalizePayload({ account: { nickName: account, displayName: account } }, account));
    renderEmptyDashboard("API 無法回應", error.message);
    $("status").classList.add("error");
    $("status").textContent = `API 無法回應：${error.message}`;
  } finally {
    $("dashboard").classList.remove("loading");
  }
});

async function describeApiError(response) {
  const fallback = { status: response.status, message: `API 回應 ${response.status}` };
  try {
    const payload = await response.json();
    const detail = response.status === 404
      ? payload.message
      : [payload.message, payload.hint].filter(Boolean).join("；");
    return {
      status: response.status,
      message: detail ? `API 回應 ${response.status}：${detail}` : fallback.message
    };
  } catch {
    return fallback;
  }
}

$("demoButton").addEventListener("click", () => {
  $("status").classList.remove("error");
  $("status").textContent = "已載入示範資料，可先檢查分析版面。";
  $("accountInput").value = "demo_user";
  render(structuredClone(demoData));
});

$("copyPromptButton").addEventListener("click", copyPrompt);

render(structuredClone(demoData));
