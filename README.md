# 可视化教学工具 · Visual Teaching Tools

一个基于 Three.js 的交互式数学教学工具，帮助学生直观理解长方体体积计算原理。
An interactive math teaching tool built on Three.js, helping students intuitively grasp how rectangular prism volume is calculated.

> 在线演示 / Live demo: <https://httpspycharmhelpers.github.io/Teach/>

## 功能特点 / Features

- 3D 长方体可视化与交互 / Interactive 3D rectangular prism visualization
- 固定竖直 Y 轴，长方体底部贴地、贴轴显示 / Fixed vertical Y axis, cuboid rests on the ground hugging the axis
- 实时体积计算与显示（支持小数尺寸）/ Real-time volume calculation (decimal dimensions supported)
- 多种单位转换（厘米、毫米、分米、米、微米）/ Multi-unit conversion (cm, mm, dm, m, µm)
- 数字输入框 + 滑块双控，长宽高可输入小数 / Slider + numeric input for decimal length/width/height
- 分层视图展示 / Layered view
- 标记模式：触屏/鼠标选中、多选、拖动、缩放、按角度旋转、删除以拼出不规则立体、备注 / Marker mode: pointer/touch selection, multi-select, drag, resize, rotate by angle, delete cubes to build irregular shapes, annotations
- 函数可视化（2D 固定浮动画布，可拖拽、防误关；3D 曲面）/ Function plotting (fixed draggable 2D panel + 3D surface)
- 开发者模式：8 种几何体、小数尺寸、位置/旋转参数、自动落地 / Developer mode: 8 shapes, decimal sizes, position/rotation params, auto ground placement
- 数学题目练习：去重重编、按难度分类、展示答案 / Math drills: deduplicated, grouped by difficulty, answers revealed
- 本地 Three.js + 国内 CDN 回退，断网/跨国网络不再白屏 / Bundled Three.js + npmmirror CDN fallback

## 项目结构 / Project Structure

项目已按功能模块拆分，不再是一个 1600 行的单文件。
The project is split into modular files instead of a single 1600-line file.

```
Teach/
├── index.html            # 页面入口 / Entry point
├── css/
│   └── style.css         # 全部样式 / Styles
├── vendor/
│   ├── three.min.js      # 本地化 Three.js（断网可用）/ Bundled Three.js
│   └── OrbitControls.min.js
├── js/
│   ├── app.js            # 主应用：全局状态、场景初始化、事件绑定
│   ├── cubic.js          # 长方体可视化、Y轴、分层、标记小方块、体积计算
│   ├── functions.js      # 2D/3D 函数可视化（2D 浮动画布可拖拽）
│   ├── developer.js      # 开发者模式：8 种几何体、参数化创建
│   ├── math.js           # 数学题目数据与渲染（去重/分难度/答案）
│   └── annotation.js     # 注释画布
├── README.md             # 中文说明
└── README_EN.md          # English
```

## 本地运行 / Local Usage

直接打开 `index.html`，或起一个静态服务器：

```bash
# Python
python3 -m http.server 8080
# 或 / or Node
npx serve
```

## 部署 / Deployment

本项目已部署在 GitHub Pages：<https://httpspycharmhelpers.github.io/Teach/>

## 开源声明 / License

MIT License. Copyright (c) 2025 Zhongzhescode.

本项目是**真正的开源教学工具**。我们不接受任何"打着教学工具名义、实则借开源混流量"的行为 —— 代码完全开放、结构清晰、可自由修改与审计。
This is a **genuine open-source teaching tool**. We reject products that merely hijack the "teaching tool" label for traffic while shipping opaque, bloated, single-file code. Our code is fully open, well-structured, and freely auditable.

## 贡献 / Contributing

欢迎提交 Issue 与 Pull Request。
Issues and pull requests are welcome.