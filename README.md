# Binghao WANG — Personal Website

## 更新摄影照片

把照片放入 `photograph/` 文件夹（也可以使用子文件夹），提交后推送到 `main`。现有 GitHub Actions 发布流程会自动：

- 扫描文件夹，替换摄影页面的照片列表，并同步首页封面及照片数量。
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
