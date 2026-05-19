# 六爻问象 H5

这是独立的手机网页版 H5 目录，不修改现有微信小程序代码结构。

## 目录

- `public/`：手机端页面、样式、交互脚本和静态卦象数据。
- `server/chat.js`：后端 `/api/chat` 共用逻辑，读取 `DEEPSEEK_API_KEY` 并请求 DeepSeek。
- `server/local.js`：本地静态站点与 API 服务。
- `api/chat.js`：Vercel Serverless Function 入口。
- `netlify/functions/chat.js`：Netlify Function 入口。
- `netlify.toml`：Netlify 发布目录、函数目录和 `/api/chat` 转发。
- `tests/`：H5 排盘和 API 兜底测试。

## 本地运行

```bash
cd web/h5
npm run dev
```

默认会从 `http://localhost:5175` 启动；如果端口被占用，会自动尝试下一个端口。

配置 DeepSeek：

```bash
# macOS / Linux
export DEEPSEEK_API_KEY="你的 DeepSeek API Key"
npm run dev

# Windows PowerShell
$env:DEEPSEEK_API_KEY="你的 DeepSeek API Key"
npm run dev
```

可选环境变量：

- `DEEPSEEK_MODEL`：默认 `deepseek-chat`
- `DEEPSEEK_API_URL`：默认 `https://api.deepseek.com/chat/completions`
- `PORT`：本地端口，默认 `5175`

## 测试

```bash
cd web/h5
npm test
```

测试覆盖：

- 六爻顺序：数据自下而上，展示自上而下。
- 本卦、变卦、动爻计算。
- 无动爻时本卦和变卦一致。
- 多动爻时所有动爻正确变化。
- `/api/chat` 未配置 `DEEPSEEK_API_KEY` 时仍由后端完成排盘并返回免责声明兜底。

## 部署到 Vercel

1. 在 Vercel 导入当前仓库。
2. 将项目 Root Directory 设置为 `web/h5`。
3. Build Command 留空或设置为 `npm test` 后再发布；Output Directory 留空。
4. 在 Environment Variables 中添加 `DEEPSEEK_API_KEY`。
5. 部署后访问站点域名，前端会请求同源 `/api/chat`。

## 部署到 Netlify

1. 在 Netlify 导入当前仓库。
2. Base directory 设置为 `web/h5`。
3. Build command 可留空，或设置为 `npm test`。
4. Publish directory 设置为 `public`。
5. Functions directory 使用 `netlify/functions`。
6. 在 Environment variables 中添加 `DEEPSEEK_API_KEY`。
7. `netlify.toml` 已把 `/api/chat` 转发到 Netlify Function。

## 安全与边界

- 前端只请求自己的 `/api/chat`，不直接请求 DeepSeek 官方接口。
- `DEEPSEEK_API_KEY` 只在后端读取，不写入前端文件。
- AI 解读只使用后端程序计算出的本卦、变卦、动爻和六爻结构。
- 所有 AI 解读都保留“仅供传统文化学习与自我反思参考”免责声明。
- H5 历史记录保存在当前浏览器 `localStorage`，不影响微信小程序云数据库。
