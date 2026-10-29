# 拾光·家的记忆馆 — 修复指令单（第二十二阶段 V4：光影显影版开场 Loader）

> **V4 整体替换此前所有 loader 版本**，更替换第二十一阶段的倒计时 loader。滚动显影（21-B）与图片减重（21-C）不变。
> **效果预览：直接双击打开 `sg-loader.html`**（与嵌入代码完全一致，两张照片已内嵌，无需任何外部资源）。
>
> 设计思路（不再是画出来的场景，而是「一张真正的老照片正在被光修复」）：
> - **真实影像基底**：画面主体是一幅水彩厚涂乡村小院（外婆家 + 杏花树 + 暖金逆光），同一构图做了两版——`旧照`（程序化做旧：褪色泛黄、颗粒、划痕、折痕、边角磨损、暗角）与 `新照`（全彩修复版）。两版完全同构，显影时逐列揭开，像真的在修复这张照片。
> - **光扫显影**：一道竖直的暖光光带从左往右缓缓扫过照片——**光带经过的地方，颜色被逐列还原**（clip-path 揭开与光带 translateX 同节奏同曲线）；光带像从院门缝里漏进来的阳光。进度条用同一节奏充填，全片约 4.3 秒。
> - **立体纵深**：照片以 3D 姿态（rotateY/rotateX）悬浮在真实相册底座上（translateZ 分层，带书脊与页边）；背景失焦光斑(-120px)、相册底座(-70px)、照片、前景失焦草叶(+46px)；相机 13 秒缓慢推镜；桌面鼠标移动照片跟手微转（手机自动跳过）。
> - **文字逐行升起**：「一九七八年 · 春」→「外婆家门口，杏花开得正好」→「拾光 · 正在翻开这本相册」→「光扫过的地方，记忆慢慢有了颜色」；暗角 + 胶片颗粒收尾，电影感。

---

## 步骤 1：删除旧 Loader
删除第二十一阶段「修复 A」的全部 HTML（`#sgLoader` 胶片倒计时块）、CSS（`.sg-film/.sg-sweep/.sg-count/.sg-loader-t1/.sg-loader-t2/@keyframes sgSpin`）与对应 JS。若已贴过 V1/V2/V3 版 loader，一并删干净。

## 步骤 2：粘贴 CSS
打开 `sg-loader.html`，把 `<style>` 内**除 `body{...}` 这一条以外**的全部样式，追加到 index.html 的 `<style>` 末尾。然后把其中的 `body{...}` 一条替换为下面这条（挂到全屏容器上）：

```css
/* ===== 开场 Loader 外壳（光影显影版） ===== */
#sgLoader{position:fixed;inset:0;z-index:9999;overflow:hidden;
  background:
    radial-gradient(70% 55% at 68% 22%,rgba(214,150,58,.16),transparent 62%),
    radial-gradient(120% 90% at 50% 40%,#2c2219 0%,#1C1510 52%,#120d09 100%);
  display:flex;align-items:center;justify-content:center;
  font-family:"KaiTi","STKaiti","楷体",serif;-webkit-font-smoothing:antialiased;
  transition:opacity .7s ease}
#sgLoader.hide{opacity:0;pointer-events:none}
```

## 步骤 3：粘贴 HTML
在 index.html 的 `<body>` 标签后立即插入：

```html
<div id="sgLoader" aria-hidden="true">
  <!-- ↓↓↓ 这里原样粘贴 sg-loader.html <body> 内的全部内容
       （.stage 整块 + .vignette + .grain + 两个 <script>）↓↓↓ -->
</div>
```

> 两张 base64 照片（旧照/新照）已经内联在粘贴内容里，**不要动那两段 data:image/jpeg;base64**，直接整块复制即可。总增量约 545 KB，可接受（21-C 已把全站图片减了 51%）。

## 步骤 4：加载完成自动淡出（JS，脚本区末尾追加）

```js
  /* —— 开场 Loader：加载完成淡出；同会话只出现一次 —— */
  (function(){
    var ld=document.getElementById('sgLoader'); if(!ld){return;}
    if(sessionStorage.getItem('sg_loader')){ ld.parentNode.removeChild(ld); return; }
    sessionStorage.setItem('sg_loader','1');
    if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches){ ld.parentNode.removeChild(ld); return; }
    var done=false;
    function hide(){ if(done){return;} done=true;
      ld.classList.add('hide'); setTimeout(function(){ if(ld.parentNode){ld.parentNode.removeChild(ld);} },750); }
    if(document.readyState==='complete'){ setTimeout(hide,2600); }
    else{
      window.addEventListener('load',function(){ setTimeout(hide,1400); });  /* 加载完再停留1.4s，让显影走完大半 */
      setTimeout(hide,8000);                                                  /* 兜底：最多8秒必进页面 */
    }
  })();
```

> 注意：`sg-loader.html` 里两个 `<script>`（尘埃生成、指针视差）要**一起**粘进 `#sgLoader` 内或页面脚本区。没有倒计时数字，不存在"卡在 3"的问题；加载多久动画就循环多久。

---

## 验证清单
1. 双击 `sg-loader.html`：泛黄老照片上，一道暖光竖带从左往右扫过，**光带经过的地方颜色随之铺开**，约 4.3 秒照片完全修复成彩色油画；四行文字依次升起，进度条同步充满。
2. 照片 3D 倾斜浮在相册底座上；下方有暖光；左下角有失焦草叶前景；尘埃缓缓上浮。
3. 鼠标在画面上移动：照片轻微跟手转动（触屏设备无此效果，属正常）。
4. 嵌入后新会话访问：loader 播放至页面就绪后 1.4 秒淡出；同会话刷新不再出现；"减弱动态效果"用户直接进页面。
5. 手机端：场景自适应（照片 min(78vw,410px)），无横向滚动。
