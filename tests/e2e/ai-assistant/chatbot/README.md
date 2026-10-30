# Chatbot

對應 `/chatbot` 的對話、回覆與錯誤狀態測試。

`conversation-history.spec.ts` 使用實際聊天服務，不限制 AI 回答內容；案例只要求回應為非空字串，
並確認該回應寫入後端 DB、未寫入 Local Storage，且重新整理後仍能載入相同內容。
