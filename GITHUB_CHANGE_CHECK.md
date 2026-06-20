# GitHub change check for PredictWin Event Center

如果你在 GitHub 上没看到修改，请先确认你看的分支/PR 包含最新提交，而不是旧的 `main` 页面。

## 必须能在 GitHub 搜到的新版标识

在仓库页面或 PR 的 Files changed 页面搜索下面任意文本：

- `WORLD WIN 26 · 免费投注 · Event Center v3`
- `WC2026 Top Events · 新版首页已生效`
- `bet-slip-card`
- `/api/outrights`
- `/api/top-scorers`

## 修改位置

- `index.html`：新版首页首屏、Top Events、冠军长期投注、前 10 射手榜、右侧投注单。
- `app.js`：Top Events 渲染、日期切换、点击赔率加入投注单、确认下注。
- `server.js`：新增 `/api/outrights` 和 `/api/top-scorers`。
- `style.css`：新版 Event Center、赛事卡、投注单、长期投注和射手榜样式。
- `.env.example`：新增 `OUTRIGHTS_API_URL` 和 `TOP_SCORERS_API_URL`。

## 如果 GitHub 仍然看不到

1. 确认 PR 已经创建，并且你打开的是 PR 的 **Files changed** 页面。
2. 确认 GitHub 页面顶部的分支不是旧的 `main` commit。
3. 如果 Render 页面没变化，去 Render 点 **Manual Deploy → Clear build cache & deploy**。
4. 重新部署后，日志里的 `Checking out commit ...` 必须是包含这些文字的最新 commit。
