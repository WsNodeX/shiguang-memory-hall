# 拾光 · 真·AI 修复接入说明（正式版：搭子链接可提交）

## 架构（为什么这么设计）
比赛要求提交 **百度搭子发布的作品链接**（dumate.cn/artifacts/xxx），那是纯静态托管。
实测百度图像接口**不允许浏览器跨域直接调**（无 CORS 头），且 Key 也不能暴露在前端。
所以：搭子静态页 → 调「百度云函数 CFC」代理 → CFC 拿 Key 调百度图像接口 → 返回修复图。
断网/接口失败 → 前端自动 canvas 滤镜兜底，永不卡死。

## 全部步骤（你自己动手，约 20 分钟）

### 第 1 步：拿百度 API Key
1. https://cloud.baidu.com → 图像增强与特效控制台 → 实名认证（自动领免费额度：每项 1000 次）
2. 创建应用 → 复制 `API Key` 和 `Secret Key`

### 第 2 步：部署云函数（同一个百度账号，全程网页点）
1. 控制台 → 云函数计算 CFC → 创建函数
   - 运行时：**Node.js 18+**，模板：空白函数（event）
2. 把本目录 `cfc-index.js` 的全部代码粘贴进在线编辑器 → 保存
3. 函数「配置」→ 环境变量，添加：
   - `BAIDU_API_KEY` = 第1步的 API Key
   - `BAIDU_SECRET_KEY` = 第1步的 Secret Key
4. 「配置」→ 触发器 → 新增触发器：
   - HTTP 触发器，URL 路径 `/restore`，方法 **POST**，身份验证：**不验证**
5. 保存后得到公网 URL（形如 `https://xxx.cfc-execute.bj.baidubce.com/restore`）

### 第 3 步：把 URL 填进前端
- 打开拾光的 `index.html`，搜 `RESTORE_API`，把 URL 填进引号里：
  `var RESTORE_API='https://xxx.cfc-execute.bj.baidubce.com/restore';`
- （或者把 URL 发我，我帮你填）

### 第 4 步：发布
- 把最终版 `index.html` 交给做作品的人，在百度搭子里用这个文件生成/更新作品 → 点「已发布」
- 复制 `dumate.cn/artifacts/xxx` 链接 → 提交参赛

### 第 5 步：验收清单
- [ ] 自己传一张黑白老照片 →「修复后」真的变成彩色高清（真 API）
- [ ] 手机开飞行模式再传一张 → 显示"（离线模式）"，滤镜兜底也不卡死
- [ ] 滑块线能拖（鼠标+手机触摸）
- [ ] 搭子发布链接在手机浏览器打开正常

## 本地开发自测（可选）
```bash
cd 本目录 && node server.js   # 打开 http://localhost:8787
```
RESTORE_API 留空时前端走本地服务（用 config.json 里的 Key）。

## 成本
- 百度图像接口：实名送免费额度（每项 1000 次），比赛用量用不完，0 元
- CFC 云函数：有免费额度，这个调用量 0 元
