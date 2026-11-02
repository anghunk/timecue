<p align="center">
  <img src="./public/icon/128.png" alt="知时 · TimeCue Logo" width="96" height="96" />
</p>

<h1 align="center">知时 · TimeCue</h1>

<p align="center"><strong>到点提醒，确认才收起。</strong></p>
<p align="center">静音浏览器提醒扩展，支持定时、倒计时与重复提醒。</p>

<p align="center">
  <a href="#功能">功能</a> ·
  <a href="#界面预览">界面预览</a> ·
  <a href="#本地安装">本地安装</a> ·
  <a href="#开发">开发</a>
</p>

## 功能

- **多种提醒**：定时、倒计时、每天、工作日与每周自选日期；支持固定间隔或确认后重新计时。
- **确认才收起**：网页卡片持续显示，在任意标签页确认后，同一浏览器的其他标签页同步收起。
- **统一管理**：工具栏查看概览，管理页编辑提醒、查看确认记录与调整外观。
- **安静轻量**：全程静音，数据仅存本机，支持浅色、深色与跟随系统主题。

## 界面预览

![提醒管理：集中查看提醒规则、下次时间与待确认状态](./store-assets/screenshots/01-reminder-management.png)

<details>
<summary>查看更多：新建提醒与卡片预览</summary>

**新建提醒** · 按需选择提醒类型、重复日期与时间。

![新建提醒：设置每周自选日期与备注](./store-assets/screenshots/02-create-reminder.png)

**卡片预览** · 查看静音提醒卡片，调整主题和同时显示数量。

![通用设置与提醒卡片预览](./store-assets/screenshots/03-card-preview.png)

</details>

截图使用示例数据。

## 开发

需要 **Node.js 22+** 和 **npm**。技术栈：WXT、React、TypeScript、Tailwind CSS。

```sh
npm install
npm run dev
```

| 命令 | 用途 |
| --- | --- |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run build` | 构建 Chrome 扩展 |
| `npm run build:edge` | 构建 Edge 扩展 |
| `npm run build:firefox` | 构建 Firefox 扩展 |
| `npm run build:safari` | 构建 Safari Web Extension 源文件 |
| `npm run zip` | 打包 Chrome 分发 ZIP |

## 本地安装

### Chrome / Edge

1. 执行 `npm run build` 或 `npm run build:edge`。
2. 打开扩展管理页，开启“开发者模式”，点击“加载已解压的扩展程序”。
3. 选择 `.output/chrome-mv3` 或 `.output/edge-mv3`，并允许扩展在需要的网站上运行。
4. 刷新已打开的网页，点击工具栏中的知时图标，进入管理页添加提醒。

### Firefox

执行 `npm run build:firefox`，在 `about:debugging#/runtime/this-firefox` 中临时加载 `.output/firefox-mv3/manifest.json`。正式分发需要 Mozilla 签名。

### Safari

执行 `npm run build:safari` 后，仍需通过 Xcode 的 Safari Web Extension 转换工具生成宿主 App 并完成签名。尚未完成 Safari 安装验证。

## 使用说明

- 日程按浏览器本地时间运行；每条提醒最多保留一个待确认实例，错过的重复次数不会累计补发。
- 固定间隔保持原有节奏；“确认后计时”从确认时间开始等待下一个完整间隔。
- 数据仅存于当前浏览器，不上传网络；确认记录保留最近 200 条。
- 卡片显示于允许访问的 HTTP / HTTPS 网页，浏览器设置页、扩展商店等受保护页面除外。
- 浏览器退出期间不运行，电脑休眠时无法唤醒设备；适用于分钟级提醒，调度可能延迟。
