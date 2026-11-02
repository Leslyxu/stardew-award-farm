# 星露奖杯农场 · 赛事导航

面向中小学美术老师的星露谷像素风赛事导航工具（纯静态单文件，离线可用）。

## 在线访问

**https://leslyxu.github.io/stardew-award-farm/**

手机、电脑、微信内均可直接打开，无需登录。

> 说明：本仓库为公开仓库以启用 GitHub Pages，链接本身不做公开宣传；页面内不含任何个人信息。

## 离线使用

- 直接双击 `index.html` 即可（数据内置，断网可用）
- 微信「发给自己」→ 收藏，随时打开

## 数据说明

- 「我的资料 / 勾选 / 投稿包 / 自定义赛事」只保存在**浏览器本地**（localStorage），不上传服务器，换设备不通用。
- 赛事、白名单、教研前沿、工具箱、评审专家均在 `data.js` 内。

## 更新数据

1. 编辑 `data.js`
2. 运行 `python3 build_single.py` 重新生成单文件 `index.html`
3. `git add -A && git commit -m "更新" && git push`（Pages 约 1 分钟后自动刷新）

数据版本见 `data.js` 顶部 `DATA_VERSION`（当前第 15 版，2026-11-02）。
