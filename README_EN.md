# Visual Teaching Tools · 可视化教学工具

An interactive math teaching tool built on Three.js, helping students intuitively understand how rectangular prism volume is calculated.
一个基于 Three.js 的交互式数学教学工具，帮助学生直观理解长方体体积计算原理。

> Live demo / 在线演示: <https://httpspycharmhelpers.github.io/Teach/>

## Features / 功能特点

- Interactive 3D rectangular prism visualization / 3D长方体可视化与交互
- Real-time volume calculation & display / 实时体积计算与显示
- Multi-unit conversion (cm, mm, dm, m, µm) / 多种单位转换
- Layered view / 分层视图展示
- Marker mode & annotation / 标记模式与注释功能
- Function plotting (2D & 3D) / 函数可视化（2D和3D）
- Developer mode (add custom geometry) / 开发者模式
- Math problem drills / 数学题目练习

## Project Structure / 项目结构

The project is split into modular files instead of a single 1600-line file.
项目已按功能模块拆分，不再是一个1600行的单文件。

```
Teach/
├── index.html            # Entry point / 页面入口
├── css/
│   └── style.css         # Styles / 全部样式
├── js/
│   ├── app.js            # Main app: state, scene init, event binding
│   ├── cubic.js          # Rectangular prism, layers, marker cubes, volume
│   ├── functions.js      # 2D/3D function plotting
│   ├── developer.js      # Developer mode: custom geometry
│   └── annotation.js     # Annotation canvas
├── README.md             # 中文说明 Chinese
└── README_EN.md          # English
```

## Local Usage / 本地运行

Open `index.html` directly, or serve it statically:

```bash
# Python
python3 -m http.server 8080
# or Node
npx serve
```

## Deployment / 部署

Deployed on GitHub Pages: <https://httpspycharmhelpers.github.io/Teach/>

## License / 开源声明

MIT License. Copyright (c) 2025 Zhongzhescode.

This is a **genuine open-source teaching tool**. We reject products that merely hijack the "teaching tool" label for traffic while shipping opaque, bloated, single-file code. Our code is fully open, well-structured, and freely auditable.
本项目是**真正的开源教学工具**。我们不接受任何"打着教学工具名义、实则借开源混流量"的行为——代码完全开放、结构清晰、可自由修改与审计。

## Contributing / 贡献

Issues and pull requests are welcome.
欢迎提交 Issue 与 Pull Request。