# 拾光·家的记忆馆 — 修复指令单（第二十三阶段：备选开场 Loader「像素归位」版）

> **与第二十二阶段（光扫显影版）二选一**，两版都做完了，看团队偏好：
> - **22 光扫版**：一张泛黄老照片，一道暖光从左往右扫过，扫过处颜色还原。安静、电影感。
> - **23 像素归位版（本单）**：老照片先碎成数千枚像素尘埃，从左上角开始**一格一格归位**拼成泛黄影像，再从院门那点光开始**逐像素上色**，最后解析成清晰照片。叙事是「记忆先碎了，再一块块拼回来」。热闹、技术感。
>
> 23 版的动画语言借鉴了 Awwwards/Framer「Pixel grid preloader」「Counter preloader」与 React Bits「PixelTransition / Dither」：像素波浪揭示 + 巨号计数器 + 顶部激光进度线 + 技术网格 + 四角十字标 + 胶片颗粒 + 小标注（Nº 0781 · 35mm / ROLL 04/12）。
> **效果预览：双击打开 `sg-loader-pixel.html`**（纯单文件，两张照片已内嵌；调试可用 `?t=1.8` 直达某一帧）。

---

## 步骤 1：删除旧 Loader
删除第二十一阶段「修复 A」的倒计时 loader 全部代码（HTML/CSS/JS）；若已贴过其他版本 loader，一并删干净。**只保留一个 loader。**

## 步骤 2：粘贴 CSS
打开 `sg-loader-pixel.html`，把 `<style>` 内**除 `body{...}` 这一条以外**的全部样式，追加到 index.html 的 `<style>` 末尾。然后把其中的 `body{...}` 一条替换为：

```css
/* ===== 开场 Loader 外壳（像素归位版） ===== */
#sgLoader{position:fixed;inset:0;z-index:9999;overflow:hidden;
  background:
    radial-gradient(70% 58% at 50% 32%,rgba(214,150,58,.13),transparent 64%),
    radial-gradient(120% 90% at 50% 42%,#241a12 0%,#171009 55%,#0f0a06 100%);
  display:flex;align-items:center;justify-content:center;
  font-family:var(--serif,"Noto Serif SC"),"Songti SC","STSong",serif;
  -webkit-font-smoothing:antialiased;transition:opacity .7s ease}
#sgLoader.hide{opacity:0;pointer-events:none}
```

## 步骤 3：粘贴 HTML
在 index.html 的 `<body>` 标签后立即插入：

```html
<div id="sgLoader" aria-hidden="true">
  <!-- ↓↓↓ 原样粘贴 sg-loader-pixel.html <body> 内的全部内容
       （.wrap 整块 + .vignette + .grain + <script>）↓↓↓ -->
</div>
```

> 两段 `data:image/jpeg;base64`（旧照/新照）已内联，**不要动**，整块复制。总增量约 545 KB。

## 步骤 4：加载完成自动淡出（JS，脚本区末尾追加）

```js
  /* —— 开场 Loader：完整播放一遍后淡出；同会话只出现一次 —— */
  (function(){
    var ld=document.getElementById('sgLoader'); if(!ld){return;}
    if(sessionStorage.getItem('sg_loader')){ ld.parentNode.removeChild(ld); return; }
    sessionStorage.setItem('sg_loader','1');
    if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches){ ld.parentNode.removeChild(ld); return; }
    var done=false;
    function hide(){ if(done){return;} done=true;
      ld.classList.add('hide'); setTimeout(function(){ if(ld.parentNode){ld.parentNode.removeChild(ld);} },750); }
    /* 动画全长约 3.8s：归位→上色→解析成清晰照片。加载完再停留 4.6s 让故事播完 */
    if(document.readyState==='complete'){ setTimeout(hide,4600); }
    else{
      window.addEventListener('load',function(){ setTimeout(hide,4600); });
      setTimeout(hide,8000);   /* 兜底：最多8秒必进页面 */
    }
  })();
```

> 与 22 版不同：23 版是**一次性叙事**（碎片归位→上色→解析），不是循环动画，所以淡出要等 4.6 秒让故事播完；页面加载比这更久时最多 8 秒强制进页。
> `<script>`（像素引擎）要**一起**粘进 `#sgLoader` 内或页面脚本区。纯 2D canvas，无 WebGL；手机端自动降密度（窄屏 6px 步长）。

---

## 验证清单
1. 双击 `sg-loader-pixel.html`：奶油色相纸上，像素尘埃从左上角开始波浪式归位，约 2 秒拼成泛黄老照片；巨号计数器 00→100、顶部激光线同步；随后暖色从院门位置逐像素晕开；约 3.7 秒解析成清晰彩色油画，下方浮现「拾光 · 家的记忆馆」与「一九七八 · 外婆家门口」。
2. 状态行依次变化：「正在归位记忆碎片 · N 块」→「正在上色 · 记忆一点点回来」→「一九七八 · 外婆家门口」。
3. 面板细节：四角有「+」十字标，左上 Nº 0781 · 35mm，右上 ROLL 04/12，底部右侧大计数器半透明浮在照片上。
4. 嵌入后新会话访问：完整播完约 4.6 秒淡出；同会话刷新不再出现；「减弱动态效果」用户直接看到最终照片进页面。
5. 手机端：无横向滚动；窄屏像素自动变粗（6px），性能无压力。
