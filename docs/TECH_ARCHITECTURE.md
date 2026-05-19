# 技术架构文档

## 技术栈

- 微信原生小程序
- WXML
- WXSS
- JavaScript
- 微信云开发
- 云函数 Node.js
- 云数据库
- 大模型 API

## 页面结构

pages/
  index/      首页
  shake/      摇卦页
  result/     结果页
  history/    历史记录页
  detail/     详情页

## 核心模块

utils/
  hexagram.js

data/
  hexagrams.json

cloudfunctions/
  analyzeHexagram/
  saveRecord/
  getHistory/
  getRecordDetail/

## 数据流程

用户输入问题
→ 点击开始摇卦
→ 前端生成六爻
→ utils/hexagram.js 计算本卦、变卦、动爻
→ 云函数调用 AI
→ 返回结构化解读
→ 保存到云数据库
→ 前端展示结果

## 安全要求

1. API Key 不能放在前端。
2. AI 调用必须放在云函数。
3. 历史记录按 openid 区分用户。
4. 用户输入需要做基础校验。
5. AI 调用失败时要有兜底文案。