# 可视化教学工具 · Visual Teaching Tools

一个基于 Three.js 的交互式数学教学工具，帮助学生直观理解长方体体积计算原理。
An interactive math teaching tool built on Three.js, helping students intuitively grasp how rectangular prism volume is calculated.

> 在线演示 / Live demo: <https://httpspycharmhelpers.github.io/Teach/>

## 功能特点 / Features

- 3D 长方体可视化与交互 / Interactive 3D rectangular prism visualization
- 实时体积计算与显示 / Real-time volume calculation & display
- 多种单位转换（厘米、毫米、分米、米、微米）/ Multi-unit conversion (cm, mm, dm, m, µm)
- 分层视图展示 / Layered view
- 标记模式与注释功能 / Marker mode & annotation
- 函数可视化（2D 和 3D）/ Function plotting (2D & 3D)
- 开发者模式（添加自定义几何体）/ Developer mode (add custom geometry)
- 数学题目练习 / Math problem drills

## 项目结构 / Project Structure

项目已按功能模块拆分，不再是一个 1600 行的单文件。
The project is split into modular files instead of a single 1600-line file.

```
Teach/
├── index.html            # 页面入口 / Entry point
├── css/
│   └── style.css         # 全部样式 / Styles
├── js/
│   ├── app.js            # 主应用：全局状态、场景初始化、事件绑定
│   ├── cubic.js          # 长方体可视化、分层、标记小方块、体积计算
│   ├── functions.js      # 2D/3D 函数可视化
│   ├── developer.js      # 开发者模式：自定义几何体
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