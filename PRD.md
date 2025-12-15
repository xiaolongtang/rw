# Word PWA（背单词/短语练习 PWA）标准需求文档

## 1. 项目概述

### 1.1 项目名称

Word PWA（背单词/短语练习 PWA）

### 1.2 目标

* 提供一个 **可离线使用** 的背单词/短语练习应用（PWA）。
* 数据来源为用户提供的 **GitHub Raw JSON 链接**（首次配置）。
* 基于语言 → 单元（Unit）→ 练习 的学习路径。
* 练习逻辑具备错题回流、直到完全掌握单元后才算通过。
* 提供美观、优雅、现代的 UI（React + Ant Design），并提供打卡/统计页。

### 1.3 技术栈要求

* **PWA**：离线可用、可安装、App Shell 缓存、数据缓存策略清晰。
* **React（较新稳定版）**：React 18+（以实现时的最新稳定版本为准）。
* **Ant Design（较新版本）**：Ant Design 5+。
* **TypeScript**：强制使用，保证类型与可维护性。
* 代码风格：整洁、模块化、可测试、低耦合。

---

## 2. 数据源与数据格式

### 2.1 数据源

* 用户首次进入需要配置一个 **raw github JSON 地址**（例如 `https://raw.githubusercontent.com/.../xxx.json`）。
* 每次进入 App 都会尝试请求一次该链接：

  * **在线**：拉取最新 JSON，并覆盖本地缓存。
  * **离线/请求失败**：使用上一次成功请求的缓存数据进入流程。
* 仅当本地没有任何缓存数据时，才强制要求用户必须填写链接并成功获取一次数据。

### 2.2 JSON 格式（示例）

```json
{
  "language": ["de"],
  "de": {
    "keyboard": "German",
    "Unit": [
      {
        "unit1": [
          {
            "statement": "Kaffee oder Tee",
            "translate": "咖啡还是茶",
            "keywords": ["Tee", "oder"]
          }
        ]
      }
    ]
  }
}
```

### 2.3 解析规则（强约束）

* 根节点字段：

  * `language: string[]`：可选择语言列表（语言代码）。
  * 对每个语言代码（如 `de`），存在一个对象：

    * `keyboard: string`：键盘/语言提示信息（用于输入框的语言/键盘优化）。
    * `Unit: Array<Record<string, Question[]>>`：单元列表，每个元素是 `{unitName: Question[]}`。
* `Question`：

  * `statement: string`：原句/原短语（可作为答案展示/复习用）。
  * `translate: string`：题面展示文本（题干）。
  * `keywords: string[]`：需要背的关键词数组（每次只隐藏其中一个）。

---

## 3. 核心用户流程（信息架构）

### 3.1 页面与路由

1. **启动/加载页**（Splash/Loading）
2. **数据源配置弹窗**（首次或无缓存时强制出现）
3. **语言选择页**（Language Select）
4. **单元选择页**（Unit Select）
5. **练习页**（Quiz）
6. **统计页**（Stats）
7. （可选）设置页（可修改数据源链接、清缓存等）

### 3.2 首次进入流程

* 若本地无缓存数据：

  1. 弹出「配置数据源」Modal（不可关闭或只能“退出/刷新”）
  2. 用户输入 raw github URL
  3. 点击“验证并加载”
  4. 成功后缓存 JSON + 缓存 URL，进入语言选择页

### 3.3 非首次进入流程

* 进入应用：

  * 自动网络请求一次 URL
  * 成功则更新缓存并继续
  * 失败（离线/超时/非 200）则读取缓存并继续
* 如果用户手动进入设置页更换 URL：按首次逻辑重新验证并写入缓存。

---

## 4. 离线与缓存策略（PWA 关键）

### 4.1 缓存内容

* `datasetUrl`：用户配置的 raw github URL
* `datasetJson`：最后一次成功请求的 JSON 全量
* `datasetMeta`：

  * `lastSuccessAt`：最后成功拉取时间戳
  * `etag/lastModified`（可选）：用于优化请求（非必需）

### 4.2 数据获取策略（Network First + Cache Fallback）

* App 启动时调用 `DataService.loadDataset()`：

  1. 若存在 `datasetUrl`：

     * 发起请求（建议有超时，如 6~10 秒）
     * 成功：写入 `datasetJson` 缓存并返回
     * 失败：若有 `datasetJson`，返回缓存；否则进入“必须配置 URL”的状态
  2. 若不存在 `datasetUrl`：

     * 若有 `datasetJson`（理论不应发生，但容错）：直接用缓存
     * 否则强制弹窗配置

### 4.3 PWA App Shell 离线

* 静态资源（HTML/JS/CSS/图标）必须可离线打开。
* Service Worker 负责 precache App Shell。
* 数据 JSON 不要求由 SW 直接缓存（可选），但**必须**由应用层持久化（IndexedDB）保证离线可读。

### 4.4 建议存储介质

* **IndexedDB**（推荐）用于 `datasetJson`、练习进度、统计数据。
* 可用 `idb` / `localforage` 封装（实现方自选，但需稳定可靠）。

---

## 5. 练习（Quiz）需求规格

### 5.1 进入练习页前置条件

* 用户已选择 language 与 unit。
* 根据数据结构获取题目数组 `questions: Question[]`。

### 5.2 出题与展示规则

* 题目顺序：进入单元后，对题目进行 **随机洗牌**（每次进入都可不同）。
* 每道题展示：

  * 显示：`translate`
  * 可选显示：`statement`（建议在答题后展示，或提供“显示原句”按钮）
* 每道题的 `keywords`：

  * **每次出题只随机隐藏一个关键词**（从 keywords 里选一个 index）。
  * 其他关键词可显示为提示（例如灰色标签），但隐藏的那个不显示，改为输入框让用户填写。
* 用户输入必须 **完全匹配**（包含大小写）才算正确。

### 5.3 错误处理与反馈

* 用户提交答案：

  * 正确：展示“正确”反馈，并进入下一题
  * 错误：

    * 立即提示“输入错误”
    * 显示正确答案（明确展示）
    * 该错题需要在稍后随机再次出现（错题回流）
* 提供按钮：

  * “提交”
  * “我不会/跳过”（等同错误，显示正确答案并进入错题回流）

### 5.4 “单元完全通过”判定（建议采用可解释的掌握模型）

由于你提到同一道题可能过几道题回来时隐藏词变成另一个（例如先隐藏 Tee，之后隐藏 oder），因此建议将“掌握”定义为：

* **掌握粒度 = (question, keywordIndex)**
  即：同一道题的每个关键词都需要被正确填写至少一次，才算这道题完全掌握。
* 单元通过条件：

  * 对该 unit 内所有 question 的所有 keywordIndex，均达成“至少正确一次”。

> 这样能自然实现“回来时可能换隐藏词”的效果，并且“完全正确”也有明确含义。

### 5.5 错题回流机制（可实现且体验好）

* 维护一个练习队列 `queue`（初始化为所有未掌握的 (question, keywordIndex) 的随机序列）
* 当用户答错某个 item：

  * 将该 item 重新插入队列的靠后位置（随机插入到 `3~6` 题之后的位置），实现“过一会再出现”
* 当答对：

  * 将该 item 标记为 mastered，不再入队
* 队列为空则单元通过，进入“单元完成”结果页并记录打卡统计。

> 备注：题面展示仍以 question 为单位，但出题 item 绑定一个隐藏词 index，确保回流和掌握统计准确。

### 5.6 练习进度与中断恢复

* 用户中途退出/返回：

  * 要能回来继续（至少保留当前 unit 的 mastered 状态与队列状态）
* 持久化内容（按 language+unit 维度）：

  * masteredMap：每个 question 的哪些 keywordIndex 已掌握
  * 当前 queue（可选，若不存则返回时重新生成未掌握队列也可）
  * 最近练习时间戳

---

## 6. 移动端键盘（keyboard）可行性说明与需求

### 6.1 目标

* 尽可能让移动端弹出的键盘更贴近目标语言（例如德语键盘/字符）。
* 但需明确：**Web 应用无法强制用户系统切换到某种输入法键盘**，只能“提示/优化”。

### 6.2 可实现的“最佳努力”方案（必须做）

在输入框上设置：

* `lang` 属性：例如 `lang="de"`
* 关闭自动纠错/自动大写：

  * `autoCorrect="off"`
  * `autoCapitalize="none"`
  * `spellCheck={false}`
* `inputMode="text"`（对键盘类型影响有限，但可规范）
* （可选）在 UI 上显示当前语言 keyboard 提示（来自 JSON 的 `keyboard` 字段），提示用户切换对应系统键盘。

### 6.3 验收标准

* iOS Safari / Android Chrome：输入框不会自动纠错乱改单词，不会自动首字母大写导致大小写错误。
* UI 明确展示当前语言（及 keyboard 提示）帮助用户手动切换。

---

## 7. 统计页（Stats）设计方案（美观优雅）

### 7.1 统计数据定义（何时算打卡）

* “打卡”事件：**某天完成某个 language+unit 的“单元完全通过”**时记录一条 session。
* Session 建议记录字段：

  * `date`（本地日期，YYYY-MM-DD）
  * `languageCode`
  * `unitName`
  * `startedAt`, `finishedAt`, `durationSec`
  * `totalItems`（总 (question, keywordIndex) 数）
  * `wrongCount`（错误次数）
  * `retryCount`（回流次数，可选）

### 7.2 统计页布局（建议）

1. 顶部概览卡片（3 个小 Card）

   * 今日打卡：已/未（以及完成了几个 unit）
   * 连续打卡天数（streak）
   * 累计完成单元数 / 累计练习时长

2. 中部：日历热力图（Calendar Heatmap 风格）

   * 每天一个格子，颜色深浅表示当天完成的 unit 数或练习时长
   * 点击某天 → 右侧 Drawer 展示当日详情（语言/单元列表）

3. 底部：最近记录列表（List + Tag）

   * 最近 N 次完成记录
   * 每条展示：日期、语言 Tag、unit、耗时、错误次数
   * 支持筛选：语言筛选 / unit 筛选（Select 下拉）

> Ant Design 可用：Card、Statistic、Calendar（自定义 dateCellRender）、Drawer、List、Tag、Select。

### 7.3 统计页验收标准

* 能看到哪些天打卡过（至少最近 3 个月，或全部）。
* 点某一天能看到当天完成了哪些语言/单元的详情。
* 视觉层次清晰：概览 → 日历 → 详情列表。

---

## 8. UI/交互风格要求（统一约束）

### 8.1 视觉

* 整体简洁、现代、留白充足
* 卡片化布局（Ant Design Card）
* 练习页重点突出输入区与反馈
* 颜色：遵循 Ant Design 默认主题或轻度自定义（不花哨）

### 8.2 交互细节

* 练习页：

  * Enter 提交
  * 错误提示清晰，正确答案展示醒目但不刺眼
  * 进度条：显示“已掌握/总项”
* 语言/单元页：

  * 单元显示完成状态（已完成 Badge / Progress）
  * 支持继续上次进度（若未完成）

---

## 9. 异常与边界情况

* URL 不合法 / 非 https / 非 raw github：

  * 必须提示并阻止保存（或给出风险确认：建议仅允许 raw.githubusercontent.com）
* 请求失败且无缓存：

  * 显示“需要联网完成首次加载”的空状态页 + 重新输入 URL
* JSON 格式不符合规范：

  * 给出明确错误：缺少 language、语言节点不存在、Unit 格式错误等
* keywords 为空数组：

  * 该题跳过或标记为不可练习（建议直接过滤并在控制台/提示中说明）
* 多语言：

  * language 数组可能多个，语言选择页必须支持多语言展示
* 单元结构：

  * Unit 数组里可能不止一个 unit object；需正确展平为 unit 列表

---

## 10. 非功能性要求

* 性能：

  * 首屏加载快（PWA 资源缓存）
  * 数据解析不阻塞 UI（必要时用 Web Worker 可选，但非必需）
* 可维护性：

  * 业务逻辑（数据加载/出题/统计）与 UI 分层
  * 组件复用、类型完整、避免巨型组件
* 可测试性（建议）

  * 出题队列/错题回流/掌握判定等逻辑应可单测（纯函数化）

---

## 11. 验收清单（关键场景）

1. **首次进入**

* 无缓存 → 必须弹出配置 URL
* URL 正确 → 成功拉取 JSON → 进入语言选择页
* URL 错误/JSON 不合法 → 明确报错，不进入下一步

2. **离线进入**

* 有缓存 + 离线 → 能正常进入语言选择/单元/练习
* 无缓存 + 离线 → 明确提示必须联网首次加载

3. **练习逻辑**

* 题目顺序随机
* 每题只隐藏一个 keyword
* 大小写严格匹配
* 错误提示 + 显示正确答案
* 错题会在之后随机再次出现
* 单元必须“完全掌握”（建议按 (question, keywordIndex)）才算通过
* 退出再进能继续（至少掌握进度不丢）

4. **统计页**

* 单元通过会记录打卡
* 日历能看出打卡日期
* 能查看某天完成了哪些语言/单元的详情

---

## 12. 建议的模块划分（便于 Codex 落地）

* `services/`

  * `DataService`：URL 管理、拉取、缓存读写、JSON 校验与解析
  * `ProgressService`：unit 进度存取（mastered、队列等）
  * `StatsService`：session 记录、聚合统计
* `domain/`

  * 类型定义：Dataset、Language、Unit、Question、QuizItem、Session
  * 纯逻辑：shuffle、生成队列、回流策略、掌握判定
* `pages/`

  * LanguageSelect
  * UnitSelect
  * Quiz
  * Stats
  * Settings（可选）
* `components/`

  * DataSourceModal、QuestionCard、AnswerInput、ResultDrawer 等

---
