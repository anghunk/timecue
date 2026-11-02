# 知时 · TimeCue

到点提醒，确认才收起。一个采用 PaneNest 柔和原生风格的静音浏览器提醒扩展。

## 功能

- 指定日期时间提醒。
- 倒计时提醒，支持整数分钟。
- 固定日程：每天、工作日（周一至周五）、每周自选日期。
- 间隔重复：创建时选择固定间隔，或确认后重新计时。
- 支持的网站右上角显示提醒卡片；刷新、切换标签和打开新网页后继续显示。
- 任意一个标签确认，同一浏览器的其他标签同步收起。
- 同一条提醒最多保留一个待确认实例，错过的重复次数不会累计补发。
- Popup 展示启用数、待确认数、今日确认数和下一条提醒。
- 独立 Options 页面管理提醒、确认记录、外观和卡片显示数量。
- 浅色、深色与跟随系统主题；全程静音。

## 开发

Node.js 22 或更新版本，使用 npm 和项目内的 `package-lock.json`。

```sh
npm install
npm run dev
```

使用 WXT、React、TypeScript、Tailwind CSS 和 Lucide React。日期、时间、下拉菜单与表单弹层使用 React Aria Components，并共享 PaneNest 设计变量。依赖的具体版本由锁文件固定。

日期支持中文日历、翻月及今天 / 明天 / 一周后快捷选择。时间采用 24 小时制，可直接输入各段数字、用方向键微调，或展开小时和分钟列表选择。所有编辑仍在 Options 管理页中完成。

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | Chrome 开发 |
| `npm run dev:edge` | Edge 开发，需本机安装 Edge 并按 WXT 文档配置启动程序 |
| `npm run dev:firefox` | Firefox 开发，需本机安装 Firefox |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run build` | Chrome MV3 生产构建 |
| `npm run build:edge` | Edge MV3 生产构建 |
| `npm run build:firefox` | Firefox MV3 生产构建 |
| `npm run build:safari` | Safari MV2 Web Extension 源文件构建 |
| `npm run zip` | Chrome 分发 ZIP |
| `npm run zip:firefox` | Firefox 分发 ZIP |

## 本地安装

### Chrome / Edge

1. 执行对应的生产构建。
2. 打开浏览器的扩展管理页，开启开发者模式。
3. 点击“加载已解压的扩展程序”，选择 `.output/chrome-mv3` 或 `.output/edge-mv3`。
4. 把知时固定到工具栏，打开 Popup 后点击“打开管理页”。
5. 新安装或重新加载扩展后，刷新之前已经打开的网页，让提醒脚本生效。允许扩展在需要的网站上运行。

### Firefox

执行 `npm run build:firefox`。在 `about:debugging#/runtime/this-firefox` 中临时加载 `.output/firefox-mv3/manifest.json`。正式分发需要 Mozilla 签名。

### Safari

`npm run build:safari` 输出 Web Extension 文件。安装到 Safari 还需要使用 Xcode 的 Safari Web Extension 转换工具生成宿主 App，并按 Apple 的流程进行运行、签名或分发。WXT 构建成功不代表已经完成 Safari 的安装验证。

## 重复规则

| 规则 | 行为 |
| --- | --- |
| 固定日程 | 以浏览器本地日历安排。每天或每周在指定时间提醒；确认后安排下一次未来的日程。 |
| 固定间隔 | 首次提醒等待一个间隔。确认后保持首次提醒的节奏，跳过已错过的时间。 |
| 确认后计时 | 首次提醒等待一个间隔；每次确认后，从确认时间开始等待下一个完整间隔。 |

例如每隔一小时，10:00 提醒、10:20 确认：固定间隔在 11:00 再提醒，确认后计时在 11:20 再提醒。同一提醒在未确认期间持续保留一张卡片。

仅编辑标题或备注会保留原有计时。修改时间规则或重新启用提醒会重新安排；已经到期的提醒仍保留到确认。暂停后续提醒不会自动确认已经显示的卡片，删除提醒会一并移除其卡片。

## 数据与权限

- 数据保存在当前浏览器的本地扩展存储中，各浏览器独立，不通过网络上传。
- 确认记录保留最近 200 条，可在管理页清空。
- `storage` 用于持久化与跨标签同步，`alarms` 用于后台调度。
- HTTP / HTTPS 网页匹配用于展示卡片；不读取网页业务内容。
- 浏览器设置页、扩展商店、内置 PDF 阅读器等受保护页面不展示卡片。
- 仅考虑正常使用浏览器的场景。浏览器完全退出期间不运行，电脑休眠时无法唤醒设备。
- 浏览器调度可能出现延迟，面向分钟级日常提醒，不承诺秒级精准。

## 源码结构

```text
entrypoints/
  background.ts           后台调度、校验、串行写入与确认
  options/                完整管理页面
  popup/                  工具栏概览
  reminder.content/       网页卡片入口
components/               品牌、提醒表单与提醒卡片
lib/                      类型、存储、调度与界面状态
styles/                   PaneNest 设计变量、页面样式与隔离卡片样式
public/                   品牌与扩展图标
```

后台是状态的唯一写入方，页面通过消息提交操作，通过存储监听接收变化。每次待确认提醒都有独立实例 ID，避免多个标签同时点击导致重复确认或误关闭下一次提醒。
