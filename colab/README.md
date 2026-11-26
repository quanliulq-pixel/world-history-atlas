# Google Colab Pro 离线资产生成指南

本项目内置了两套可在 Google Colab 上一键运行、**零消耗 Gemini 月度付费额度**的批量资产生产流水线，均支持 **Google Drive 断点续传**与分批生成（`starter` 精选包 / `core` 核心包 / `all` 全量包）。

---

## 1. 博物馆级历史插图工坊（FLUX.1-schnell / SDXL-Turbo）

- **在 Google Colab 中一键打开**：
  [打开历史插图批量生成 Notebook](https://colab.research.google.com/github/quanliulq-pixel/world-history-atlas/blob/main/colab/generate_atlas_illustrations.ipynb)
- **提示词清单**：`colab/illustration-prompts.json`（共 **295 项**：8 大时代 + 30 个精编国家 + 87 位历史人物油画肖像 + 170 项重大史事横版画卷）
- **推荐运行时**：`L4` GPU（24GB 显存）跑完全部 295 张约需 **12~15 分钟**；若想先快速体验，可将第 4 步 `BATCH_MODE` 保持为 `"starter"`（约 3 分钟生成精选包）。
- **成品导入与发布**：
  1. 在 Colab 最后一步下载 `atlas-illustrations-pack.zip`。
  2. 本地终端在项目根目录运行：
     ```bash
     npm.cmd run media:import -- C:\Users\lq\Downloads\atlas-illustrations-pack.zip
     ```
  3. 之后重新构建并部署到 Cloudflare Pages，右侧卡片与国家档案会自动展示博物馆插图（支持点击看大图），尚未生成的条目仍优雅保持现有排版，**零 404 报错**。

---

## 2. 零延迟中文纪录片语音工坊（Edge-TTS / F5-TTS）

- **在 Google Colab 中一键打开**：
  [打开纪录片语音批量生成 Notebook](https://colab.research.google.com/github/quanliulq-pixel/world-history-atlas/blob/main/colab/generate_atlas_audio.ipynb)
- **脚本清单**：`colab/narration-scripts.json`（共 **257 项**史事与人物，每项 3 幕分段旁白 = 771 段轻量 MP3，总体积约 25~35 MB）
- **引擎选择**：
  - 默认 `edge-tts`（`zh-CN-YunjianNeural` 等神经纪录片音色，全量 771 段仅约 **3 分钟**）；
  - 可选 `f5-tts` 在 GPU 上用自备 8 秒中文旁白克隆专属声线。
- **成品导入与效果**：
  1. 下载 `atlas-audio-pack.zip`。
  2. 本地终端运行：
     ```bash
     npm.cmd run media:import -- C:\Users\lq\Downloads\atlas-audio-pack.zip
     ```
  3. 重新构建部署后，点击事件/人物卡上的 **「AI 语音解说」** 或开启 **「电影演示」** 会**优先秒播静态预生成音频**，无需实时调用 Gemini TTS，且支持点击任意一幕直接跳转播放！

---

## 若日后卡片文案有新增/修改

重新导出最新清单并推送即可让 Colab 自动同步：

```bash
npm.cmd run media:prompts
npm.cmd run media:scripts
npm.cmd run media:ticker-scripts
npm.cmd run media:extras-scripts
```

---

## 3. 国别演变与专题导览语音工坊

- **一键打开**：[打开国别与专题语音 Notebook](https://colab.research.google.com/github/quanliulq-pixel/world-history-atlas/blob/main/colab/generate_atlas_extras_audio.ipynb)
- **合入项目**：`npm.cmd run media:import -- C:\Users\lq\Downloads\atlas-extras-audio-pack.zip`

---

## 4. 进阶：把 `public/media/` 迁移到免费 Cloudflare R2 对象存储（10 GB 免费）

当媒体资源体积继续增长时，可将 `public/media/` 全量托管到 Cloudflare R2，让 Git 仓库保持轻量：
1. 登录 Cloudflare Dashboard 开启 **R2 Object Storage**（首次需点一次开通，10 GB/月与出站零费用），创建存储桶 `world-history-atlas-media` 并开启公共访问域名（如 `https://pub-xxx.r2.dev`）。
2. 在本地运行一键增量同步脚本：
   ```powershell
   npm.cmd run media:r2-sync -- --bucket world-history-atlas-media
   ```
3. 在构建前端前设置 `VITE_MEDIA_BASE_URL=https://pub-xxx.r2.dev` 即可无缝切换从 R2 拉取所有插图与音频。
