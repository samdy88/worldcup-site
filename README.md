# FIFA 2026 Betting Arena

这是一个 FIFA 2026 投注网站原型，已经从纯静态页面升级为“前端 + Node 后端 + JSON 数据库”的可运行演示。

> 合规说明：当前仅演示模拟积分、卡密兑换与下注流程，不提供真钱下注、提现、现金兑换或派奖。真实上线前需要完成目标地区法律审查、牌照、KYC/AML、年龄验证、地域限制、风控与交易审计。

## 功能

- 用户注册 / 登录 / 退出
- 服务端 session token
- JSON 文件数据库：用户、session、投注、卡密
- 赛程、比分、球队、排行榜、实时赔率、预测、投注池、我的投注、搜索
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
```

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

## 检查

```bash
npm run check
```
