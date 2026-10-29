/*
 * 百度智能云 CFC 云函数 —— 「拾光」修复代理（稳健版，兼容各种 body 形态）
 * 部署：CFC 控制台创建函数（Node.js 18+，空白函数，事件函数）
 *       粘贴本代码 → 保存 → 配 HTTP 触发器(POST, /restore, 不验证)
 * 前端约定：POST 正文为 JSON 字符串，{ image: "base64", mode: "bw" | "color" }
 * 返回：{ image: "base64" } 或 { error: "..." }
 */

const API_KEY = process.env.BAIDU_API_KEY;
const SECRET_KEY = process.env.BAIDU_SECRET_KEY;

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

// 修复链：黑白先上色 → 色彩增强 → 清晰度增强
async function restore(base64, mode) {
  const chain = ['color_enhance', 'image_definition_enhance'];
  if (mode === 'bw') chain.unshift('colourize');
  let img = base64;
  for (const ep of chain) img = await callImg(ep, img);
  return img;
}

// 兼容：event 可能是字符串/对象；body 可能是字符串/对象/base64；有时 event 本身就是请求体
function parseEvent(event) {
  let ev = event;
  if (typeof ev === 'string') { try { ev = JSON.parse(ev); } catch (e) { ev = {}; } }
  ev = ev || {};
  let raw = ev.body;
  if (raw == null && ev.image) return JSON.stringify(ev); // event 本身就是请求体
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
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
    if (!parsed || !parsed.image) { done(400, { error: '请求体缺少 image 字段' }); return; }
    const out = await restore(String(parsed.image).slice(0, 12 * 1024 * 1024), parsed.mode || 'color');
    done(200, { image: out });
  })().catch((err) => done(200, { error: String((err && err.message) || err) }));
};
