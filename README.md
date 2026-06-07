# 🗺️ Beijing Memory Map

一个本地优先的北京探索桌面客户端，通过互动地图、解锁机制、通勤理解、周末路线、地点打卡和 AI 助手，帮助用户快速、有趣地熟悉北京的文化与记忆。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)
![Electron](https://img.shields.io/badge/Electron-28+-blue.svg)
![React](https://img.shields.io/badge/React-18+-blue.svg)

## ✨ 核心功能

- **🗺️ 互动地图** - 基于高德地图的北京探索界面
- **🔓 解锁机制** - 渐进式地点解锁，增加探索趣味性
- **🚌 通勤理解** - 帮助用户理解北京的通勤模式
- **🎯 周末路线** - 智能推荐周末探索路线
- **📍 地点打卡** - 记录和分享地点体验
- **🤖 AI 助手** - 智能推荐和个性化体验

## 🛠️ 技术栈

- **前端框架:** React 18 + TypeScript
- **桌面应用:** Electron 28
- **构建工具:** Vite
- **状态管理:** Zustand
- **地图服务:** 高德地图 JS API
- **包管理:** npm workspaces (Monorepo)

## 📁 项目结构

```
beijing-memory-map/
├── apps/
│   └── desktop/          # 主桌面应用
│       ├── src/
│       │   ├── main/     # Electron 主进程
│       │   ├── preload/  # 预加载脚本
│       │   ├── renderer/ # 渲染进程 (React)
│       │   └── shared/   # 共享类型
│       └── package.json
├── packages/
│   ├── core/            # 核心业务逻辑
│   ├── data/            # 数据和 API
│   └── ui/              # 共享 UI 组件
├── docs/                # 项目文档
│   └── prd/             # 产品需求文档
├── package.json         # 根 package.json
└── tsconfig.base.json   # TypeScript 配置
```

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm 9+

### 安装依赖

```bash
# 克隆项目
git clone https://github.com/2423248362/beijing-memory-map.git
cd beijing-memory-map

# 安装依赖
npm install
```

### 开发模式

```bash
# 启动开发服务器
npm run dev
```

### 构建应用

```bash
# 构建生产版本
npm run build
```

### 类型检查

```bash
# 运行 TypeScript 类型检查
npm run typecheck
```

## 📖 核心文档

- [产品需求文档 v0.1](docs/prd/PRD-v0.1.md)
- [产品需求文档 v0.2](docs/prd/PRD-v0.2.md)

## 🤝 贡献指南

我们欢迎各种形式的贡献！请查看我们的贡献指南（待创建）了解详情。

## 📄 许可证

本项目采用 [MIT License](LICENSE) 许可证。

---

**当前阶段：** 需求和产品设计
**版本：** 0.1.0
