# 🔧 X402 部署故障排查

## 🚨 当前问题

API 返回 502 错误，应用无法启动。

## 📋 检查清单

### 1. 在 Railway Dashboard 检查日志

打开: https://railway.app/project/b66d0f1b-9621-42d5-9b09-8e83428e8acf/service/26de2114-b624-437b-abf4-76ed5a146bb3

查看 "Deployments" → 点击最新部署 → "View Logs"

### 可能的错误及解决方案

#### 错误 1: 找不到模块
```
Error: Cannot find module 'x402-middleware'
```

**原因**: Railway 没有正确识别项目结构

**解决方案**:
1. 确认 `api/x402-middleware.js` 文件存在
2. 检查 `api/server.js` 中的 require 路径
3. 确保 Railway 的 Root Directory 设置为 `/`

#### 错误 2: MARKETPLACE_ADDRESS 未定义
```
ERROR: MARKETPLACE_ADDRESS environment variable is not set
```

**解决方案**:
1. 在 Railway Variables 中添加:
   ```
   MARKETPLACE_ADDRESS=0xfe9c8AEb6a1C9c04cC5636Ba9F49ee7334107455
   ```
2. 点击 "Redeploy"

#### 错误 3: 合约函数不存在
```
Contract function does not exist: getBalance
```

**解决方案**:
这意味着 MARKETPLACE_ADDRESS 指向的是旧合约。确保使用新合约地址:
```
0xfe9c8AEb6a1C9c04cC5636Ba9F49ee7334107455
```

#### 错误 4: npm install 失败
```
npm ERR! code ENOENT
```

**解决方案**:
1. 确认 Root Directory: `/`
2. 确认 Build Command: `npm install`
3. 确认 Start Command: `cd api && npm start`

---

## 🔍 Railway 配置验证

### 必需的环境变量

在 Railway Dashboard → Variables 中确认:

```env
✅ MARKETPLACE_ADDRESS=0xfe9c8AEb6a1C9c04cC5636Ba9F49ee7334107455
✅ BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
✅ USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
✅ PRIVATE_KEY=0x91ee71a027efe6d4dcf3d2853ce05b8ac57f06a97379e5380db013195a6de070
```

### 构建设置

Settings → Deploy:

```
✅ Builder: Nixpacks
✅ Root Directory: /
✅ Build Command: npm install (auto-detected)
✅ Start Command: cd api && npm start (from railway.json)
```

### GitHub 连接

Settings → Source:

```
✅ Repository: csschan/agent-a2a-marketplace
✅ Branch: main
✅ Auto-deploy: Enabled
```

---

## 🧪 本地测试

如果 Railway 持续失败，可以本地测试：

### 1. 安装依赖
```bash
cd agent-a2a-marketplace
npm install
cd api
npm install
```

### 2. 设置环境变量
```bash
export MARKETPLACE_ADDRESS=0xfe9c8AEb6a1C9c04cC5636Ba9F49ee7334107455
export BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
export USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
export PRIVATE_KEY=0x91ee71a027efe6d4dcf3d2853ce05b8ac57f06a97379e5380db013195a6de070
```

### 3. 启动服务器
```bash
cd api
npm start
```

### 4. 测试端点
```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/x402/pricing
```

如果本地可以运行，说明代码没问题，是 Railway 配置问题。

---

## 🔄 重新部署步骤

### 方案 A: 从 Railway Dashboard

1. 打开 https://railway.app/project/b66d0f1b-9621-42d5-9b09-8e83428e8acf
2. 选择 "agent-a2a-marketplace" 服务
3. Settings → 检查所有配置
4. Variables → 确认所有环境变量
5. Deployments → Redeploy

### 方案 B: 删除并重新创建服务

1. 在 Railway Dashboard 删除当前服务
2. 创建新服务
3. 连接到 GitHub 仓库
4. 设置所有环境变量
5. 配置构建设置
6. 部署

### 方案 C: 使用其他部署平台

如果 Railway 持续有问题，可以考虑：

- **Vercel**: 适合 Node.js API
- **Render**: 类似 Railway
- **Fly.io**: 更灵活的配置

---

## ✅ 成功部署的标志

部署成功后，你应该看到:

### 1. Health Check
```bash
curl https://agent-a2a-marketplace-production.up.railway.app/health
```
```json
{
  "status": "ok",
  "network": "Base Sepolia",
  "marketplace": "0xfe9c8AEb6a1C9c04cC5636Ba9F49ee7334107455",
  "usdc": "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
}
```

### 2. X402 Pricing
```bash
curl https://agent-a2a-marketplace-production.up.railway.app/api/x402/pricing
```
```json
{
  "message": "X402 Payment Protocol - Pricing",
  "protocol": "x402",
  "token": "USDC",
  ...
}
```

### 3. Contract Info
```bash
curl https://agent-a2a-marketplace-production.up.railway.app/api/info
```
```json
{
  "marketplace": "0xfe9c8AEb6a1C9c04cC5636Ba9F49ee7334107455",
  "usdc": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  "network": "Base Sepolia (84532)",
  ...
}
```

---

## 📞 需要帮助？

如果问题持续，请提供:

1. Railway 部署日志的截图
2. 错误信息的完整文本
3. 环境变量配置截图

---

## 🎯 快速检查命令

```bash
# 测试 API
curl -I https://agent-a2a-marketplace-production.up.railway.app/health

# 测试智能合约 (应该成功)
curl -X POST https://sepolia.base.org \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_call",
    "params": [{
      "to": "0xfe9c8AEb6a1C9c04cC5636Ba9F49ee7334107455",
      "data": "0xe2a77a61"
    }, "latest"],
    "id": 1
  }'
```

如果智能合约调用成功但 API 失败，说明问题在 Railway 配置。

---

**最后更新**: 2026-02-04
**状态**: 等待 Railway 部署修复
