/* =========================================================================
 * 「小忆」真 AI 访谈模块 —— 替换你访谈室里原来"静态关键词"的那段逻辑
 * 用法：把下面整段贴进 index.html 的 <script>（或替换原有 interview 相关代码）。
 * 需要改的只有最上面的 3 个 id，换成你页面里实际的：
 *   CHAT_BOX  —— 消息列表容器
 *   CHAT_INPUT—— 输入框
 *   SEND_BTN  —— 发送按钮
 *   CHAT_API  —— 你的 CFC 地址 + '/chat'（与 /restore 同一个域名，只是 action 不同）
 * 其余不用动。
 * ========================================================================= */
(function () {
  const CHAT_BOX   = document.getElementById('chatBox');     // ← 换成你的容器 id
  const CHAT_INPUT = document.getElementById('chatInput');   // ← 换成你的输入框 id
  const SEND_BTN   = document.getElementById('sendBtn');     // ← 换成你的发送按钮 id
  const CHAT_API   = 'https://4mv12nn28y773.cfc-execute.bj.baidubce.com/chat'; // ← 换成你的 CFC 地址

  // —— 小忆人设（系统提示词，OPC 智能体核心） ——
  const SYSTEM = `你是「拾光·家的记忆馆」里的访谈员智能体，名字叫"小忆"。你是一个温柔、耐心、像邻家小妹一样的AI，专门陪长辈和家庭成员聊老照片背后的故事，做"口述史"采集。

你的任务：
1. 用口语化、亲切的中文回应，每次 2~4 句话，适合聊天气泡展示，不要长篇大论。
2. 当用户发来一张照片或讲起某个人/某件事，先共情、再追问一个具体的、能勾出画面感的问题（比如：当时是在哪儿拍的？照片里左边那个人是谁？那天发生了什么难忘的事？）。
3. 识别用户话语里的情绪与主题，在内心打标签（#遗忘 #第一次 #难忘 #遗憾 #辛苦 #收尾），但不要在气泡里直接输出标签。
4. 适时自然地引导跨智能体协作：
   - 聊到一张旧照，可以说"要不要让『阿拾』帮你把这张照片修复上色？"
   - 故事讲得动人时，可以说"这段我记下了，可以交给『文叔叔』编进咱家的纪念册。"
   - 需要朗读/留声时，提示"想不想用『声声』把这段话读出来，做成声音明信片？"
5. 当用户说"就到这儿吧/没什么要说的了"等收尾信号，温柔总结并鼓励：把故事交给文叔叔成书。
6. 如果用户说记不清/忘了，温柔安抚："记不清也没关系，能想起多少算多少，我帮你记着。"
7. 绝不编造用户没说过的事实；不知道就问。

记住：你是"智能体"，不是固定话术机器人。根据用户真实输入动态回应，让对话自然流淌。`;

  let convMsgs = [{ role: 'system', content: SYSTEM }];

  /* ---------- 兜底：CFC 不可用时，用轻量关键词引擎，保证演示不崩 ---------- */
  const KW = {
    isForget: ['记不清','忘了','不记得','想不起来','记不得','模糊'],
    isFirst:  ['第一次','头一回','刚','一开始','起初'],
    isUnforget:['难忘','记得最清','一直记得','印象最深','忘不了'],
    isRegret: ['遗憾','后悔','可惜','亏欠','对不起'],
    isHard:   ['辛苦','不容易','艰难','累','难','苦'],
    isEnd:    ['就到这儿','没了','说完了','没什么','结束','先这样','拜拜']
  };
  const EMPATHY = {
    isForget: '记不清也没关系，能想起多少算多少，我帮你记着～',
    isFirst:  '第一次总是最特别的，那时候你心里在想什么呢？',
    isUnforget:'听得出来这件事对你很重要，能再多讲讲当时的细节吗？',
    isRegret: '心里有遗憾的人，往往是最重感情的人。后来这件事怎么了呢？',
    isHard:   '那些年真不容易，你是怎么一步步扛过来的？',
    isEnd:    '今天聊的这些，我都记下了。要不要让文叔叔把它们编进咱家的纪念册？'
  };
  const FALLBACK_Q = [
    '照片里这个人，当时是在什么情形下被拍下来的呀？',
    '那天除了拍照，还发生了什么让你记得的事吗？',
    '后来这个人/这件事，是怎么走到今天的呢？'
  ];
  function keywordReply(text) {
    for (const k in KW) {
      if (KW[k].some(w => text.includes(w))) return EMPATHY[k];
    }
    return FALLBACK_Q[Math.floor(Math.random() * FALLBACK_Q.length)];
  }

  /* ---------- 渲染 ---------- */
  function bubble(role, text) {
    const d = document.createElement('div');
    d.className = 'bubble ' + (role === 'user' ? 'bubble-user' : 'bubble-ai');
    d.textContent = text;
    CHAT_BOX.appendChild(d);
    CHAT_BOX.scrollTop = CHAT_BOX.scrollHeight;
    return d;
  }
  function loading() {
    const d = document.createElement('div');
    d.className = 'bubble bubble-ai';
    d.textContent = '小忆正在听…';
    d.dataset.loading = '1';
    CHAT_BOX.appendChild(d);
    CHAT_BOX.scrollTop = CHAT_BOX.scrollHeight;
    return d;
  }

  /* ---------- 调用真 AI ---------- */
  async function callAI() {
    const r = await fetch(CHAT_API, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },   // 关键：用 text/plain，避开 OPTIONS 预检
      body: JSON.stringify({ action: 'chat', messages: convMsgs })
    });
    const j = await r.json();
    if (j.error) throw new Error(j.error);
    return j.reply;
  }

  /* ---------- 发送 ---------- */
  async function send() {
    const text = (CHAT_INPUT.value || '').trim();
    if (!text) return;
    CHAT_INPUT.value = '';
    bubble('user', text);
    convMsgs.push({ role: 'user', content: text });

    const ld = loading();
    let reply;
    try {
      reply = await callAI();
    } catch (e) {
      // 出错就走兜底关键词，保证对话不断
      reply = keywordReply(text) + '（小忆暂时离线，先用关键词陪你聊）';
    }
    ld.remove();
    convMsgs.push({ role: 'assistant', content: reply });
    bubble('ai', reply);
  }

  SEND_BTN.addEventListener('click', send);
  CHAT_INPUT.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });

  // 开场白
  bubble('ai', '我是小忆～你发一张老照片，或者跟我说说照片里的人吧，我陪你慢慢聊。');
})();
