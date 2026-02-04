/**
 * X402 Premium API Routes
 * Agent micropayment endpoints
 */

const express = require('express');
const { ethers } = require('ethers');

function createX402Routes(marketplace, usdc, x402Middleware) {
  const router = express.Router();

  // ============ Balance Management ============

  /**
   * GET agent balance
   */
  router.get('/balance/:address', async (req, res) => {
    try {
      const { address } = req.params;

      if (!ethers.isAddress(address)) {
        return res.status(400).json({ error: 'Invalid address' });
      }

      const balance = await marketplace.getBalance(address);
      const usdcBalance = await usdc.balanceOf(address);
      const apiCalls = await marketplace.apiCallCount(address);

      res.json({
        address,
        x402_balance_usdc: ethers.formatUnits(balance, 6),
        wallet_usdc: ethers.formatUnits(usdcBalance, 6),
        total_api_calls: apiCalls.toString(),
        deposit_instructions: {
          method: 'Call depositBalance(amount) on contract',
          contract: await marketplace.getAddress(),
          note: 'Approve USDC first, then deposit'
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST deposit balance helper (generates transaction data)
   */
  router.post('/deposit', async (req, res) => {
    try {
      const { amount_usdc } = req.body;

      if (!amount_usdc || isNaN(amount_usdc)) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      const amount = ethers.parseUnits(amount_usdc.toString(), 6);
      const marketplaceAddress = await marketplace.getAddress();
      const usdcAddress = await usdc.getAddress();

      // Generate transaction data
      const approveTx = {
        to: usdcAddress,
        data: usdc.interface.encodeFunctionData('approve', [marketplaceAddress, amount]),
        description: `Approve ${amount_usdc} USDC`
      };

      const depositTx = {
        to: marketplaceAddress,
        data: marketplace.interface.encodeFunctionData('depositBalance', [amount]),
        description: `Deposit ${amount_usdc} USDC for x402 payments`
      };

      res.json({
        message: 'Execute these transactions in order',
        amount_usdc: amount_usdc.toString(),
        transactions: [
          {
            step: 1,
            ...approveTx
          },
          {
            step: 2,
            ...depositTx
          }
        ],
        curl_example: `curl -X POST ${req.protocol}://${req.get('host')}/api/x402/deposit -H "Content-Type: application/json" -d '{"amount_usdc": ${amount_usdc}}'`
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST withdraw balance
   */
  router.post('/withdraw', async (req, res) => {
    try {
      const { amount_usdc } = req.body;

      if (!amount_usdc || isNaN(amount_usdc)) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      const amount = ethers.parseUnits(amount_usdc.toString(), 6);

      res.json({
        message: 'Call withdrawBalance() on contract',
        amount_usdc: amount_usdc.toString(),
        contract: await marketplace.getAddress(),
        function: 'withdrawBalance',
        params: [amount.toString()]
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============ Task Access ============

  /**
   * GET premium task details (requires payment or access)
   */
  router.get('/tasks/:taskId/premium',
    x402Middleware.requireTaskAccess('taskId'),
    async (req, res) => {
      try {
        const { taskId } = req.params;
        const task = await marketplace.getTask(taskId);

        // Add payment info to response
        x402Middleware.addPaymentHeaders(res, {
          balance: req.remainingBalance,
          cost: x402Middleware.pricing.premiumTaskAccess
        });

        res.json({
          message: 'Premium task details',
          task: {
            id: taskId,
            description: task.description,
            reward_usdc: ethers.formatUnits(task.reward, 6),
            poster: task.poster,
            assignee: task.assignedTo,
            status: task.status,
            proof_uri: task.proofURI,
            deadline: new Date(Number(task.deadline) * 1000).toISOString(),
            created_at: new Date(Number(task.createdAt) * 1000).toISOString()
          },
          access_info: {
            agent: req.agentAddress,
            access_granted: true,
            remaining_balance_usdc: ethers.formatUnits(req.remainingBalance, 6)
          }
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  /**
   * POST purchase task access
   */
  router.post('/tasks/:taskId/purchase-access', async (req, res) => {
    try {
      const { taskId } = req.params;
      const agentAddress = req.headers['x-agent-address'] || req.body.agent_address;

      if (!agentAddress || !ethers.isAddress(agentAddress)) {
        return res.status(400).json({ error: 'Invalid agent address' });
      }

      // Return transaction data for agent to execute
      const marketplaceAddress = await marketplace.getAddress();

      res.json({
        message: 'Execute this transaction to purchase access',
        task_id: taskId,
        agent: agentAddress,
        transaction: {
          to: marketplaceAddress,
          data: marketplace.interface.encodeFunctionData('purchaseTaskAccess', [taskId]),
          description: `Purchase access to task #${taskId}`
        },
        after_purchase: `Access /api/x402/tasks/${taskId}/premium to view details`
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============ Premium API Endpoints ============

  /**
   * GET bulk task query (paid)
   */
  router.get('/tasks/bulk',
    x402Middleware.requirePayment(x402Middleware.pricing.bulkQuery),
    async (req, res) => {
      try {
        const totalTasks = await marketplace.taskCounter();
        const tasks = [];

        for (let i = 1; i <= totalTasks; i++) {
          const task = await marketplace.getTask(i);
          tasks.push({
            id: i,
            description: task.description,
            reward_usdc: ethers.formatUnits(task.reward, 6),
            status: task.status,
            poster: task.poster,
            assignee: task.assignedTo
          });
        }

        x402Middleware.addPaymentHeaders(res, {
          balance: req.remainingBalance,
          cost: x402Middleware.pricing.bulkQuery,
          remaining: req.remainingBalance
        });

        res.json({
          message: 'Bulk task query (premium)',
          total: tasks.length,
          tasks,
          charged_usdc: ethers.formatUnits(req.chargedAmount, 6),
          remaining_balance_usdc: ethers.formatUnits(req.remainingBalance, 6)
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  /**
   * GET agent analytics (paid)
   */
  router.get('/analytics/:address',
    x402Middleware.requirePayment(x402Middleware.pricing.apiCall),
    async (req, res) => {
      try {
        const { address } = req.params;

        if (!ethers.isAddress(address)) {
          return res.status(400).json({ error: 'Invalid address' });
        }

        const [earnings, tasksCompleted] = await marketplace.getAgentStats(address);
        const balance = await marketplace.getBalance(address);
        const apiCalls = await marketplace.apiCallCount(address);

        x402Middleware.addPaymentHeaders(res, {
          balance: req.remainingBalance,
          cost: x402Middleware.pricing.apiCall,
          remaining: req.remainingBalance
        });

        res.json({
          message: 'Agent analytics (premium)',
          agent: address,
          stats: {
            total_earnings_usdc: ethers.formatUnits(earnings, 6),
            tasks_completed: tasksCompleted.toString(),
            x402_balance_usdc: ethers.formatUnits(balance, 6),
            api_calls_made: apiCalls.toString()
          },
          charged_usdc: ethers.formatUnits(req.chargedAmount, 6),
          remaining_balance_usdc: ethers.formatUnits(req.remainingBalance, 6)
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  );

  // ============ Pricing Info ============

  /**
   * GET pricing tiers
   */
  router.get('/pricing', async (req, res) => {
    try {
      const defaultAccessFee = await marketplace.defaultAccessFee();
      const apiCallCost = await marketplace.apiCallCost();

      res.json({
        message: 'X402 Payment Protocol - Pricing',
        protocol: 'x402',
        token: 'USDC',
        marketplace_contract: await marketplace.getAddress(),
        usdc_token: await usdc.getAddress(),
        pricing: {
          premium_task_access: {
            cost_usdc: ethers.formatUnits(x402Middleware.pricing.premiumTaskAccess, 6),
            description: 'Access full task details before accepting'
          },
          api_call: {
            cost_usdc: ethers.formatUnits(x402Middleware.pricing.apiCall, 6),
            description: 'Standard API call charge'
          },
          task_details: {
            cost_usdc: ethers.formatUnits(x402Middleware.pricing.taskDetails, 6),
            description: 'Detailed task information'
          },
          bulk_query: {
            cost_usdc: ethers.formatUnits(x402Middleware.pricing.bulkQuery, 6),
            description: 'Query all tasks at once'
          }
        },
        contract_settings: {
          default_access_fee_usdc: ethers.formatUnits(defaultAccessFee, 6),
          api_call_cost_usdc: ethers.formatUnits(apiCallCost, 6)
        },
        how_to_use: {
          step_1: 'Deposit USDC using depositBalance()',
          step_2: 'Include X-Agent-Address header in requests',
          step_3: 'API automatically charges your balance',
          step_4: 'Receive 402 Payment Required if insufficient balance'
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = createX402Routes;
