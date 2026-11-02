<img src="./public/icon/128.png" alt="知时 · TimeCue Logo" width="96" height="96" />

# 知时 · TimeCue

一个静音的浏览器提醒扩展：到点显示提醒卡片，确认后才收起。

## 功能

- 支持定时、倒计时、每天、工作日及每周自选日期提醒。
- 支持固定间隔重复，或确认后重新计时。
- 网页卡片持续显示，确认后在同一浏览器的所有标签页同步收起。
- 工具栏查看提醒概览，管理页编辑提醒、查看确认记录与调整外观。
- 支持浅色、深色与跟随系统主题。

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
