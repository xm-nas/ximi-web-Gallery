# ximi-Gallery

本地 Web 图库，提供原生浏览体验。Telegraph 风格，macOS 化 UI，完美适配移动端。

上手极简：仅包含一个 HTML 文件，无需配置后端服务器。将其放置在图片存储的上级目录即可，支持多级目录预览，提供比系统原生预览更便捷的体验。

## 使用方法

1. **选择图片目录**：打开网页，点击左侧边栏的「更新图库配置」，选中当前目录内存储图片的文件夹。
2. **保存配置文件**：浏览器会自动扫描目录内（包含子目录）的所有图片，并下载 `setting.js` 数据文件。
3. **替换并刷新**：将该配置文件移动至本网页所在目录（如提示重复则替换），按 `F5` 或 `⌘ R` 刷新即可生效。

## 演示站点

[https://app.hhqq.net/img](https://app.hhqq.net/img)

## 界面预览

<table>
  <tr>
    <td><img src="./docs/1.png"></td>
    <td><img src="./docs/2.png"></td>
     </tr>
</table>

## 配置说明

1. 网络图片视频加载实例可以查看目录内api.js
2. api.js仅供演示使用可自行删除
## 关于

- 作者：希米
- 原文：[https://www.ximi.me/post-6044.html](https://www.ximi.me/post-6044.html)
- 最后更新：2026-07-11
