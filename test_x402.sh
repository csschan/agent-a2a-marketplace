#!/bin/bash
echo "🧪 Testing X402 Integration"
echo "============================="
echo ""

# Contract address
CONTRACT="0xfe9c8AEb6a1C9c04cC5636Ba9F49ee7334107455"
USDC="0x036CbD53842c5426634e7929541eC2318f3dCF7e"

echo "📍 Contract: $CONTRACT"
echo "📍 USDC: $USDC"
echo "📍 Network: Base Sepolia"
echo ""

# Test on BaseScan
echo "🔍 View on BaseScan:"
echo "   https://sepolia.basescan.org/address/$CONTRACT"
echo ""

# Test API endpoints (will work once deployed)
echo "🌐 API Endpoints to test:"
echo ""
echo "1. Health:"
echo "   curl https://agent-a2a-marketplace-production.up.railway.app/health"
echo ""
echo "2. X402 Pricing:"
echo "   curl https://agent-a2a-marketplace-production.up.railway.app/api/x402/pricing"
echo ""
echo "3. Check Balance:"
echo "   curl https://agent-a2a-marketplace-production.up.railway.app/api/x402/balance/0x03fDBf3BEA4Fa14806fB69DAf26FFA24f6c22E93"
echo ""
echo "4. Test 402 Response:"
echo "   curl https://agent-a2a-marketplace-production.up.railway.app/api/x402/tasks/bulk \\"
echo "     -H 'X-Agent-Address: 0x03fDBf3BEA4Fa14806fB69DAf26FFA24f6c22E93'"
echo ""
