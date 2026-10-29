/*
 * 百度智能云 CFC 云函数 —— 「拾光」代理（修复 + 小忆真 AI 双路由，v2 版）
 * 部署：CFC 控制台 → Node.js 18+ 空白函数（事件函数）
 *       整文件覆盖 → 保存 → 配 HTTP 触发器(POST, 不验证)
 * 前端约定（统一用 text/plain，避免浏览器 OPTIONS 预检被拦）：
 *   /restore ：POST { action:"restore", image:"base64", mode:"bw"|"color" } → { image:"base64" } 或 { error }
 *   /chat    ：POST { action:"chat", messages:[{role,content}] } → { reply:"..." } 或 { error }
 *
 * 注意：图像接口仍用原 AK/SK（图像权限）；聊天改用千帆 v2 接口 + IAM API Key（bce-v3 开头）。
 *       两把密钥都优先读环境变量，没有才用下方占位。
 */

const API_KEY = process.env.BAIDU_API_KEY;
const SECRET_KEY = process.env.BAIDU_SECRET_KEY;

// 千帆 v2 对话：IAM API Key（在千帆控制台「API Key」里创建，bce-v3 开头）
const QIANFAN_API_KEY = process.env.QIANFAN_API_KEY;
// 选用带「免费额度」的模型，演示期零成本；如需更强模型改这一行即可
const ERNIE_MODEL = 'ernie-4.5-turbo-128k';

let _token = null;
let _tokenExp = 0;

async function baiduToken() {
  if (_token && Date.now() < _tokenExp) return _token;
  const q = 'grant_type=client_credentials&client_id=' + encodeURIComponent(API_KEY) +
            '&client_secret=' + encodeURIComponent(SECRET_KEY);
  const r = await fetch('https://aip.baidubce.com/oauth/2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: q
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(j.error_description || '获取token失败');
  _token = j.access_token;
  _tokenExp = Date.now() + (j.expires_in - 60) * 1000;
  return _token;
}

// ---------- 图像修复 ----------
async function callImg(endpoint, base64) {
  const tok = await baiduToken();
  const r = await fetch('https://aip.baidubce.com/rest/2.0/image-process/v1/' + endpoint +
                        '?access_token=' + tok, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'image=' + encodeURIComponent(base64)
  });
  const j = await r.json();
  if (j.error_code) throw new Error(j.error_msg || ('百度接口错误 ' + j.error_code));
  if (!j.image) throw new Error('接口未返回图像');
  return j.image;
}

async function restore(base64, mode) {
  // v4 修复链：上色 → 色彩增强 → 清晰度增强 → 2倍超分(image_quality_enhance)
  // 实测 image_quality_enhance 会把图放大 2 倍并补细节，是提升"清晰化"感知的关键一步
  const chain = ['color_enhance', 'image_definition_enhance', 'image_quality_enhance'];
  if (mode === 'bw') chain.unshift('colourize');
  let img = base64;
  for (const ep of chain) img = await callImg(ep, img);
  return img;
}

// ---------- 小忆真 AI（千帆 v2 对话接口） ----------
async function chatQianfan(messages) {
  const r = await fetch('https://qianfan.baidubce.com/v2/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + QIANFAN_API_KEY
    },
    body: JSON.stringify({ model: ERNIE_MODEL, messages })
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message || ('千帆错误 ' + JSON.stringify(j.error)));
  if (!j.choices || !j.choices[0] || !j.choices[0].message) throw new Error('千帆未返回内容');
  return j.choices[0].message.content;
}

// ---------- 请求解析（兼容各种 body 形态，保持原样） ----------
function parseEvent(event) {
  let ev = event;
  if (typeof ev === 'string') { try { ev = JSON.parse(ev); } catch (e) { ev = {}; } }
  ev = ev || {};
  let raw = ev.body;
  if (raw == null && ev.image) return JSON.stringify(ev);
  if (raw == null) raw = '';
  if (typeof raw !== 'string') raw = (typeof raw === 'object') ? JSON.stringify(raw) : String(raw);
  if (ev.isBase64Encoded) { try { raw = Buffer.from(raw, 'base64').toString('utf8'); } catch (e) {} }
  return raw;
}

exports.handler = (event, context, callback) => {
  const done = (statusCode, obj) => callback(null, {
    isBase64Encoded: false,
    statusCode: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    },
    body: JSON.stringify(obj)
  });

  (async () => {
    if (!API_KEY || API_KEY.indexOf('填') >= 0) throw new Error('API Key 未配置');
    const raw = parseEvent(event);
    let parsed = null;
    try { parsed = JSON.parse(raw); }
    catch (e) {
      try { parsed = JSON.parse(Buffer.from(raw, 'base64').toString('utf8')); }
      catch (e2) { done(200, { error: '无法解析请求体，前120字符: ' + String(raw).slice(0, 120) }); return; }
    }
    if (!parsed || typeof parsed !== 'object') { done(400, { error: '请求体格式错误' }); return; }

    // —— 路由：聊天 or 修复 ——
    if (parsed.action === 'chat') {
      if (!Array.isArray(parsed.messages) || !parsed.messages.length) {
        done(400, { error: '缺少 messages' }); return;
      }
      const reply = await chatQianfan(parsed.messages);
      done(200, { reply });
      return;
    }

    // —— 默认走修复（兼容旧前端只传 {image,mode}） ——
    if (!parsed.image) { done(400, { error: '请求体缺少 image 字段' }); return; }
    const out = await restore(String(parsed.image).slice(0, 12 * 1024 * 1024), parsed.mode || 'color');
    done(200, { image: out });
  })().catch((err) => done(200, { error: String((err && err.message) || err) }));
};
