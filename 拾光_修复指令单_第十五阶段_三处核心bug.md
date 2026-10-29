# 拾光 · 家的记忆馆 — 第十五阶段修复指令单（三处核心 Bug）

> 对象文件（只读，不要在本机直接改）：`C:\Users\Lenovo Y9000P\.qianfan\workspace\sessions\f6bee20bfe2a4f46884dea751817ac6e\2026-10-19\new-chat-2\shiguang-memory-house\index.html`
>
> 用法：下面每一节给出「定位行号 → 旧代码 → 新代码」，请协助方在 index.html 里**逐段替换**即可。不要整体覆盖，避免把已生效的修复（callAI 超时 25000、MAX=1280）冲掉。
>
> 本阶段只解决用户反馈的三个问题：① 上传旧照不上色；② 阿拾/小忆对任何照片都说"看到的一群人"，无图像识别；③ 记忆成书永远停在"外婆家门口的杏花"，新故事进不了书、也无触发提示。

---

## 现象与根因（先对齐，再动手）

| 现象 | 根因行号 | 一句话解释 |
|---|---|---|
| 新上传照片"并没有上色" | `prepareUpload` 第 2020 行 `var isBW=info.sat<15;` | 泛黄/棕褐旧照有褐调饱和度（sat 常见 20–45）≥15 → 被误判成"彩色" → v4 链跳过 `colourize` → 不上色。 |
| 阿拾/小忆对任何照片都回"看到的一群人" | `restoreCaption` 第 2141 行、`xiaoYiGreetPhoto` 第 2675 行 | 全站**没有真实图像识别**，只按 aspect/luma/warm/sat 像素统计编文案；`aspect>1.4` 写死"一群人"。 |
| 记忆成书永远"外婆家门口的杏花" | `renderBook` 第 2837 行 + 书页 HTML 第 1424–1517 行 | 书页是 HTML 写死的（data-page 2/3=杏花/灶火），`storyArchive`（用户真实故事）从不进书；无触发条件、无用户提示。 |

---

## 修复 A：让泛黄/棕褐旧照也能上色

### A-1 改 `prepareUpload` 的旧照判定（第 2020 行）

**旧（约第 2020 行）：**
```js
    var isBW=info.sat<15;
```

**新：**
```js
    /* 旧照判定：纯黑白(sat 极低) 或 泛黄/棕褐旧照(暖调且饱和度不高) → 送云端上色(colourize)。
       原先 sat<15 会把泛黄旧照误判成"彩色"而跳过上色，导致"并没有上色"。 */
    var isBW = info.sat < 24 || (info.warm > 16 && info.sat < 55);
```
> 说明：`info.warm = 平均(R−B)`，泛黄旧照 warm 明显为正；`sat<24` 兜住纯黑白，`warm>16 && sat<55` 兜住棕褐/褪色旧照，同时不会误伤现代高饱和彩色照（sat 通常 >55）。若你的测试照偏暖但其实是现代彩照，可把 55 调高到 65。

### A-2（一致性，建议改）本地兜底分支的 lastMode（第 2086 行）

**旧（约第 2086 行）：**
```js
      var lastMode=(enh0&&enh0.sat!==undefined&&enh0.sat<15)?'bw':'color';
```

**新：**
```js
      var lastMode=(enh0&&enh0.sat!==undefined&&(enh0.sat<24||(enh0.warm>16&&enh0.sat<55)))?'bw':'color';
```

---

## 修复 B：给阿拾/小忆装上"真眼睛"（真实图像识别）

> 思路：新增一个视觉接口 `VISION_API`，前端把修复后的照片 base64 发过去，拿回**对画面内容的中文描述**；任何失败都回退到原有的统计兜底文案，演示绝不崩。

### B-1 新增 VISION_API 常量（紧跟 `CHAT_API`，第 2507 行之后）

**在第 2507 行 `var CHAT_API=...` 下面插入一行：**
```js
  var VISION_API='https://4mv12nn28y773.cfc-execute.bj.baidubce.com/vision'; /* ← 换成你部署的视觉接口地址 */
```

### B-2 新增 describePhoto 函数（放在 `callAI` 函数，第 2573 行之后）

**在第 2573 行（`callAI` 结束的 `}` 之后）插入：**
```js
  /* —— 真实画面识别：把修复后的照片送到视觉接口，拿到对画面内容的中文描述 ——
     任何失败都回退到 fallback（统计兜底文案），绝不让界面卡死或显示报错。 */
  function describePhoto(dataUrl, fallback){
    return new Promise(function(resolve){
      if(!dataUrl||dataUrl.indexOf('data:')!==0){resolve(fallback);return;}
      var base64=dataUrl.split(',')[1]||'';
      if(!base64){resolve(fallback);return;}
      if(!VISION_API){resolve(fallback);return;}
      var ctrl=new AbortController();
      var tm=setTimeout(function(){ctrl.abort();},20000);
      fetch(VISION_API,{method:'POST',headers:{'Content-Type':'text/plain'},
        body:JSON.stringify({image:base64}),signal:ctrl.signal})
      .then(function(r){clearTimeout(tm);return r.json();})
      .then(function(j){clearTimeout(tm);
        var cap=(j&&(j.caption||j.text||j.reply))||'';
        resolve(cap?cap:fallback);
      })
      .catch(function(){clearTimeout(tm);resolve(fallback);});
    });
  }
```

### B-3 改 `finishR`：先显示兜底，再用真实描述升级（第 2065–2072 行）

**旧（约第 2065–2072 行）：**
```js
      setTimeout(function(){
        demoDrag(function(){
          lastStatus=Date.now();statusT=2;
          showWorkCard(restoreCaption(successInfo));
          if(wasUpload){createPhotoStoryCard(successInfo);}
          busy=false;
        });
},700);
```

**新：**
```js
      setTimeout(function(){
        demoDrag(function(){
          lastStatus=Date.now();statusT=2;
          var fallbackCap=restoreCaption(successInfo);
          showWorkCard(fallbackCap);
          busy=false;
          describePhoto(cardAfterURL, fallbackCap).then(function(realCap){
            showWorkCard('<strong>修复完成。</strong>'+realCap);
            if(wasUpload){createPhotoStoryCard(successInfo, realCap);}
          });
        });
},700);
```

### B-4 改 `createPhotoStoryCard`：接收真实描述 + 记住本张修复图（第 2686–2699 行）

**旧（约第 2686–2699 行）：**
```js
  function createPhotoStoryCard(info){
    /* 配图优先用本次修复后的图（云端/兜底均为 data: URL）；若修复未产出图片，
       退而用本次上传的原图，绝不用与本次无关的静态素材占位。 */
    function isData(u){return typeof u==='string'&&u.indexOf('data:')===0;}
    var src=isData(cardAfterURL)?cardAfterURL:(isData(cmpAfter.src)?cmpAfter.src:(isData(cardBeforeURL)?cardBeforeURL:null));
    if(!src||storyNo>=50){return;}
    storyNo++;
    var data=distillStory('这张老照片刚刚修复完成，阿拾为它重新上了颜色，画面里的人又清晰了起来。',storyNo);
    storyArchive.push(data);
    setLiveStory(data);
    newPhotoContextPending=true;
    addStoryCard(storyNo,data.title,data.text.slice(0,56)+'…',src);
    xiaoYiGreetPhoto(info);
  }
```

**新：**
```js
  function createPhotoStoryCard(info, realCap){
    /* 配图优先用本次修复后的图（云端/兜底均为 data: URL）；若修复未产出图片，
       退而用本次上传的原图，绝不用与本次无关的静态素材占位。 */
    function isData(u){return typeof u==='string'&&u.indexOf('data:')===0;}
    var src=isData(cardAfterURL)?cardAfterURL:(isData(cmpAfter.src)?cmpAfter.src:(isData(cardBeforeURL)?cardBeforeURL:null));
    if(!src||storyNo>=50){return;}
    storyNo++;
    var data=distillStory('这张老照片刚刚修复完成，阿拾为它重新上了颜色，画面里的人又清晰了起来。',storyNo);
    data.photo=src;                 /* 把本张修复图存进故事，供记忆成书使用 */
    storyArchive.push(data);
    setLiveStory(data);
    newPhotoContextPending=true;
    addStoryCard(storyNo,data.title,data.text.slice(0,56)+'…',src);
    xiaoYiGreetPhoto(info, realCap);
  }
```

### B-5 改 `xiaoYiGreetPhoto`：用真实描述开场（第 2675–2683 行）

**旧（约第 2675–2683 行）：**
```js
  function xiaoYiGreetPhoto(info){
    /* 小忆就刚修复好的新照片主动开口：开场分析 + 追问，让对话立刻围绕新照片更新 */
    var cap=restoreCaption(info||{luma:118,warm:22,sat:26,aspect:1.2});
    var plain=cap.replace(/<[^>]+>/g,'').replace('修复完成。','');
    var greet='我刚帮阿拾把这张照片修复好啦～'+plain+' 你愿意跟我讲讲，这张是在哪儿、和谁一起拍的吗？';
    appendMsg('小忆','ai',AVATAR_AI,greet);
    convMsgs.push({role:'user',content:'（用户刚上传并修复了一张新照片）'+plain});
    newPhotoContextInjected=false;
  }
```

**新：**
```js
  function xiaoYiGreetPhoto(info, realCap){
    /* 小忆就刚修复好的新照片主动开口：用「真实画面描述」开场 + 追问，让对话立刻围绕新照片更新 */
    var fallback=restoreCaption(info||{luma:118,warm:22,sat:26,aspect:1.2}).replace(/<[^>]+>/g,'').replace('修复完成。','');
    var plain=(realCap&&realCap.replace(/^修复完成。/,''))||fallback;
    var greet='我刚帮阿拾把这张照片修复好啦～'+plain+' 你愿意跟我讲讲，这张是在哪儿、和谁一起拍的吗？';
    appendMsg('小忆','ai',AVATAR_AI,greet);
    convMsgs.push({role:'user',content:'（用户刚上传并修复了一张新照片）'+plain});
    newPhotoContextInjected=false;
  }
```

> 效果：上传任何照片 → 阿拾修复台显示"修复完成。+真实画面描述"；小忆立刻用这张照片的真实内容开场追问。视觉接口挂了也不崩，自动回退到兜底文案。

### B-6（服务端）新增 `/vision` 视觉接口（CFC，模板）

> 前端已按现有 `/restore`、`/chat` 的同风格调用（POST + `Content-Type:text/plain` + JSON 响应）。请在你的 CFC 里加一个 `/vision`，接收 `{image: base64}`，返回 `{caption:"..."}`。下面是可套用的 Node 模板，**把 `callVisionModel` 里换成你接入的视觉模型**（千帆 ERNIE-ViL / Qwen-VL / 任意多模态模型均可）：

```js
// CFC 视觉接口 /vision ：接收 {image: base64}，返回 {caption: "..."}
exports.handler = async (req, res) => {
  let body = '';
  req.on('data', c => body += c);
  req.on('end', async () => {
    let imageB64 = '';
    try { imageB64 = JSON.parse(body).image || ''; } catch (e) {}
    if (!imageB64) { res.setHeader('Content-Type','application/json'); return res.end(JSON.stringify({caption:''})); }
    try {
      const caption = await callVisionModel(imageB64); // ← 换成你的视觉模型调用
      res.setHeader('Content-Type','application/json');
      res.end(JSON.stringify({caption}));
    } catch (e) {
      res.setHeader('Content-Type','application/json');
      res.end(JSON.stringify({caption:''})); // 前端会自动回退到统计兜底文案
    }
  });
};

// 示例：调用支持"图片理解"的模型（千帆 ERNIE-ViL / Qwen-VL / GPT-4V 等）。
// 用你的 API Key / SDK 调用，prompt 类似："用一句中文描述这张老照片的画面：有哪些人、什么场景、大概什么年代感。"
// 返回模型输出的纯文本字符串即可。
async function callVisionModel(b64){
  // TODO: 接入你的视觉模型，例如：
  // const r = await fetch(VISION_MODEL_URL, {method:'POST', headers:{...}, body: JSON.stringify({image:b64, prompt: PROMPT})});
  // const j = await r.json(); return j.description || j.text || '';
  return ''; // ← 未接入时返回空，前端自动回退（不影响演示）
}
```

---

## 修复 C：记忆成书用上用户的真实故事 + 给用户明确提示

> 触发条件（写进给用户看的提示里）：**完成一次访谈**（点"结束"，或聊够 6 轮自动收尾）后，`storyArchive` 里的真实口述会自动编进纪念册——无需用户额外操作。没有真实故事时，书仍显示演示版（杏花/灶火）作为占位。

### C-1（HTML）在书控件里加一条"已自动成书"提示（第 1521 行之后）

**找到第 1521 行 `<button class="flip-btn" id="bookNext" ...>›</button>`，在它后面插入：**
```html
          <div id="bookHint" style="display:none;margin:10px auto 0;max-width:540px;color:#b06a3a;font-size:13px;line-height:1.6;text-align:center;"></div>
```

### C-2（HTML，可选）把书的副标题改成带条件的说明（第 1421 行）

**旧：**
```html
        <p class="sec-sub">点击翻页，像翻开一本旧相册；也可以点「听书」，让声声把故事念给您。</p>
```
**新：**
```html
        <p class="sec-sub">点击翻页，像翻开一本旧相册；也可以点「听书」，让声声把故事念给您。在你结束和我的访谈后，你刚才讲的故事会自动编进这本册子。</p>
```

### C-3（JS）访谈口述里带上本张照片（第 2790–2793 行）

**旧（约第 2790–2793 行）：**
```js
      if(isMemoryWorthy(v)){
        storyNo++;
        var data=distillStory(v,storyNo);
        storyArchive.push(data);
        setLiveStory(data);
        addStoryCard(storyNo,data.title,data.text.slice(0,56)+'…');
      }
```

**新：**
```js
      if(isMemoryWorthy(v)){
        storyNo++;
        var data=distillStory(v,storyNo);
        data.photo=cardAfterURL||'';   /* 关联最近一次修复图，供成书配图 */
        storyArchive.push(data);
        setLiveStory(data);
        addStoryCard(storyNo,data.title,data.text.slice(0,56)+'…');
      }
```

### C-4（JS）`finishInterview` 收尾时自动成书 + 弹提示（第 2744–2751 行）

**旧（约第 2744–2751 行）：**
```js
  function finishInterview(){
    if(finished){return;}
    finished=true;
    document.getElementById('summaryLine').innerHTML='您刚刚讲述了 <b>'+storyNo+'</b> 段回忆，共 <b>'+totalChars+'</b> 字。';
    document.getElementById('summaryCard').style.display='block';
    appendMsg('小忆','ai',AVATAR_AI,'您讲得真好，文叔叔已经把这些整理成册了 →');
    updateShareCard();
  }
```

**新：**
```js
  function finishInterview(){
    if(finished){return;}
    finished=true;
    document.getElementById('summaryLine').innerHTML='您刚刚讲述了 <b>'+storyNo+'</b> 段回忆，共 <b>'+totalChars+'</b> 字。';
    document.getElementById('summaryCard').style.display='block';
    appendMsg('小忆','ai',AVATAR_AI,'您讲得真好，文叔叔已经把这些整理成册了 →');
    updateShareCard();
    buildBook();
    var hint=document.getElementById('bookHint');
    if(hint){hint.style.display='block';hint.textContent='你刚才讲的故事已经自动编进了这本纪念册 —— 往下滑到「家的记忆馆」，点「下一页」就能翻看属于你们家的篇章。';}
  }
```

### C-5（JS）新增 `buildBook()`（放在 `renderBook();` 第 2849 行之后）

**在第 2849 行 `renderBook();` 之后插入整段：**
```js
  /* ---------- 记忆成书：用用户真实口述重建章节 ---------- */
  function buildBook(){
    var book=document.getElementById('book'); if(!book){return;}
    if(!storyArchive.length){return;} /* 没有真实故事时保留演示版（杏花/灶火） */
    /* 1) 清掉演示章节与上一轮动态章节 */
    var demoPages=book.querySelectorAll('.page[data-page="2"],.page[data-page="3"]');
    for(var d=0; d<demoPages.length; d++){ demoPages[d].parentNode.removeChild(demoPages[d]); }
    var dynPages=book.querySelectorAll('.page[data-dyn]');
    for(var i=0;i<dynPages.length;i++){ dynPages[i].parentNode.removeChild(dynPages[i]); }
    /* 2) 在「终章」之前插入真实故事页（最多 8 篇，避免书太厚） */
    var endPage=book.querySelector('.page[data-page="4"]');
    var n=Math.min(storyArchive.length,8);
    for(var s=0;s<n;s++){
      var st=storyArchive[s];
      var ei=extractInfo(st.text||'');
      var place=ei.place||'咱家的老照片';
      var timeCn=ei.time||'那些年';
      var photo=st.photo||'assets/family-after-clean.jpg';
      var pg=document.createElement('div');
      pg.className='page back';
      pg.setAttribute('data-dyn','1');
      pg.innerHTML=
        '<div class="pg-tape"></div>'+
        '<div class="pg-split">'+
          '<div class="pg-photo-left"><div class="photo-frame tilt-l"><img loading="lazy" class="story-art" src="'+photo+'">'+
            '<div class="tape"></div><div class="tape tape-b"></div></div>'+
            '<div class="photo-caption">'+place+'</div></div>'+
          '<div class="pg-story-right"><div class="pg-kicker">第一卷 · 第'+(s+1)+'章</div>'+
            '<h2 class="pg-title">'+ (st.title||('一段回忆 · 第'+(s+1)+'篇')) +'</h2>'+
            '<div class="pg-body-vert">'+ (st.text||'') +'</div>'+
            '<div class="pg-end" style="margin-top:14px">—— 家人的口述</div></div>'+
        '</div>'+
        '<span class="pg-year">'+timeCn+'</span>'+
        '<span class="pg-number">第'+(s+1)+'章 · '+(s+2)+'</span>';
      book.insertBefore(pg, endPage);
    }
    /* 3) 终章计数改为真实数据 */
    var endBody=book.querySelector('.page[data-page="4"] .pg-body');
    if(endBody){
      endBody.innerHTML='这本书收录了 <b>'+storyArchive.length+'</b> 段家人的口述、<b>'+storyArchive.length+'</b> 张修复后的老照片。<br><br>它不厚重，只是替我们每个人，把"还来得及"这四个字，轻轻按在了纸上。';
    }
    /* 4) 重新统计页码并刷新翻页 */
    pages=book.querySelectorAll('#book .page');
    total=pages.length;
    labels=['封面','序'];
    for(var k=0;k<n;k++){ labels.push('第'+(k+1)+'章'); }
    labels.push('终章');
    cur=Math.min(cur,total-1);
    renderBook();
    /* 5) 听书按钮 / 磁带标签改为第一篇真实故事 */
    if(storyArchive.length){
      var first=storyArchive[0];
      var lb=document.getElementById('listenBtn');
      if(lb){ lb.innerHTML='<span class="audio-bar"><i></i><i></i><i></i></span>听书 · '+(first.title||'家人的故事'); }
      var tl=document.querySelector('.tp-label-title');
      if(tl){ tl.textContent=(first.title||'家人的故事'); }
    }
  }
```

> 注意：`pages / total / labels / cur` 是 renderBook 上方已有的 `var`（第 2831–2836 行），`buildBook` 里直接重新赋值即可，`renderBook` 会读到新值。

---

## 部署清单（协助方按顺序做）

1. **替换 A-1 / A-2**（旧照上色判定）。
2. **替换 B-1 ~ B-5**（视觉接口 + 真描述开场）；同时部署 **B-6** 的 `/vision` CFC（未接入时返回空，前端自动回退，不影响演示）。
3. **替换 C-1 ~ C-5**（真实故事成书 + 用户提示）。
4. 把第十四阶段补生成的 **`deliver/` 7 张对齐图** 覆盖到 `assets/`（family 对齐修复）。
5. 重新发布 dumate 链接，把链接发回我做**提交前最终检查**。

---

## 提交前最终检查（我来跑）

协助方发回 dumate 链接后，我会逐项核验：
- [ ] 上传泛黄旧照 → 走 bw 链、`colourize` 生效、肉眼可见上色。
- [ ] 阿拾修复台文案 = "修复完成。+ 真实画面描述"（不再是"一群人"）；小忆用真实内容开场追问。
- [ ] 完成访谈 → 书自动换成用户真实故事章节（非杏花/灶火）、配图为本次修复照、终章计数变真实数字、出现"已自动成书"提示。
- [ ] 视觉接口挂掉时 → 自动回退兜底文案，演示不崩。
- [ ] 三张示例对比图逐帧对齐（dx=0,dy=0，family 不再"拉伸对不上"）。
- [ ] 全站扫描：无任何 `workbuddy / codebuddy / hy3 / anthropic / claude` 签名泄露。
