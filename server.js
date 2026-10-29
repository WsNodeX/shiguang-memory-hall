/*
 * 拾光 · 本地代理服务
 * 作用：1) 静态托管拾光项目  2) /api/restore 代理调用百度智能云图像增强接口
 * 关键点：API Key/Secret 只存在本服务端，前端拿不到，安全。
 * 运行：node server.js  （首次需 npm 无依赖，纯 Node 内置模块）
 */
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
const API_KEY = CONFIG.baidu_api_key;
const SECRET_KEY = CONFIG.baidu_secret_key;
const PORT = CONFIG.port || 8787;
const ROOT = path.resolve(CONFIG.project_dir);

let token = null;
let tokenExp = 0;

// ---- 通用 HTTPS POST（form-urlencoded） ----
function httpsPost(urlStr, body, contentType) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlStr);
    const data = Buffer.from(body, 'utf8');
    const opt = {
      method: 'POST',
      hostname: u.hostname,
      path: u.pathname + u.search,
      headers: { 'Content-Type': contentType, 'Content-Length': data.length }
    };
    const req = https.request(opt, (res) => {
      let chunks = '';
      res.on('data', (c) => (chunks += c));
      res.on('end', () => resolve(chunks));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ---- 取 access_token（缓存到过期前） ----
function baiduToken() {
  if (token && Date.now() < tokenExp) return Promise.resolve(token);
  const q = 'grant_type=client_credentials&client_id=' + encodeURIComponent(API_KEY) +
            '&client_secret=' + encodeURIComponent(SECRET_KEY);
  return httpsPost('https://aip.baidubce.com/oauth/2.0/token', q, 'application/x-www-form-urlencoded')
    .then((body) => {
      const j = JSON.parse(body);
      if (j.access_token) {
        token = j.access_token;
        tokenExp = Date.now() + (j.expires_in - 60) * 1000;
        return token;
      }
      throw new Error(j.error_description || '获取 token 失败');
    });
}

// ---- 调用单个图像增强接口，返回处理后图片的 base64 ----
function callImg(endpoint, base64) {
  return baiduToken().then((tok) => {
    const q = 'image=' + encodeURIComponent(base64);
    return httpsPost('https://aip.baidubce.com/rest/2.0/image-process/v1/' + endpoint +
                     '?access_token=' + tok, q, 'application/x-www-form-urlencoded');
  }).then((body) => {
    const j = JSON.parse(body);
    if (j.error_code) throw new Error(j.error_msg || '百度接口错误');
    if (!j.image) throw new Error('返回无图像');
    return j.image;
  });
}

// ---- 串联修复链路：黑白先上色，再做色彩增强+清晰度增强 ----
function restore(base64, mode) {
  const chain = ['color_enhance', 'image_definition_enhance'];
  if (mode === 'bw') chain.unshift('colourize');
  return chain.reduce((p, ep) => p.then((cur) => callImg(ep, cur)), Promise.resolve(base64));
}

// ---- 静态文件托管 ----
function mime(p) {
  const e = path.extname(p).toLowerCase();
  return ({ html: 'text/html', js: 'application/javascript', css: 'text/css',
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
    mp3: 'audio/mpeg', json: 'application/json', svg: 'image/svg+xml' }[e]) || 'application/octet-stream';
}

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];

  if (urlPath === '/api/restore') {
    let body = '';
    req.on('data', (c) => {
      body += c;
      if (body.length > 20 * 1024 * 1024) req.destroy();
    });
    req.on('end', () => {
      let parsed;
      try { parsed = JSON.parse(body); } catch (e) {
        res.writeHead(400); res.end(JSON.stringify({ error: 'bad json' })); return;
      }
      const img = parsed.image, mode = parsed.mode || 'color';
      if (!img) { res.writeHead(400); res.end(JSON.stringify({ error: 'no image' })); return; }
      restore(img, mode)
        .then((out) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ image: out })); })
        .catch((err) => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: String((err && err.message) || err) })); });
    });
    return;
  }

  let rel = urlPath === '/' ? '/index.html' : urlPath;
  const filePath = path.normalize(path.join(ROOT, rel));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end('forbidden'); return; }
  fs.readFile(filePath, (err, buf) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': mime(filePath) });
    res.end(buf);
  });
});

server.listen(PORT, () => {
  console.log('拾光本地服务已启动： http://localhost:' + PORT);
  console.log('托管目录：' + ROOT);
  if (!API_KEY || API_KEY.indexOf('在此填入') === 0) console.log('⚠️  请在 config.json 填入百度 API Key / Secret Key');
});
