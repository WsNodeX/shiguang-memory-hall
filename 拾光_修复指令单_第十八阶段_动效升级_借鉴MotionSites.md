# 拾光·家的记忆馆 — 修复指令单（第十八阶段：动效升级）

> 灵感来源：motionsites.org（AI 网站动效灵感库）。完整 prompt 是付费的（$9.9/条），**不需要买**——下面每条都按拾光"单文件 + 原生 HTML/CSS/JS"的现状重写好了，直接粘贴即可。
> 原则：全部为**增量新增**，不改现有逻辑；每条都遵守现有 `prefers-reduced-motion` 降级。

## 从 MotionSites 借了哪些思路
| 案例 | 借的思路 | 拾光落点 |
|---|---|---|
| Atrium MTL 照片档案（社区/媒体） | 三列照片**交替上下无限滚动** + 标题 mask 上升入场 + 暖白底颗粒 | 示例区/记忆馆氛围 |
| Imagine Studio「Liquid Ink Reveal」 | hover 时**墨水显影**式渐显 | 老照片卡：黑白→彩色显影，呼应"修复"主题 |
| Feather Atlas 图鉴 | 卡片式档案、有序编号 | 故事卡已有，不动 |
| Nature Ritual 视频背景 | ❌ **不借**：视频背景对单文件+移动端体积/加载不划算 | — |

---

## 修复 A（必做）：示例区照片墙 Marquee
现状：示例区是静态网格。改成 Atrium MTL 式三列交替滚动的"记忆之墙"，首屏动起来，评委第一眼就有"家的记忆"氛围。

**1) HTML**：把示例区容器（现有 `.ex-*` 网格）外包一层，或直接在示例区上方新增一段（三列照片全部复用 `assets/` 现有图，无需新素材）：
```html
<div class="mem-wall" aria-hidden="true">
  <div class="mem-col">
    <img src="assets/story-xinghua-43.jpg" alt=""><img src="assets/family-after-clean.jpg" alt=""><img src="assets/wedding-after-clean.jpg" alt=""><img src="assets/story-chuxi-43.jpg" alt="">
  </div>
  <div class="mem-col mem-col-rev">
    <img src="assets/children-after.jpg" alt=""><img src="assets/story-shangxue-43.jpg" alt=""><img src="assets/children-before-clean.jpg" alt=""><img src="assets/family-before-clean.jpg" alt="">
  </div>
  <div class="mem-col">
    <img src="assets/wedding-before-clean.jpg" alt=""><img src="assets/story-xinghua-43.jpg" alt=""><img src="assets/children-after.jpg" alt=""><img src="assets/story-shangxue-43.jpg" alt="">
  </div>
</div>
```
**2) CSS**（`<style>` 末尾追加）：
```css
.mem-wall{display:flex;gap:14px;height:300px;overflow:hidden;margin:26px 0;position:relative}
.mem-wall::before,.mem-wall::after{content:"";position:absolute;left:0;right:0;height:70px;z-index:2;pointer-events:none}
.mem-wall::before{top:0;background:linear-gradient(#f6f1e7,transparent)}
.mem-wall::after{bottom:0;background:linear-gradient(transparent,#f6f1e7)}
.mem-col{flex:1;display:flex;flex-direction:column;gap:14px;animation:memUp 46s linear infinite}
.mem-col-rev{animation:memDown 52s linear infinite}
.mem-col img{width:100%;border-radius:10px;object-fit:cover;filter:sepia(.15) contrast(.98);box-shadow:0 4px 14px rgba(90,60,30,.12)}
@keyframes memUp{from{transform:translateY(0)}to{transform:translateY(-50%)}}
@keyframes memDown{from{transform:translateY(-50%)}to{transform:translateY(0)}}
.mem-wall:hover .mem-col{animation-play-state:paused}
@media (prefers-reduced-motion:reduce){.mem-col{animation:none}}
```
要点：每列内容**重复两遍**时把高度撑够一屏以上即可实现无缝循环（img 复制一份接着排）；上下渐隐遮罩用站点现有米色底色（`#f6f1e7` 按实际底色改）；hover 暂停方便评委细看。

## 修复 B（必做）：老照片「显影」hover
现状：24 处 hover 但没有黑白↔彩色过渡。给故事卡/示例照片加"显影"：默认微微泛黄偏灰，hover 时像老照片在药水里显影，缓缓恢复成修复后的彩色（呼应修复主题，成本低、质感强）。

**CSS**（追加）：
```css
.story-card .sc-img img,.ex-frame img{transition:filter 1.1s ease,transform 1.1s ease;filter:grayscale(.55) sepia(.18) contrast(.96)}
.story-card:hover .sc-img img,.ex-frame:hover img{filter:grayscale(0) sepia(0) contrast(1.02);transform:scale(1.02)}
@media (prefers-reduced-motion:reduce){.story-card .sc-img img,.ex-frame img{transition:none;filter:none}}
```
> 选择器按实际类名微调（示例对比区如类名不同，用其真实类替换 `.ex-frame img`）。效果：悬停 1.1 秒内从"泛黄褪色"显影成"修复后彩色"。

## 修复 C（推荐）：标题 mask 上升入场
现状：入场是整块 fade。升级成 Atrium 式"从遮罩里升起来"，高级感立刻不一样。复用现有 IntersectionObserver 的 `.in` 类即可：

**CSS**（追加）：
```css
.sec-title,.pg-title,.tl-title{overflow:hidden}
.sec-title>*,.pg-title,.tl-title{display:inline-block;transform:translateY(110%);transition:transform .7s cubic-bezier(.2,.6,.2,1)}
.sec-title.in>*,.page.cur .pg-title,.familyTimeline.in .tl-title{transform:translateY(0)}
@media (prefers-reduced-motion:reduce){.sec-title>*,.pg-title,.tl-title{transform:none;transition:none}}
```
> 若 `.sec-title` 无 `in` 类逻辑，用现有已带 IntersectionObserver 的区块类名替换；书页标题（`.pg-title`）在翻到当前页（`.cur`）时升起。

## 修复 D（可选，别现在做）：滚动叙事序列
Frozen Cave 那种 scroll-driven 逐帧叙事（滚动驱动"上传→修复→成书"三步推进）效果好但实现成本高，等前 A/B/C 稳定、终稿提交前还有余量再考虑。**明确不借**：视频背景、3D 玻璃折射（Design World）——与拾光的怀旧纸质感冲突，且单文件体积不划算。

---

## 验证清单（浏览器）
1. 首屏/示例区：三列照片墙缓慢交替滚动，鼠标悬停暂停，上下边缘渐隐，无卡顿。
2. 故事卡/示例照片：默认泛黄褪色，悬停约 1 秒显影成彩色并轻微放大。
3. 各区块标题进入视口时从遮罩中升起（不是整块闪现）。
4. 手机端（宽度<768）照片墙不溢出、滚动流畅；系统开"减弱动态效果"时所有新增动画自动关闭。
5. 移动端性能：照片全部加 `loading="lazy"`，若仍卡，把 `.mem-col` 动画改 `will-change:transform` 或移动端隐藏第三列。
