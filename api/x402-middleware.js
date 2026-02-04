/**
 * X402 Payment Required Middleware
 * Implements HTTP 402 for agent micropayments
 */

const { ethers } = require('ethers');

class X402Middleware {
  constructor(marketplace, usdc) {
    this.marketplace = marketplace;
    this.usdc = usdc;

    // Pricing tiers
    this.pricing = {
      premiumTaskAccess: ethers.parseUnits("0.1", 6),   // 0.1 USDC
      apiCall: ethers.parseUnits("0.01", 6),            // 0.01 USDC per call
      taskDetails: ethers.parseUnits("0.05", 6),        // 0.05 USDC
      bulkQuery: ethers.parseUnits("0.2", 6)            // 0.2 USDC for bulk operations
    };
  }

  /**
   * Check if agent has sufficient balance
   */
  async checkBalance(agentAddress, requiredAmount) {
    try {
      const balance = await this.marketplace.getBalance(agentAddress);
      return balance >= requiredAmount;
    } catch (error) {
      console.error('Balance check failed:', error);
      return false;
    }
  }

  /**
   * Charge agent for service
   */
  async chargeAgent(agentAddress, amount, description = 'API call') {
    try {
      const tx = await this.marketplace.chargeApiCall(agentAddress, amount);
      await tx.wait();
      console.log(`✅ Charged ${ethers.formatUnits(amount, 6)} USDC to ${agentAddress} for ${description}`);
      return true;
    } catch (error) {
      console.error('Charge failed:', error);
      return false;
    }
  }

  /**
   * Middleware for premium endpoints
   */
  requirePayment(cost = null) {
    return async (req, res, next) => {
      // Extract agent address from header or query
      const agentAddress = req.headers['x-agent-address'] || req.query.agent;

      if (!agentAddress || !ethers.isAddress(agentAddress)) {
        return res.status(400).json({
          error: 'Invalid or missing agent address',
          hint: 'Include X-Agent-Address header or ?agent=0x... query parameter'
        });
      }

      // Determine cost
      const requiredCost = cost || this.pricing.apiCall;

      // Check balance
      const hasBalance = await this.checkBalance(agentAddress, requiredCost);

      if (!hasBalance) {
        const currentBalance = await this.marketplace.getBalance(agentAddress);

        // Return 402 Payment Required
        return res.status(402).json({
          error: 'Payment Required',
          message: 'Insufficient balance for this operation',
          required_usdc: ethers.formatUnits(requiredCost, 6),
          current_balance_usdc: ethers.formatUnits(currentBalance, 6),
          deficit_usdc: ethers.formatUnits(requiredCost - currentBalance, 6),
          deposit_endpoint: '/api/x402/deposit',
          instructions: 'Deposit USDC using the depositBalance() function',
          headers: {
            'X-Payment-Required': 'true',
            'X-Required-Amount': ethers.formatUnits(requiredCost, 6),
            'X-Payment-Address': await this.marketplace.getAddress(),
            'X-Payment-Token': await this.usdc.getAddress(),
            'X-Accept-Payment': 'USDC'
          }
        });
      }

      // Charge the agent
      const charged = await this.chargeAgent(agentAddress, requiredCost, req.path);

      if (!charged) {
        return res.status(500).json({
          error: 'Payment processing failed',
          message: 'Unable to charge your account'
        });
      }

      // Add balance info to request
      req.agentAddress = agentAddress;
      req.chargedAmount = requiredCost;
      req.remainingBalance = await this.marketplace.getBalance(agentAddress);

      // Continue to endpoint
      next();
    };
  }

  /**
   * Middleware for task access verification
   */
  requireTaskAccess(taskIdParam = 'taskId') {
    return async (req, res, next) => {
      const agentAddress = req.headers['x-agent-address'] || req.query.agent;
      const taskId = req.params[taskIdParam] || req.body.taskId;

      if (!agentAddress || !ethers.isAddress(agentAddress)) {
        return res.status(400).json({
          error: 'Invalid or missing agent address'
        });
      }

      if (!taskId) {
        return res.status(400).json({
          error: 'Task ID required'
        });
      }

      // Check if agent has access
      const hasAccess = await this.marketplace.checkTaskAccess(taskId, agentAddress);

      if (!hasAccess) {
        const accessFee = this.pricing.premiumTaskAccess;
        const balance = await this.marketplace.getBalance(agentAddress);

        return res.status(402).json({
          error: 'Task Access Required',
          message: 'Purchase access to view full task details',
          task_id: taskId,
          access_fee_usdc: ethers.formatUnits(accessFee, 6),
          current_balance_usdc: ethers.formatUnits(balance, 6),
          purchase_endpoint: `/api/x402/tasks/${taskId}/purchase-access`,
          instructions: 'Call purchaseTaskAccess() or use the purchase endpoint'
        });
      }

      req.agentAddress = agentAddress;
      req.taskId = taskId;
      next();
    };
  }

  /**
   * Response helper to add x402 headers
   */
  addPaymentHeaders(res, options = {}) {
    res.setHeader('X-Payment-Protocol', 'x402');
    res.setHeader('X-Accept-Payment', 'USDC');

    if (options.balance) {
      res.setHeader('X-Agent-Balance', ethers.formatUnits(options.balance, 6));
    }

    if (options.cost) {
      res.setHeader('X-Call-Cost', ethers.formatUnits(options.cost, 6));
    }

    if (options.remaining) {
      res.setHeader('X-Remaining-Balance', ethers.formatUnits(options.remaining, 6));
    }

    return res;
  }
}

module.exports = X402Middleware;
