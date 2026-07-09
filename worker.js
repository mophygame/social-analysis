const PLURK_API_BASE = "https://www.plurk.com/APP";
const CACHE_VERSION = "v2";
const DEFAULT_ANALYSIS_TTL_SECONDS = 7 * 24 * 60 * 60;
const DEFAULT_LOCK_TTL_SECONDS = 10 * 60;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    if (url.pathname !== "/api/analyze") {
      return json({ error: "Not found" }, 404);
    }

    const user = (url.searchParams.get("user") || "").trim().replace(/^@/, "");
    if (!user) {
      return json({ error: "Missing user query parameter" }, 400);
    }

    const account = normalizeAccount(user);
    if (!account) {
      return json({ error: "Invalid user query parameter" }, 400);
    }
    const refresh = url.searchParams.get("refresh") === "1";
    const cache = cacheKeys(account);

    try {
      if (env.PLURK_ANALYSIS_KV && !refresh) {
        const cached = await env.PLURK_ANALYSIS_KV.get(cache.analysis, { type: "json" });
        if (cached) {
          cached.source = {
            ...(cached.source || {}),
            fromCache: true,
            cacheKey: cache.analysis
          };
          return json(cached);
        }
      }

      if (env.PLURK_ANALYSIS_KV) {
        const locked = await env.PLURK_ANALYSIS_KV.get(cache.lock);
        if (locked) {
          return json({
            error: "Analysis already running",
            message: "同一個帳號正在分析中，請稍後再試。",
            cacheKey: cache.analysis
          }, 409);
        }
        await env.PLURK_ANALYSIS_KV.put(cache.lock, new Date().toISOString(), {
          expirationTtl: lockTtl(env)
        });
      }

      const profile = await getPublicProfile(user, env);
      const plurks = await attachPlurkResponses(await getPublicPlurks(profile.userId, env), env);
      const analysis = buildAnalysis(profile, plurks);
      analysis.schemaVersion = "1.0";
      analysis.source = {
        platform: "plurk",
        visibility: "public",
        fetchedAt: new Date().toISOString(),
        fromCache: false,
        plurkCount: plurks.length,
        cacheKey: cache.analysis,
        saveMode: "latest-only"
      };

      if (env.PLURK_ANALYSIS_KV) {
        await env.PLURK_ANALYSIS_KV.put(cache.analysis, JSON.stringify(analysis), {
          expirationTtl: analysisTtl(env)
        });
        await env.PLURK_ANALYSIS_KV.delete(cache.lock);
      }

      return json(analysis);
    } catch (error) {
      if (env.PLURK_ANALYSIS_KV) {
        await env.PLURK_ANALYSIS_KV.delete(cache.lock);
      }
      return json({
        error: "Analyze failed",
        message: error.message,
        hint: "Confirm Plurk API credentials and endpoint availability in Worker environment variables."
      }, error.status || 502);
    }
  }
};

function normalizeAccount(user) {
  return user.toLowerCase().replace(/[^a-z0-9_.-]/g, "").slice(0, 80);
}

function cacheKeys(account) {
  return {
    analysis: `plurk:${CACHE_VERSION}:analysis:${account}`,
    lock: `plurk:${CACHE_VERSION}:lock:${account}`
  };
}

function analysisTtl(env) {
  return Number(env.ANALYSIS_TTL_SECONDS || DEFAULT_ANALYSIS_TTL_SECONDS);
}

function lockTtl(env) {
  return Number(env.ANALYSIS_LOCK_TTL_SECONDS || DEFAULT_LOCK_TTL_SECONDS);
}

async function getPublicProfile(user, env) {
  const resolved = await resolvePublicUser(user);
  const params = { user_id: resolved.userId };
  const data = await plurkApi("/Profile/getPublicProfile", params, env);
  const publicUser = data.user_info || data;

  return {
    userId: publicUser.id || publicUser.uid || resolved.userId,
    displayName: publicUser.display_name || publicUser.full_name || publicUser.nick_name || resolved.nickName,
    nickName: publicUser.nick_name || resolved.nickName,
    createdAt: publicUser.date_created || publicUser.created || null,
    followers: firstNumber(publicUser.num_of_fans, publicUser.fans_count, publicUser.followers_count, resolved.followers),
    friends: firstNumber(publicUser.num_of_friends, publicUser.friends_count, resolved.friends),
    lastActiveAt: publicUser.last_visit || publicUser.last_login || publicUser.last_active || resolved.lastActiveAt || null,
    karma: publicUser.karma ?? null,
    totalPlurks: publicUser.plurks_count || publicUser.plurks || 0,
    location: publicUser.location || "",
    gender: normalizeGender(publicUser.gender),
    language: publicUser.default_lang || publicUser.language || "",
    bioKeywords: keywordsFromText(publicUser.about || publicUser.description || "").slice(0, 6),
    avatarUrl: publicUser.avatar_big || publicUser.avatar_medium || publicUser.avatar || ""
  };
}

async function resolvePublicUser(user) {
  if (/^\d+$/.test(user)) {
    return { userId: user, nickName: user };
  }

  const nickName = normalizeAccount(user);
  const response = await fetch(`https://www.plurk.com/${encodeURIComponent(nickName)}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 PlurkPublicAnalyzer/1.0"
    }
  });
  const html = await response.text();
  const globalMatch = html.match(/var GLOBAL=(\{[^\n\r<]*)/);
  const globalSource = globalMatch ? globalMatch[1] : "";
  const idMatch = globalSource.match(/"page_user"\s*:\s*\{[^}]*"id"\s*:\s*(\d+)/);
  const nickMatch = globalSource.match(/"page_user"\s*:\s*\{[^}]*"nick_name"\s*:\s*"([^"]+)"/);
  const fansMatch = globalSource.match(/"num_of_fans"\s*:\s*(\d+)/);
  const friendsMatch = globalSource.match(/"num_of_friends"\s*:\s*(\d+)/);
  const lastVisitMatch = html.match(/last_visit\s*=\s*new Date\('([^']+)'/);

  if (idMatch) {
    return {
      userId: idMatch[1],
      nickName: nickMatch ? decodeJsonString(nickMatch[1]) : nickName,
      followers: fansMatch ? Number(fansMatch[1]) : null,
      friends: friendsMatch ? Number(friendsMatch[1]) : null,
      lastActiveAt: lastVisitMatch ? normalizePlurkDate(lastVisitMatch[1]) : null
    };
  }

  const notFound = /User Not Found!|is not found!|"page_user"\s*:\s*null/i.test(html) || response.status === 404;
  const error = new Error(notFound
    ? `找不到公開 Plurk 帳號 @${nickName}，請確認輸入的是 Plurk 暱稱而不是顯示名稱。`
    : `無法從公開 Plurk 頁解析 @${nickName} 的 user_id。`);
  error.status = notFound ? 404 : 502;
  throw error;
}

function decodeJsonString(value) {
  try {
    return JSON.parse(`"${String(value).replace(/"/g, '\\"')}"`);
  } catch {
    return value;
  }
}

async function getPublicPlurks(userId, env) {
  const limit = Number(env.PLURK_FETCH_LIMIT || 120);
  const pageSize = Math.min(30, Math.max(1, limit));
  const all = [];
  let offset = null;

  while (all.length < limit) {
    const params = { user_id: userId, limit: pageSize };
    if (offset) params.offset = offset;
    const data = await plurkApi("/Timeline/getPublicPlurks", params, env);
    const plurks = data.plurks || data || [];
    if (!Array.isArray(plurks) || plurks.length === 0) break;
    all.push(...plurks);
    offset = plurks[plurks.length - 1].posted || plurks[plurks.length - 1].date;
    if (!offset || plurks.length < pageSize) break;
  }

  return all.slice(0, limit).map(normalizePlurk);
}

async function attachPlurkResponses(plurks, env) {
  const selected = new Map();
  for (const plurk of [...plurks].sort((a, b) => new Date(b.posted).getTime() - new Date(a.posted).getTime()).slice(0, 5)) {
    if (plurk.id) selected.set(plurk.id, plurk);
  }
  for (const plurk of [...plurks].sort((a, b) => b.replies - a.replies).slice(0, 5)) {
    if (plurk.id) selected.set(plurk.id, plurk);
  }

  await Promise.all([...selected.values()].map(async (plurk) => {
    plurk.responseItems = await getPlurkResponses(plurk.id, env);
  }));
  return plurks;
}

async function getPlurkResponses(plurkId, env) {
  try {
    const data = await plurkApi("/Responses/get", { plurk_id: plurkId }, env);
    const users = data.friends || data.users || {};
    const responses = data.responses || [];
    if (!Array.isArray(responses)) return [];
    return responses.slice(0, 30).map(response => normalizeResponse(response, users));
  } catch {
    return [];
  }
}

async function plurkApi(path, params, env) {
  if (!env.PLURK_APP_KEY || !env.PLURK_APP_SECRET) {
    throw new Error("Missing PLURK_APP_KEY or PLURK_APP_SECRET");
  }

  const auth = await oauthHeader("GET", `${PLURK_API_BASE}${path}`, params, env);
  const url = new URL(`${PLURK_API_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, { headers: { Authorization: auth } });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Plurk API ${path} responded ${response.status}${body ? `: ${stripHtml(body).slice(0, 220)}` : ""}`);
  }
  return response.json();
}

async function oauthHeader(method, baseUrl, queryParams, env) {
  const oauth = {
    oauth_consumer_key: env.PLURK_APP_KEY,
    oauth_nonce: crypto.randomUUID().replace(/-/g, ""),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: env.PLURK_ACCESS_TOKEN || "",
    oauth_version: "1.0"
  };

  const signatureParams = { ...queryParams, ...oauth };
  if (!oauth.oauth_token) delete signatureParams.oauth_token;

  const baseString = [
    method.toUpperCase(),
    encodeRFC3986(baseUrl),
    encodeRFC3986(Object.keys(signatureParams)
      .sort()
      .map(key => `${encodeRFC3986(key)}=${encodeRFC3986(signatureParams[key])}`)
      .join("&"))
  ].join("&");

  const signingKey = `${encodeRFC3986(env.PLURK_APP_SECRET)}&${encodeRFC3986(env.PLURK_ACCESS_SECRET || "")}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(signingKey),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(baseString));
  oauth.oauth_signature = btoa(String.fromCharCode(...new Uint8Array(signature)));
  if (!oauth.oauth_token) delete oauth.oauth_token;

  return "OAuth " + Object.keys(oauth)
    .sort()
    .map(key => `${encodeRFC3986(key)}="${encodeRFC3986(oauth[key])}"`)
    .join(", ");
}

function buildAnalysis(account, plurks) {
  const now = Date.now();
  const daysSinceCreated = account.createdAt
    ? Math.max(1, Math.ceil((now - new Date(account.createdAt).getTime()) / 86400000))
    : null;
  const totalPlurks = account.totalPlurks || plurks.length;
  const words = keywordsFromText(plurks.map(p => p.content).join(" "));
  const keywordRows = countTop(words, 20).slice(0, 8);
  const topics = classifyTopics(plurks);
  const sentiment = estimateSentiment(plurks);
  const hourly = Array.from({ length: 24 }, () => 0);
  const weekdays = { "一": 0, "二": 0, "三": 0, "四": 0, "五": 0, "六": 0, "日": 0 };
  const monthly = Array.from({ length: 12 }, () => 0);

  for (const plurk of plurks) {
    const date = new Date(plurk.posted);
    if (Number.isNaN(date.getTime())) continue;
    hourly[date.getHours()]++;
    weekdays["日一二三四五六"[date.getDay()]]++;
    monthly[date.getMonth()]++;
  }

  const replurks = plurks.filter(p => p.isReplurk).length;
  const original = Math.max(0, plurks.length - replurks);
  const topPlurks = [...plurks]
    .sort((a, b) => b.replies - a.replies)
    .slice(0, 5)
    .map(p => ({
      id: p.id,
      postedAt: p.posted,
      content: stripHtml(p.content).slice(0, 140),
      replies: p.replies,
      favorites: p.favorites,
      replurks: p.replurks,
      topic: bestTopicForText(p.content),
      responseItems: p.responseItems || []
    }));
  const recentPlurks = [...plurks]
    .sort((a, b) => new Date(b.posted).getTime() - new Date(a.posted).getTime())
    .slice(0, 5)
    .map(p => ({
      id: p.id,
      postedAt: p.posted,
      content: stripHtml(p.content).slice(0, 280),
      replies: p.replies,
      favorites: p.favorites,
      replurks: p.replurks,
      topic: bestTopicForText(p.content),
      responseItems: p.responseItems || []
    }));

  return {
    account: {
      ...account,
      totalPlurks,
      averagePerDay: daysSinceCreated ? Number((totalPlurks / daysSinceCreated).toFixed(2)) : null
    },
    posting: {
      hourly,
      weekdays,
      monthly,
      originalRate: percent(original, plurks.length),
      replurkRate: percent(replurks, plurks.length),
      replyRate: percent(plurks.filter(p => p.replies > 0).length, plurks.length),
      averageReplies: average(plurks.map(p => p.replies)),
      averageFavorites: average(plurks.map(p => p.favorites)),
      averageReplurks: average(plurks.map(p => p.replurks))
    },
    text: {
      wordCloud: keywordRows,
      keywords: keywordRows.slice(0, 6),
      topics,
      sentiment,
      hashtags: countTop(plurks.flatMap(p => p.hashtags), 10).map(([tag]) => tag)
    },
    interaction: {
      recentPlurks,
      topPlurks,
      discussionTopics: discussionTopics(plurks)
    },
    ai: heuristicAi(topics, keywordRows, plurks)
  };
}

function normalizePlurk(raw) {
  const content = stripHtml(raw.content_raw || raw.content || "");
  return {
    id: raw.plurk_id || raw.id,
    content,
    posted: raw.posted || raw.date || raw.created_at,
    replies: raw.response_count || raw.responses_seen || 0,
    favorites: raw.favorite_count || raw.favorites_count || raw.favorite_count_public || 0,
    replurks: raw.replurkers_count || raw.replurk_count || 0,
    isReplurk: Boolean(raw.replurked || raw.replurker_id || raw.replurk_id),
    hashtags: [...content.matchAll(/#[\p{L}\p{N}_-]+/gu)].map(match => match[0]),
    responseItems: []
  };
}

function normalizeResponse(raw, users) {
  const user = users?.[raw.user_id] || users?.[String(raw.user_id)] || {};
  return {
    id: raw.id,
    userId: raw.user_id || null,
    displayName: user.display_name || user.full_name || user.nick_name || (raw.user_id ? `user ${raw.user_id}` : "公開使用者"),
    nickName: user.nick_name || "",
    postedAt: raw.posted || raw.date || null,
    content: stripHtml(raw.content_raw || raw.content || "").slice(0, 260),
    qualifier: raw.qualifier || ""
  };
}

function keywordsFromText(text) {
  const stop = new Set(["的", "了", "是", "我", "你", "他", "她", "它", "在", "有", "和", "就", "都", "也", "很", "但", "而", "或", "及", "the", "and", "for", "with", "this", "that"]);
  return stripHtml(text)
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .match(/[\p{Script=Han}]{2,}|[a-z0-9][a-z0-9_-]{2,}/gu)?.filter(word => !stop.has(word)) || [];
}

function classifyTopics(plurks) {
  const topicDefs = {
    "AI / 科技": ["ai", "模型", "llm", "資料", "api", "程式", "cloudflare", "github", "工具"],
    "動漫 / 遊戲": ["動漫", "動畫", "漫畫", "遊戲", "角色", "新番", "劇情"],
    "社會政治": ["政治", "選舉", "政府", "政策", "社會", "台灣", "公共"],
    "生活日常": ["今天", "生活", "朋友", "咖啡", "吃", "睡", "工作", "日常"],
    "創作寫作": ["創作", "寫作", "文章", "小說", "靈感", "故事", "文字"]
  };
  const scores = Object.fromEntries(Object.keys(topicDefs).map(topic => [topic, 0]));
  for (const plurk of plurks) {
    const text = plurk.content.toLowerCase();
    for (const [topic, terms] of Object.entries(topicDefs)) {
      if (terms.some(term => text.includes(term))) scores[topic]++;
    }
  }
  return Object.entries(scores).sort((a, b) => b[1] - a[1]).filter(([, value]) => value > 0).slice(0, 6);
}

function bestTopicForText(text) {
  return classifyTopics([{ content: text }])[0]?.[0] || "未分類";
}

function discussionTopics(plurks) {
  const totals = {};
  for (const plurk of plurks) {
    const topic = bestTopicForText(plurk.content);
    totals[topic] = (totals[topic] || 0) + plurk.replies;
  }
  return Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 5);
}

function estimateSentiment(plurks) {
  const positive = ["喜歡", "好", "棒", "開心", "推薦", "漂亮", "順利", "love", "great"];
  const negative = ["糟", "爛", "難過", "生氣", "討厭", "失望", "焦慮", "bad", "hate"];
  let pos = 0;
  let neg = 0;
  for (const plurk of plurks) {
    const text = plurk.content.toLowerCase();
    if (positive.some(word => text.includes(word))) pos++;
    if (negative.some(word => text.includes(word))) neg++;
  }
  const neu = Math.max(0, plurks.length - pos - neg);
  return {
    positive: percent(pos, plurks.length),
    neutral: percent(neu, plurks.length),
    negative: percent(neg, plurks.length)
  };
}

function heuristicAi(topics, keywords, plurks) {
  const interests = topics.map(([topic]) => topic).concat(keywords.map(([word]) => word)).slice(0, 5);
  return {
    summary: `公開內容主要集中在 ${interests.slice(0, 3).join("、") || "少量可辨識主題"}。高互動內容多半是能引發補充、立場交換或經驗分享的貼文。`,
    personality: "人格特徵僅能推測：可能偏好用短句整理觀點，並透過日常事件連結較大的議題。",
    interests,
    recentFocus: topics.slice(0, 3).map(([topic]) => topic),
    communities: topics.slice(0, 3).map(([topic]) => `${topic} 討論圈`)
  };
}

function countTop(items, limit) {
  const counts = {};
  for (const item of items) counts[item] = (counts[item] || 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function stripHtml(value) {
  return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function normalizePlurkDate(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}\s/.test(value)) {
    return `${value.replace(" ", "T")}+08:00`;
  }
  return value;
}

function firstNumber(...values) {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== "" && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }
  return 0;
}

function normalizeGender(value) {
  if (value === 0 || value === "male") return "男";
  if (value === 1 || value === "female") return "女";
  return value || "未公開";
}

function average(values) {
  if (!values.length) return 0;
  return Number((values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length).toFixed(1));
}

function percent(value, total) {
  if (!total) return 0;
  return Math.round(Number(value || 0) / total * 100);
}

function encodeRFC3986(value) {
  return encodeURIComponent(String(value)).replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), "Content-Type": "application/json; charset=utf-8" }
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  };
}
