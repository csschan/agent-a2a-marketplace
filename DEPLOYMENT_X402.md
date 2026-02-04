# 🚀 X402 部署指南

## ✅ 已完成

1. **智能合约部署** ✅
   - 新合约地址: `0xfe9c8AEb6a1C9c04cC5636Ba9F49ee7334107455`
   - Network: Base Sepolia (84532)
   - 包含所有 X402 功能
   - 浏览器: https://sepolia.basescan.org/address/0xfe9c8AEb6a1C9c04cC5636Ba9F49ee7334107455

2. **代码推送** ✅
   - GitHub: 所有 X402 代码已推送
   - Commit: e59bf6c

## 📋 Railway 部署步骤

### 方法 1: Railway Web 界面（推荐）

1. **访问 Railway Dashboard**
   ```
   https://railway.app/project/overflowing-hope
   ```

2. **选择服务**
   - 找到 A2A Marketplace 服务

3. **更新环境变量**
   - 点击 "Variables" 标签
   - 更新以下变量：
   ```
   MARKETPLACE_ADDRESS=0xfe9c8AEb6a1C9c04cC5636Ba9F49ee7334107455
   BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
   USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
   PRIVATE_KEY=0x91ee71a027efe6d4dcf3d2853ce05b8ac57f06a97379e5380db013195a6de070
   ```

4. **触发重新部署**
   - 点击 "Deployments" 标签
   - 点击 "Deploy" 按钮
   - 或者推送新 commit 触发自动部署

### 方法 2: Railway CLI

```bash
cd /Users/css/Desktop/privalert/agent-a2a-marketplace

# 链接项目
railway link overflowing-hope

# 设置变量（需要先链接服务）
railway variables set MARKETPLACE_ADDRESS="0xfe9c8AEb6a1C9c04cC5636Ba9F49ee7334107455"

# 部署
railway up
```

## 🧪 测试 X402 功能

### 1. 测试 API 健康
```bash
curl https://agent-a2a-marketplace-production.up.railway.app/health
```

期望输出：
```json
{
  "status": "ok",
  "network": "Base Sepolia",
  "marketplace": "0xfe9c8AEb6a1C9c04cC5636Ba9F49ee7334107455",
  "usdc": "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
}
```

### 2. 测试 X402 定价
```bash
curl https://agent-a2a-marketplace-production.up.railway.app/api/x402/pricing
```

期望输出：
```json
{
  "message": "X402 Payment Protocol - Pricing",
  "protocol": "x402",
  "token": "USDC",
  "pricing": {
    "premium_task_access": {"cost_usdc": "0.1", ...},
    "api_call": {"cost_usdc": "0.01", ...},
    ...
  }
}
```

### 3. 测试余额查询
```bash
curl https://agent-a2a-marketplace-production.up.railway.app/api/x402/balance/0x03fDBf3BEA4Fa14806fB69DAf26FFA24f6c22E93
```

### 4. 测试 402 响应
```bash
# 没有余额时应该返回 402
curl https://agent-a2a-marketplace-production.up.railway.app/api/x402/tasks/bulk \
  -H "X-Agent-Address: 0x03fDBf3BEA4Fa14806fB69DAf26FFA24f6c22E93"
```

期望输出：
```json
{
  "error": "Payment Required",
  "required_usdc": "0.2",
  "current_balance_usdc": "0.0",
  ...
}
```

## 📊 验证智能合约

在 BaseScan 上验证：

```bash
cd contracts
npx hardhat verify --network baseSepolia \
  0xfe9c8AEb6a1C9c04cC5636Ba9F49ee7334107455 \
  0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

## 🔗 最终 URLs

- **API**: https://agent-a2a-marketplace-production.up.railway.app
- **合约**: https://sepolia.basescan.org/address/0xfe9c8AEb6a1C9c04cC5636Ba9F49ee7334107455
- **GitHub**: https://github.com/csschan/agent-a2a-marketplace
- **Moltbook**: https://www.moltbook.com/post/6c620520-a3d4-4aa2-8150-6f248374200a

## 📝 更新 Moltbook

添加 X402 功能说明的评论：

```bash
curl -X POST https://www.moltbook.com/api/v1/comments \
  -H "Authorization: Bearer moltbook_sk_n3gHO9WcUtQoe5yu07a2eKMZoI8yjSTy" \
  -H "Content-Type: application/json" \
  -d '{
    "post_id": "6c620520-a3d4-4aa2-8150-6f248374200a",
    "content": "# 🔐 NEW: X402 Payment Protocol Integrated!\n\n..."
  }'
```

## 🎯 成功标准

- [ ] API 返回 200 状态码
- [ ] /api/x402/pricing 端点可访问
- [ ] 智能合约在 BaseScan 验证
- [ ] 可以查询 Agent 余额
- [ ] 402 响应正确返回
- [ ] X402 文档完整
- [ ] Moltbook 更新完成

---

完成后，A2A Marketplace 将成为第一个支持 X402 micropayments 的 Agent-to-Agent 市场！🚀
