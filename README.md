# Binghao WANG — Personal Website

## 网站样式

网站保持原生 HTML / CSS / JavaScript，直接使用现有 GitHub Pages Actions 发布，不需要 Node 前端构建、数据库或常驻服务器。2026-11 的视觉改版采用暖白、深墨色和陶土红，使用 Newsreader / Hanken Grotesk 字体；字体不可用时会自动回退到本机字体。

- `css/base.css` 管理全站配色、字体、固定导航、菜单和页脚。
- `css/main.css`、`css/pages.css`、`css/photography.css` 分别管理首页、内容页和摄影集。
- `js/main.js` 保留首页新闻、摄影封面、贡献图同步，并统一内页导航和页脚。
- `assets/taste/motion/` 是 Taste Skill 2.5.0 的原始悬停交互层，授权见同目录上级的 `LICENSE.txt`。没有使用 WebGL、滚动特效、外部图片服务或后端接口。

本次参考 Taste Skill 的 split 首页结构和 Newsreader / Hanken Grotesk 字体组合，并按个人作品集调整：保留长篇项目说明、新闻、照片 EXIF 和原有链接，内容页高度随内容自然增长。所用图片均来自原仓库，没有新增素材占位。兼容性检查使用真实浏览器，覆盖首页 1440 / 1024 / 820 / 768 / 390px 和全部内页的桌面、手机尺寸；检查内部资源链接、菜单键盘操作及摄影大图。没有运行该 skill 针对公司营销页的固定屏高评分脚本。

随后使用 [unslop](https://github.com/heydamir/unslop)（Damir Sokolovsky，CC BY 4.0）进行轻量审阅：简化首页重复标签，以具体作品主题替换泛化描述，作品区与新闻区不再强制占满一屏；配色、字体、内容顺序和全部原始项目正文保留。

## 更新摄影照片

把照片放入 `photograph/` 文件夹（也可以使用子文件夹），提交后推送到 `main`。现有 GitHub Actions 发布流程会自动：

- 扫描文件夹，替换摄影页面的照片列表，并同步首页封面。
- 按 EXIF 中的真实拍摄日期从新到旧排序；没有拍摄日期的照片排在最后。
- 生成用于摄影页面和大图预览的 JPEG，保留照片比例并纠正 EXIF 方向。
- 部署到 GitHub Pages。删除照片后再次推送，页面也会同步移除。

支持 JPG / JPEG、PNG、WebP、TIFF 和 Sony ARW（使用内嵌预览）。照片文件名用作标题；ISO、快门、光圈和日期从照片信息读取，缺失的信息显示为 `—`。隐藏文件会被忽略。

原照片保留在仓库里，网站只发布生成的网页图片，避免访问时下载大体积原片。`photograph/generated/` 和 `js/photographs-data.js` 是自动生成的文件，无需提交，也无需手动修改 HTML 或照片清单。

## 本地预览

```sh
python3 -m venv /tmp/photography-venv
/tmp/photography-venv/bin/python -m pip install -r scripts/photography-requirements.txt
/tmp/photography-venv/bin/python scripts/generate-photography.py
python3 -m http.server 8000
```

打开 <http://localhost:8000/html/Photography.html>。每次在本地更改照片后，重新运行生成脚本即可。

仓库的 Settings → Pages → Source 应设为 **GitHub Actions**。推送后可在 Actions 中查看 **Build and deploy website** 的发布结果。工作流继续使用现有的 `GH_CONTRIBUTIONS_TOKEN` 更新 GitHub 贡献图。
