# FHE Counter DApp

这是一个基于 Zama FHE（全同态加密）技术的去中心化应用示例。该应用展示了如何在区块链上使用全同态加密进行隐私计算。

## 合约信息

### 测试网合约地址

- Sepolia: `0xa02cda4ca3a71d7c46997716f4283aa851c28812`

### 合约 ABI

合约 ABI 文件位于 `abi/FHECounter.json`。主要包含以下功能：

- `increment(externalEuint32, bytes)`: 增加计数器值
- `decrement(externalEuint32, bytes)`: 减少计数器值
- `getCount()`: 获取当前计数值

## 技术栈

- React 18
- Vite
- Tailwind CSS
- Zama FHE SDK
- Ethers.js

## 功能特点

- 支持全同态加密计算
- 与区块链智能合约交互
- 响应式设计
- 国际化支持

## 快速开始

### 环境要求

- Node.js 20.0 或更高版本
- npm 或 yarn

### 安装

1. 克隆项目

```bash
git clone [your-repository-url]
cd first-dapp-demo
```

2. 安装依赖

```bash
npm install
# 或
yarn install
```

### 开发

启动开发服务器：

```bash
npm run dev
# 或
yarn dev
```

### 构建

构建生产版本：

```bash
npm run build
# 或
yarn build
```

预览构建结果：

```bash
npm run preview
# 或
yarn preview
```

## 项目结构

```
first-dapp-demo/
├── abi/            # 智能合约 ABI
├── src/
│   ├── hooks/     # React Hooks
│   ├── i18n/      # 国际化文件
│   └── App.jsx    # 主应用组件
└── ...
```

## 贡献

欢迎提交 Issue 和 Pull Request。

## 许可证

[添加你的许可证信息]
