# Binghao WANG — Personal Website

## 网站样式

网站保持原生 HTML / CSS / JavaScript，直接使用现有 GitHub Pages Actions 发布，不需要 Node 前端构建、数据库或常驻服务器。2026-11 的视觉改版采用暖白、深墨色和陶土红，使用 Newsreader / Hanken Grotesk 字体。字体文件随网站发布，不再请求 Google Fonts；字体不可用时会自动回退到本机字体。

- `css/base.css` 管理全站配色、字体、固定导航、菜单和页脚。
- `css/main.css`、`css/pages.css`、`css/photography.css` 分别管理首页、内容页和摄影集。
- `js/main.js` 保留首页新闻、摄影封面、贡献图同步，并统一内页导航和页脚。
- `assets/taste/motion/` 是 Taste Skill 2.5.0 的原始悬停交互层，授权见同目录上级的 `LICENSE.txt`。没有使用 WebGL、滚动特效、外部图片服务或后端接口。

本次参考 Taste Skill 的 split 首页结构和 Newsreader / Hanken Grotesk 字体组合，并按个人作品集调整：保留长篇项目说明、新闻、照片 EXIF 和原有链接，内容页高度随内容自然增长。所用图片均来自原仓库，没有新增素材占位。兼容性检查使用真实浏览器，覆盖首页 1440 / 1024 / 820 / 768 / 390px 和全部内页的桌面、手机尺寸；检查内部资源链接、菜单键盘操作及摄影大图。没有运行该 skill 针对公司营销页的固定屏高评分脚本。

随后使用 [unslop](https://github.com/heydamir/unslop)（Damir Sokolovsky，CC BY 4.0）进行轻量审阅：简化首页重复标签，以具体作品主题替换泛化描述，作品区与新闻区不再强制占满一屏；配色、字体、内容顺序和全部原始项目正文保留。

## 国内访问与资源加载

- `assets/fonts/` 保存 Newsreader / Hanken Grotesk 的 WOFF2 字体和 SIL OFL 授权文件，`css/base.css` 定义字体。页面预加载两个常用拉丁字形文件，其他字形按需加载，保留 `font-display: swap`。
- 每页直接按顺序引入 `motion.css`、`base.css` 和页面 CSS，让浏览器并行下载；新增页面也应使用这个顺序，避免恢复串行 `@import`。
- AI 页首图及 Art / Blog 的 Shader 预览使用已有 WebP，原始图片仍保留。AI 预览是原图的等比例 960 × 549 版本。
- 项目配图、字体、脚本和样式均由本站提供；摄影集直接读取当前发布版本在仓库中的原照片。GitHub 贡献图在 Actions 生成，访客不需要访问 GitHub API。

当前仍由 GitHub Pages 提供服务。资源优化能减少等待和下载量，但不能保证中国大陆三网的速度。域名目前未备案，使用大陆 CDN 节点前需先完成 ICP 备案；未备案阶段可评估香港节点，并在电信、联通、移动的实际网络与晚高峰验证效果。加速区域的备案要求参见 [阿里云 CDN 官方说明](https://www.alibabacloud.com/help/en/cdn/user-guide/change-the-accelerated-region)。代码修改本身不会切换 DNS 或开通 CDN。

## 更新摄影照片

把照片放入 `photograph/` 文件夹（也可以使用子文件夹），提交后推送到 `main`。现有 GitHub Actions 发布流程会自动：

- 扫描文件夹，替换摄影页面的照片列表，并同步首页封面。
- 按 EXIF 中的真实拍摄日期从新到旧排序；没有拍摄日期的照片排在最后。
- 只生成照片清单和 EXIF 参数，页面直接读取照片，不另存缩略图或大图。
- 部署到 GitHub Pages。删除照片后再次推送，页面也会同步移除。

支持 JPG / JPEG、PNG、WebP 和 Sony ARW。JPG 等浏览器支持的格式直接显示原文件；ARW 通过浏览器分段读取文件内已有的 JPEG 预览，在内存中显示，不提取或保存图片文件。照片文件名用作标题；ISO、快门、光圈和日期从照片信息读取，缺失的信息显示为 `—`。隐藏文件会被忽略。

原照片只保留在 `photograph/`，不创建 `generated` 文件夹，也不生成重复图片。`js/photographs-data.js` 仅记录照片地址、参数和 RAW 预览的字节范围，由发布流程自动生成，无需提交。

生产环境照片地址指向 GitHub 仓库中本次发布的提交，照片不重复打包进 GitHub Pages，以适应 Pages 的 1 GB 发布限制。本地预览仍直接读取本地 `photograph/`。原图大小决定 JPG 的加载量；RAW 通常只读取内嵌预览，支持分段请求时不下载完整 RAW。

## 本地预览

```sh
python3 -m venv /tmp/photography-venv
/tmp/photography-venv/bin/python -m pip install -r scripts/photography-requirements.txt
/tmp/photography-venv/bin/python scripts/generate-photography.py
python3 -m http.server 8000
```

打开 <http://localhost:8000/html/Photography.html>。每次在本地更改照片后，重新运行生成脚本即可。

仓库的 Settings → Pages → Source 应设为 **GitHub Actions**。推送后可在 Actions 中查看 **Build and deploy website** 的发布结果。工作流继续使用现有的 `GH_CONTRIBUTIONS_TOKEN` 更新 GitHub 贡献图。
