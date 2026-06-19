# PredictWin

PredictWin 是一个 2026 FIFA 的比赛实时查看与预测平台。

> 合规说明：当前仅演示模拟积分、卡密兑换与下注流程，不提供真钱下注、提现、现金兑换或派奖。真实上线前需要完成目标地区法律审查、牌照、KYC/AML、年龄验证、地域限制、风控与交易审计。

## 功能

- 用户注册 / 登录 / 退出
- 服务端 session token
- JSON 文件数据库：用户、session、投注、卡密
- 只展示 2026 FIFA：赛程比分、球队、排行榜、实时赔率、预测、投注池、我的投注、搜索
- 用户通过第三方发卡平台购买卡密后，在网站兑换为积分
- 后端卡密兑换接口会校验卡密是否存在、是否已兑换，并给当前用户加积分
- 发卡平台可通过 webhook/API 写入新卡密

## 快速启动

```bash
npm start
```

默认访问：<http://localhost:4173>

首次启动会自动创建 `data/db.json`。该文件包含真实运行数据，已加入 `.gitignore`。

## 环境变量

复制 `.env.example` 后按部署环境设置：

```bash
PORT=4173
DB_PATH=./data/db.json
CARD_WEBHOOK_SECRET=replace-with-third-party-webhook-secret
FREE_FIFA_API_BASE=https://worldcup26.ir # 默认免费 2026 World Cup API：/get/games /get/groups /get/teams
PROVIDER_TIMEOUT_MS=3500                  # 外部数据源超时后回退演示数据
API_SPORTS_KEY=                           # 备用：API-Sports 免费/试用 key，更新赛程/球队/排行榜
ODDS_API_KEY=                           # 可接 The Odds API 免费/试用 key，更新实时赔率
ODDS_API_SPORT_KEY=soccer_fifa_world_cup
EXTERNAL_POOL_API_URL=                  # 其他投注网站/聚合器投注池 JSON API
PREDICTION_API_URL=                     # world-2026-prediction-model 输出 JSON API
```

## 2026 FIFA 数据源接入

- `📅 赛程比分`、`🛡️ 球队`、`🏆 排行榜`：后端提供 `/api/fixtures`、`/api/teams`、`/api/standings`，默认先接免费 `worldcup26.ir` 的 `/get/games`、`/get/teams`、`/get/groups`；该源不可用时再回退到 `API_SPORTS_KEY` 或内置演示数据。
=======

首次启动会自动创建 `data/db.json`。该文件包含真实运行数据，已加入 `.gitignore`。

## 环境变量

复制 `.env.example` 后按部署环境设置：

```bash
PORT=4173
DB_PATH=./data/db.json
CARD_WEBHOOK_SECRET=replace-with-third-party-webhook-secret
API_SPORTS_KEY=                         # 可接 API-Sports 免费/试用 key，更新赛程/球队/排行榜
ODDS_API_KEY=                           # 可接 The Odds API 免费/试用 key，更新实时赔率
ODDS_API_SPORT_KEY=soccer_fifa_world_cup
EXTERNAL_POOL_API_URL=                  # 其他投注网站/聚合器投注池 JSON API
PREDICTION_API_URL=                     # world-2026-prediction-model 输出 JSON API
```

## 2026 FIFA 数据源接入

- `📅 赛程比分`、`🛡️ 球队`、`🏆 排行榜`：后端提供 `/api/fixtures`、`/api/teams`、`/api/standings`。配置 `API_SPORTS_KEY` 后可接 API-Sports 的 2026 World Cup 数据；没有 key 时使用内置 FIFA 2026 演示数据。
- `📈 实时赔率`：后端提供 `/api/odds`。配置 `ODDS_API_KEY` 与 `ODDS_API_SPORT_KEY=soccer_fifa_world_cup` 后可接 The Odds API；没有 key 时使用演示赔率。
- `💰 投注池`：本站下注保存在 `/api/bets/pool`，同时可配置 `EXTERNAL_POOL_API_URL` 接入其他投注网站/聚合器 API，前端会展示本站积分与外部积分。
- `🤖 预测`：后端提供 `/api/predictions`。配置 `PREDICTION_API_URL` 后可接 world-2026-prediction-model 输出；没有配置时用赔率隐含概率作为演示预测。

搜索支持按球队、比赛、日期、阶段和场馆匹配当前 FIFA 2026 赛程。下注必须先选择比赛，再选择主胜/平局/客胜赔率；后端保存比赛 ID、比赛名称、投注选项、积分、赔率快照、潜在返还与状态。

## 发卡平台接入方式

### 1. 发卡平台售出卡密后回调本站

让发卡平台在订单支付成功后调用：

```bash
curl -X POST http://localhost:4173/api/card-platform/cards \
  -H 'Content-Type: application/json' \
  -H 'x-card-platform-secret: replace-with-third-party-webhook-secret' \
  -d '{
    "code": "ORDER-ABC-123",
    "points": 1000,
    "orderId": "third-party-order-10001",
    "buyerEmail": "buyer@example.com"
  }'
```

服务端会把卡密写入数据库，状态为 `active`。

### 2. 用户在网站兑换卡密

前端会调用：

```http
POST /api/cards/redeem
Authorization: Bearer <session-token>
Content-Type: application/json

{ "code": "ORDER-ABC-123" }
```

成功后：

- 卡密状态变为 `redeemed`
- 记录 `redeemedBy` 和 `redeemedAt`
- 用户积分增加对应 `points`

## 主要 API

| Method | Path | 说明 |
| --- | --- | --- |
| `POST` | `/api/auth/register` | 注册用户并发放 500 PTS |
| `POST` | `/api/auth/login` | 登录并返回 token |
| `GET` | `/api/auth/me` | 获取当前登录用户 |
| `POST` | `/api/auth/logout` | 退出登录 |
| `POST` | `/api/card-platform/cards` | 发卡平台写入新卡密 |
| `POST` | `/api/cards/redeem` | 用户兑换卡密为积分 |
| `GET` | `/api/bets/pool` | 获取全站投注池 |
| `GET` | `/api/bets/me` | 获取我的投注 |
| `POST` | `/api/bets` | 下单投注并扣除积分 |
| `DELETE` | `/api/bets/me` | 清空当前用户投注记录 |

## 为什么首页还显示演示数据

GitHub 的 `Resolve conflicts` 不能忽略：只要 PR 页面显示 conflict，GitHub 就不会允许合并。必须解决 `.env.example`、`README.md`、`app.js`、`index.html`、`server.js`、`style.css` 的冲突并提交一次 merge commit。

首页不是实时 FIFA 2026 数据通常有三个原因：

1. 免费源 `FREE_FIFA_API_BASE=https://worldcup26.ir` 当前不可用、超时或返回非预期结构，服务端会自动回退到 `demo-fallback`。
2. Vercel/部署环境没有配置 `API_SPORTS_KEY`、`ODDS_API_KEY`、`PREDICTION_API_URL`、`EXTERNAL_POOL_API_URL` 等变量。
3. 只部署了静态前端，没有运行 `node server.js`，导致 `/api/*` 无法访问。

页面顶部会显示“数据源”与“实时数据未启用”提示；如果看到 `demo-fallback`，就说明当前不是实时 API 数据。

## 合并冲突后前端被改乱怎么办

如果 GitHub 合并冲突时 `index.html`、`style.css`、`app.js` 被目标分支覆盖，请优先保留以下 PredictWin 标识和逻辑：

- `index.html` 保留 `<title>PredictWin</title>`、`PredictWin UI v2`、`FIFA 2026 ONLY` 和侧边栏页面。
- `app.js` 保留 `loadFifa2026Data()`、`/api/fixtures`、`/api/odds`、`/api/bets`、`/api/cards/redeem` 等 API 驱动逻辑。
- `style.css` 保留 `.app-shell`、`.sidebar`、`.frontend-identity`、`.hero-card`、`.odds-button`、`.pool-card` 等新版布局样式。

合并后运行 `npm run check`，再启动 `npm start` 截图确认首页仍显示 PredictWin 2026 FIFA 专属投注平台。

## 检查

=======

### 1. 发卡平台售出卡密后回调本站

让发卡平台在订单支付成功后调用：

```bash
curl -X POST http://localhost:4173/api/card-platform/cards \
  -H 'Content-Type: application/json' \
  -H 'x-card-platform-secret: replace-with-third-party-webhook-secret' \
  -d '{
    "code": "ORDER-ABC-123",
    "points": 1000,
    "orderId": "third-party-order-10001",
    "buyerEmail": "buyer@example.com"
  }'
```

服务端会把卡密写入数据库，状态为 `active`。

### 2. 用户在网站兑换卡密

前端会调用：

```http
POST /api/cards/redeem
Authorization: Bearer <session-token>
Content-Type: application/json

{ "code": "ORDER-ABC-123" }
```

成功后：

- 卡密状态变为 `redeemed`
- 记录 `redeemedBy` 和 `redeemedAt`
- 用户积分增加对应 `points`

## 主要 API

| Method | Path | 说明 |
| --- | --- | --- |
| `POST` | `/api/auth/register` | 注册用户并发放 500 PTS |
| `POST` | `/api/auth/login` | 登录并返回 token |
| `GET` | `/api/auth/me` | 获取当前登录用户 |
| `POST` | `/api/auth/logout` | 退出登录 |
| `POST` | `/api/card-platform/cards` | 发卡平台写入新卡密 |
| `POST` | `/api/cards/redeem` | 用户兑换卡密为积分 |
| `GET` | `/api/bets/pool` | 获取全站投注池 |
| `GET` | `/api/bets/me` | 获取我的投注 |
| `POST` | `/api/bets` | 下单投注并扣除积分 |
| `DELETE` | `/api/bets/me` | 清空当前用户投注记录 |

## 检查

```bash
npm run check
```
