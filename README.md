# 🏆 2026 FIFA 世界盃去中心化積分模擬投注站

[![License: MIT](https://shields.io)](https://opensource.org)
[![Platform: Vercel](https://shields.io)](https://vercel.com)
[![Data Source: API-Sports](https://shields.io)](https://api-sports.io)

這是一個專為 2026 FIFA 世界盃設計的**高質感即時賽程比分牆與模擬競猜系統**。本專案採用純前端無伺服器（Serverless）架構，完美整合 **API-Sports 官方原生小部件**，並創新型地引入**「卡密驗證機制」**。用戶可透過第三方發卡平台取得卡密並兌換為模擬積分進行下注，成功將金流審查、法律風險與前端託管進行完美切割。

> ⚠️ **合規與免責聲明**：本專案架構完全基於學術研究與技術分享。網頁本身為純前端實作，不涉及、不經手、亦不提供任何法定貨幣或加密貨幣之線上直接儲值與非法博弈管道。

---

## ✨ 核心功能特性

- 🔴 **即時賽程看板**：同步 API-Sports 官方數據，世界盃賽事秒級現場即時更新，每 15 秒全自動重新整理。
- 🎨 **原廠 UI 設計**：頁眉比照 API-Sports 官方後台高質感深色系風格設計，搭配世界盃經典卡達紅（Maroon）與奢華金（Gold）主題。
- 🔑 **卡密積分系統**：內建「卡號密碼」儲值模組，與外部自動發卡網對接，自動核對並轉換為本地投注點數。
- 💾 **本地狀態持久化**：使用瀏覽器 `LocalStorage` 技術，用戶無需註冊與登入即可安全保存個人積分餘額。
- 📱 **響應式斷點設計**：完美支援 Mobile 手機端與 Desktop 電腦端，雙欄 Grid 佈局自動適應螢幕尺寸。

---

## 🛠️ 技術棧選型

- **前端託管**：Vercel (免費個人方案，自帶全球 CDN 結點)
- **體育數據**：API-Sports (Football Widgets v3 引擎)
- **卡密後端**：Google Apps Script (GAS) API 雲端無伺服器微服務
- **資料庫**：Google Sheets (雲端試算表充當輕量級卡密資料庫)

---

## 📐 系統運行架構
