// 本地生成"修复后"示例图：复用 v4 修复链（colourize→color_enhance→image_definition_enhance→image_quality_enhance 2x）
// 输入：assets-new/before-jpg/*.jpg  →  输出：assets-new/after/*.jpg
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.BAIDU_API_KEY || '';
const SECRET_KEY = process.env.BAIDU_SECRET_KEY || '';

let _token = null, _tokenExp = 0;
async function baiduToken() {
  if (_token && Date.now() < _tokenExp) return _token;
  const q = 'grant_type=client_credentials&client_id=' + encodeURIComponent(API_KEY) +
            '&client_secret=' + encodeURIComponent(SECRET_KEY);
  const r = await fetch('https://aip.baidubce.com/oauth/2.0/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: q
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(j.error_description || '获取token失败');
  _token = j.access_token;
  _tokenExp = Date.now() + (j.expires_in - 60) * 1000;
  return _token;
}

async function callImg(endpoint, base64, attempt = 1) {
  const tok = await baiduToken();
  let r, j;
  try {
    r = await fetch('https://aip.baidubce.com/rest/2.0/image-process/v1/' + endpoint +
                      '?access_token=' + tok, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'image=' + encodeURIComponent(base64)
    });
    j = await r.json();
  } catch (e) {
    if (attempt < 4) {
      console.log('  [' + endpoint + '] 网络错误，重试 ' + attempt);
      await new Promise(s => setTimeout(s, 1200));
      return callImg(endpoint, base64, attempt + 1);
    }
    throw new Error('网络失败 @' + endpoint + ': ' + e.message);
  }
  if (j.error_code) {
    // image_quality_enhance 偶发 282000 内部错误，重试最多 3 次
    if (j.error_code === 282000 && attempt < 3) {
      console.log('  [' + endpoint + '] 282000 重试 ' + attempt);
      await new Promise(s => setTimeout(s, 800));
      return callImg(endpoint, base64, attempt + 1);
    }
    throw new Error((j.error_msg || ('百度接口错误 ' + j.error_code)) + ' @' + endpoint);
  }
  if (!j.image) throw new Error('接口未返回图像 @' + endpoint);
  return j.image;
}

async function restore(base64) {
  const chain = ['colourize', 'color_enhance', 'image_definition_enhance', 'image_quality_enhance'];
  let img = base64;
  for (const ep of chain) {
    console.log('  -> ' + ep);
    img = await callImg(ep, img);
  }
  return img;
}

const IN = path.join(__dirname, 'assets-restored', 'before');
const OUT = path.join(__dirname, 'assets-restored', 'after');
fs.mkdirSync(OUT, { recursive: true });

const jobs = [
  ['family-before-clean.jpg', 'family-after-clean.jpg'],
];

(async () => {
  for (const [src, dst] of jobs) {
    const fp = path.join(IN, src);
    if (!fs.existsSync(fp)) { console.log('!! 缺少 ' + src); continue; }
    console.log('\n处理 ' + src + ' → ' + dst);
    const b64 = fs.readFileSync(fp).toString('base64');
    try {
      const out = await restore(b64);
      fs.writeFileSync(path.join(OUT, dst), Buffer.from(out, 'base64'));
      const sz = fs.statSync(path.join(OUT, dst)).size;
      console.log('  ✓ 完成，输出 ' + dst + ' (' + (sz / 1024).toFixed(0) + ' KB)');
    } catch (e) {
      console.log('  ✗ 失败：' + e.message);
    }
  }
  console.log('\n全部完成。');
})();
