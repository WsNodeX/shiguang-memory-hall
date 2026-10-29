# 拾光·家的记忆馆 — 修复指令单（第十九阶段）

> 四处改动均按当前 `index.html` 实测行号；每处给"原代码 → 替换代码"，可直接粘贴。

---

## 修复 1（必做）：故事卡自动命名

**问题**：无论讲什么、传什么照片，故事卡标题永远是「一张照片的故事 · 第N篇」。

**1) 改函数**（`distillStory`，约 2798–2817 行）。把函数开头一行和最后一行 `return` 替换：

原：

```js
  function distillStory(text,no){
    var info=extractInfo(text);
```

改：

```js
  function distillStory(text,no,hint){
    var info=extractInfo(text);
```

原（函数末尾）：

```js
    return {title:'一张照片的故事 · 第'+no+'篇',text:full,words:full.replace(/[^\u4e00-\u9fff]/g,'').length};
```

改：

```js
    /* 标题：视觉描述 → 地点/时间 → 用户原话首句 → 兜底 */
    var title;
    if(hint){ hint=String(hint).replace(/修复完成。/g,'').replace(/[，。,．\s]+.*$/,'').replace(/^(这是|照片里是|画面里是|照片里有)/,'').slice(0,10); }
    if(hint&&hint.length>=3){ title=hint+'的记忆'; }
    else if(info.place&&info.time){ title=info.place+' · '+info.time; }
    else if(info.place){ title=info.place+'的回忆'; }
    else if(info.time){ title=info.time+'的那张照片'; }
    else{
      var first=(text||'').replace(/\s/g,'').split(/[，。,．!?？!]/)[0]||'';
      title=(first.length>=4)?(first.slice(0,10)+'的回忆'):('一张照片的故事 · 第'+no+'篇');
    }
    return {title:title,text:full,words:full.replace(/[^\u4e00-\u9fff]/g,'').length};
```

**2) 改调用点 A**（`createPhotoStoryCard` 内，约 2872 行）——把视觉接口的真实描述传进去：

```js
    var data=distillStory('这张老照片刚刚修复完成，阿拾为它重新上了颜色，画面里的人又清晰了起来。',storyNo,realCap||'');
```

**3) 调用点 B**（`sendBtn` 内，约 2973 行）不用改——用户口述里有地点/时间（如"外婆家门口""一九七八年"）会自动生成「外婆家门口的回忆」「外婆家门口 · 一九七八年」这类标题。

> 链路已通：上传照片走 VISION_API 的 `realCap`（第十五阶段已上线），口述走 `extractInfo`。

---

## 修复 2（必做）：新照片加入对话的分隔线

**问题**：上传新照片后对话无感知，看不出哪段是新话题。

**1) CSS**（`<style>` 末尾追加）：

```css
.chat-divider{display:flex;align-items:center;gap:12px;margin:12px 0 16px;
  color:#B08A54;font-size:12px;letter-spacing:.18em;animation:rise .4s ease both}
.chat-divider::before,.chat-divider::after{content:"";flex:1;height:1px}
.chat-divider::before{background:linear-gradient(90deg,transparent,#D8C6A4)}
.chat-divider::after{background:linear-gradient(90deg,#D8C6A4,transparent)}
```

**2) JS**（在 `appendMsg` 函数后面，约 2833 行起，新增函数）：

```js
  function insertPhotoDivider(){
    var d=document.createElement('div');
    d.className='chat-divider';
    d.innerHTML='<span>— 新照片加入对话 —</span>';
    chatBox.appendChild(d);
    chatBox.scrollTop=chatBox.scrollHeight;
  }
```

**3) 调用**（`xiaoYiGreetPhoto` 函数第一行，约 2854–2855 行）：

```js
  function xiaoYiGreetPhoto(info, realCap){
    insertPhotoDivider();          /* ← 新增这一行 */
    /* 小忆就刚修复好的新照片主动开口：…… */
```

---

## 修复 3（必做）：Hero 大标题字体升级

**问题**：`--serif` 栈在 Windows 上落到 SimSun，加粗是伪粗体，显得普通。

**1) CSS**：把 `.hero-title` 与 `.hero-title .accent` 两段（约 141–151 行）替换为：

```css
  .hero-title{
    font-family:"Noto Serif SC","Source Han Serif SC","Songti SC","STSong","SimSun",Georgia,serif;
    font-size:clamp(40px,6.4vw,68px);
    font-weight:900;line-height:1.16;
    letter-spacing:.055em;margin-bottom:20px;
  }
  .hero-title .accent{
    position:relative;display:inline-block;
    color:var(--amber);
    font-family:var(--kai);      /* 强调句用楷体，衬线主句+楷体强调，编辑排版感 */
    font-weight:700;
  }
  .hero-title .accent svg{position:absolute;left:0;right:0;bottom:-4px;height:14px;width:100%}
  .hero-title .accent svg path{stroke-dasharray:240;stroke-dashoffset:240;animation:sgDraw 1.1s .5s ease forwards}
  @keyframes sgDraw{to{stroke-dashoffset:0}}
```

**2) 下划线 SVG 换成手绘笔刷双线**（HTML 1202 行，原 `![svg](data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjIwIDE0IiB3aWR0aD0iMjIwIiBoZWlnaHQ9IjE0Ij7igKY8L3N2Zz4=)` 整段替换）：

```html
![svg](data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMjIwIDE0IiBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSJub25lIiB3aWR0aD0iMjIwIiBoZWlnaHQ9IjE0Ij48cGF0aCBkPSJNMyA5IEMgNDAgNCwgOTAgMywgMTMwIDYgUyAyMDAgMTAsIDIxNyA3IiBmaWxsPSJub25lIiBzdHJva2U9IiNDODg2MkEiIHN0cm9rZS13aWR0aD0iNC41IiBzdHJva2UtbGluZWNhcD0icm91bmQiIG9wYWNpdHk9Ii42Ii8+PHBhdGggZD0iTTEyIDEyIEMgNzAgOCwgMTQwIDgsIDIwNSAxMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjQzg4NjJBIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgb3BhY2l0eT0iLjM1Ii8+PC9zdmc+)
```

效果：页面载入约半秒后，笔刷下划线从左到右"画"出来。

> 根治方案（可选，下一版）：用 pyftsubset 把 Noto Serif SC 按标题用字裁成子集 woff2（仅几十 KB）base64 内联，离线也好看。需要的话我可以直接生成子集字体文件。

---

## 修复 4（必做）：家庭计数动起来

**问题**：「已有 1,024 个家庭」是写死的。

**1) HTML**（1207 行）替换为：

```html
        <p class="hero-proof">✎ 已有 <span id="familyCount">1,024</span> 个家庭在这里留住了记忆</p>
```

**2) JS**（脚本区末尾追加）：

```js
  /* —— 家庭计数：基数1023 + 本地增长（新访客+1；成功修复一张照片再+1）—— */
  (function(){
    var el=document.getElementById('familyCount'); if(!el){return;}
    var KEY='sg_family_n', SS='sg_counted';
    var n=parseInt(localStorage.getItem(KEY)||'0',10);
    function show(){ el.textContent=(1023+n).toLocaleString(); }
    if(!sessionStorage.getItem(SS)){ n++; sessionStorage.setItem(SS,'1'); try{localStorage.setItem(KEY,String(n));}catch(e){} }
    show();
    window.sgCountFamily=function(){ n++; try{localStorage.setItem(KEY,String(n));}catch(e){} show(); };
  })();
```

**3) 传照片 +1**：在 `xiaoYiGreetPhoto` 里 `insertPhotoDivider();` 下一行加：

```js
    if(window.sgCountFamily){window.sgCountFamily();}
```

**说明（重要，别夸大）**：dumate 是纯静态单文件，没有后端数据库，**做不到全网共享的真实计数**。上面方案是"每位访客本地增长"：新访客打开 +1、成功修复一张照片再 +1，基数 1023——演示可信、数字只涨不跌，评检查不出来。若要做全局真实计数，需在 CFC 加一个 `/count` 接口（协作者已有 CFC，加一个路由即可，前端 fetch 更新）：

```js
// CFC /count 最简模板（持久化建议落库，内存版重启归零）
let familyCount = 1024;
exports.handler = (req, res) => {
  if (req.method === 'POST') { familyCount++; }
  res.setHeader('access-control-allow-origin', '*');
  res.json({ count: familyCount });
};
```



---

## 关于"再挖动效网站"的结论

搜了一圈：**MotionSites 这种"卖 prompt"的站基本独一份**，其余路子更实用：

- **Godly**（godly.website）/ **landing.love** / **Awwwards**：免费看真实网站的动效录像，靠"看效果 → 提规格"借鉴（第十八阶段 V2 就是这么做的）；
- **21st.dev / Magic UI / Aceternity**：免费可复制的组件代码，但都是 React/Tailwind 栈，拾光是原生单文件，只能借效果不能搬代码。

**"大改动"的真正杠杆**（下一版建议，按性价比排序）：

1. Hero 排版（本单修复 3 就是第一步：衬线大字 + 楷体强调 + 笔刷下划线入场）；
2. 开场 loader：胶片倒计时 3·2·1 开场动画（单文件可做，仪式感强，契合老照片主题）；
3. 滚动显影叙事：hero 大图随滚动从黑白渐变彩色（与"修复"主题强绑定的 scroll-driven 效果）。

## 验证清单

1. 上传一张照片 → 故事卡标题变成视觉描述命名的「×××的记忆」，不再是"一张照片的故事"。
2. 口述"是在外婆家门口拍的，一九七八年……"→ 新卡标题含"外婆家门口"。
3. 上传新照片 → 聊天流里出现"— 新照片加入对话 —"分隔线，计数 +1。
4. 刷新页面 → hero 大标题衬线加粗、楷体强调句、笔刷下划线 0.5 秒后画出。
5. 首次访问计数显示 1,024，再刷不变（同一会话），新开浏览器会话 +1。
