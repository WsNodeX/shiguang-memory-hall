# 拾光·家的记忆馆 — 修复指令单（第二十一阶段：开场 Loader + 滚动显影 + 移动端减重）

> 三块：A 开场 loader（含加载提醒文案）、B 滚动显影叙事、C 移动端加载减重（治本）。
> 行号按当前 `index.html` 实测（`<body>` 在 1173 行）。

---

## 修复 A（必做）：开场胶片倒计时 Loader + 加载提醒

**问题**：移动端加载十几秒白屏，访客以为页面是空的。
**效果**：进站先看到深色胶片倒计时盘 3→2→1 + 一句好听的提示；页面加载完自动淡出。同一会话内刷新不再出现，不烦人。

**1) HTML**（`<body>` 标签后、所有内容之前插入，保证第一时间渲染）：
```html
<div id="sgLoader" aria-hidden="true">
  <div class="sg-film">
    <svg class="sg-sweep" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r="56" fill="none" stroke="rgba(200,134,42,.35)" stroke-width="2"/>
      <path d="M60 60 L60 4 A56 56 0 0 1 108 34 Z" fill="rgba(200,134,42,.18)"/>
    </svg>
    <span class="sg-count" id="sgCount">3</span>
  </div>
  <p class="sg-loader-t1">拾光 · 正在翻开这本相册</p>
  <p class="sg-loader-t2">老照片正在显影，好故事值得多等几秒</p>
</div>
```

**2) CSS**（`<style>` 末尾追加）：
```css
#sgLoader{position:fixed;inset:0;z-index:9999;background:#171310;display:flex;
  flex-direction:column;align-items:center;justify-content:center;gap:18px;transition:opacity .6s ease}
#sgLoader.hide{opacity:0;pointer-events:none}
.sg-film{position:relative;width:120px;height:120px}
.sg-sweep{width:100%;height:100%;animation:sgSpin 1.8s linear infinite}
.sg-count{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  font-family:var(--serif);font-size:52px;color:#E7C48A}
.sg-loader-t1{font-family:var(--kai);font-size:19px;color:#F1E7D6;letter-spacing:.3em;text-indent:.3em;margin:0}
.sg-loader-t2{font-size:12.5px;color:#9C8B74;letter-spacing:.12em;margin:0}
@keyframes sgSpin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.sg-sweep{animation:none}}
```

**3) JS**（脚本区末尾追加）：
```js
  /* —— 开场 loader：倒计时3·2·1，加载完成淡出；同会话只出现一次 —— */
  (function(){
    var ld=document.getElementById('sgLoader'); if(!ld){return;}
    var c=document.getElementById('sgCount'), n=3;
    if(sessionStorage.getItem('sg_loader')){ ld.remove(); return; }
    sessionStorage.setItem('sg_loader','1');
    if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches){ ld.remove(); return; }
    var done=false;
    function hide(){ ld.classList.add('hide'); setTimeout(function(){ if(ld.parentNode){ld.parentNode.removeChild(ld);} },700); }
    var t=setInterval(function(){ n--; if(n>=1&&c){c.textContent=n;} },600);
    function fin(){ if(done){return;} done=true; clearInterval(t); hide(); }
    if(document.readyState==='complete'){ setTimeout(fin,1900); }
    else{ window.addEventListener('load',function(){ setTimeout(fin,600); }); setTimeout(fin,4500); } /* 最多4.5秒兜底 */
  })();
```

---

## 修复 B（推荐）：滚动显影叙事 —— hero 大图随滚动从黑白变彩色

**效果**：进站时 hero 相册图是泛黄黑白，往下滚一屏，照片像在药水里慢慢"显影"成彩色——和"修复"主题强绑定。

**JS**（脚本区末尾追加）：
```js
  /* —— hero 显影：滚动驱动 黑白→彩色 —— */
  (function(){
    var img=document.querySelector('.hero-photo img'); if(!img){return;}
    if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches){return;}
    function paint(){
      var r=img.getBoundingClientRect();
      var p=Math.min(1,Math.max(0,window.scrollY/((r.height||400)*0.8)));
      img.style.filter='grayscale('+(1-p).toFixed(3)+') sepia('+((1-p)*0.25).toFixed(3)+')';
    }
    paint();
    window.addEventListener('scroll',function(){ window.requestAnimationFrame(paint); },{passive:true});
  })();
```
> 不碰 `.ex-compare` 对比滑块；`.hero-photo img`（191–198 行）专属。

---

## 修复 C（治本，强烈建议同批做）：移动端加载减重

**根源**：`assets/` 共 **10.3MB**，其中：
- `children-before.jpg.paircheck.png` / `family-before.jpg.paircheck.png` / `wedding-before-43.jpg.paircheck.png` 三个**调试图共 2.8MB**（HTML 未引用，纯垃圾）；
- 引用中的 19 张 jpg 共 3.6MB，单张 200–380KB，发布时全部 base64 内联 → 线上 HTML 10MB。

**1) 删垃圾**（直接删 assets 里这三个文件）：
```
children-before.jpg.paircheck.png
family-before.jpg.paircheck.png
wedding-before-43.jpg.paircheck.png
```

**2) 压缩图覆盖**：`deliver-compressed/` 文件夹里 19 张 jpg 与 `assets/` **同名**，直接覆盖。已做保证：
- 三组对比图（children / family / wedding）**前后两两锁定同尺寸 900×675**，滑块对齐不受影响；
- 质量 80 渐进式，肉眼基本无损；
- **19 张共 3.6MB → 1.8MB（-51%）**；加上删 paircheck，assets 总量 10.3MB → 约 4.9MB，发布 HTML 预计从 10MB 降到 5–6MB，手机加载时间约减半。

**3) 可选（下一版）**：MP3 重编码实测反而变大（源码率已低），不动；`dataOldDl` 里 base64 大图与文件路径重复内联的问题，可等 16 阶段方案稳定后去掉一处，再省约 1MB。

---

## 验证清单
1. 新开浏览器会话进站：深色胶片倒计时 3·2·1 + 「拾光 · 正在翻开这本相册」/「老照片正在显影，好故事值得多等几秒」，页面就绪后约 0.6 秒淡出；同一会话刷新不再出现。
2. 往下滚一屏：hero 相册图从泛黄黑白渐渐变彩色；示例区对比滑块不受影响。
3. 手机端（或 DevTools 节流 Slow 3G）：白屏时间明显缩短，且白屏期间有 loader 提示。
4. 系统开"减弱动态效果"：loader 与滚动显影自动跳过，页面直接可用。
