# Word PWA

离线可用的背单词/短语练习 PWA，基于 React + TypeScript + Ant Design + Vite 构建，并满足 PRD 中的离线、错题回流、统计等要求。

## 开发与运行

```bash
npm install
npm run dev
# 打包
npm run build
```

构建后生成的 PWA 会自动注册 Service Worker，支持 App Shell 预缓存与 raw.githubusercontent.com 的数据源网络优先策略。

## 使用指南

1. 首次进入会弹出数据源配置弹窗，输入 raw.githubusercontent.com 的 JSON 链接。
2. 验证成功后进入语言选择 → 单元选择 → 练习。
3. 每次进入会尝试网络请求更新数据，失败则读取上次缓存的数据。
4. 练习支持错题回流与（question, keywordIndex）粒度的“掌握”统计；完成单元自动记录打卡数据。
5. 统计页包含概览卡片、日历热力图、最近记录；设置页可修改数据源、清空进度/统计/缓存。

## 目录结构

- `src/domain`：类型定义、出题/队列逻辑。
- `src/services`：数据源拉取与校验、IndexedDB 缓存、进度与统计存取。
- `src/pages`：语言/单元选择、练习、统计、设置等页面。
- `src/components`：数据源配置弹窗等通用组件。
- `public`：PWA manifest 与图标。
