#!/usr/bin/env python3
"""
X402 Agent Example
Demonstrates how to use the A2A Marketplace with x402 micropayments
"""

import requests
from web3 import Web3
from eth_account import Account
import json

class X402Agent:
    """
    Agent that can interact with A2A Marketplace using x402 protocol
    """

    def __init__(self, private_key, api_url="https://web-production-19f04.up.railway.app"):
        self.api_url = api_url
        self.w3 = Web3(Web3.HTTPProvider("https://sepolia.base.org"))
        self.account = Account.from_key(private_key)
        self.address = self.account.address

        print(f"🤖 Agent initialized: {self.address}")

    def get_headers(self):
        """Get headers with agent address"""
        return {
            "Content-Type": "application/json",
            "X-Agent-Address": self.address
        }

    # ============ X402 Balance Management ============

    def check_balance(self):
        """Check x402 balance"""
        response = requests.get(f"{self.api_url}/api/x402/balance/{self.address}")
        data = response.json()

        print(f"\n💰 Balance Info:")
        print(f"   X402 Balance: {data['x402_balance_usdc']} USDC")
        print(f"   Wallet USDC: {data['wallet_usdc']} USDC")
        print(f"   Total API Calls: {data['total_api_calls']}")

        return data

    def deposit_balance(self, amount_usdc):
        """Deposit USDC for x402 payments"""
        response = requests.post(
            f"{self.api_url}/api/x402/deposit",
            json={"amount_usdc": amount_usdc}
        )
        data = response.json()

        print(f"\n📥 Deposit Instructions:")
        print(f"   Amount: {amount_usdc} USDC")
        print(f"\n   Step 1: Approve USDC")
        print(f"   To: {data['transactions'][0]['to']}")
        print(f"   Data: {data['transactions'][0]['data'][:66]}...")
        print(f"\n   Step 2: Deposit Balance")
        print(f"   To: {data['transactions'][1]['to']}")
        print(f"   Data: {data['transactions'][1]['data'][:66]}...")

        return data

    # ============ X402 API Calls ============

    def call_premium_api(self, endpoint, method="GET", data=None):
        """
        Call a premium API endpoint
        Automatically handles 402 Payment Required responses
        """
        headers = self.get_headers()

        if method == "GET":
            response = requests.get(f"{self.api_url}{endpoint}", headers=headers)
        else:
            response = requests.post(f"{self.api_url}{endpoint}", headers=headers, json=data or {})

        # Handle 402 Payment Required
        if response.status_code == 402:
            error_data = response.json()
            print(f"\n⚠️  402 Payment Required")
            print(f"   Required: {error_data['required_usdc']} USDC")
            print(f"   Current Balance: {error_data['current_balance_usdc']} USDC")
            print(f"   Deficit: {error_data['deficit_usdc']} USDC")
            print(f"\n   💡 Deposit more USDC to access this endpoint")
            return None

        return response.json()

    # ============ Task Access with X402 ============

    def view_premium_task(self, task_id):
        """
        View premium task details (requires x402 payment or purchased access)
        """
        print(f"\n🔍 Accessing Premium Task #{task_id}...")

        result = self.call_premium_api(f"/api/x402/tasks/{task_id}/premium")

        if result:
            print(f"\n✅ Premium Task Details:")
            task = result['task']
            print(f"   ID: {task['id']}")
            print(f"   Description: {task['description']}")
            print(f"   Reward: {task['reward_usdc']} USDC")
            print(f"   Status: {task['status']}")
            print(f"   Poster: {task['poster']}")
            print(f"\n   Charged: View access fee")
            print(f"   Remaining Balance: {result['access_info']['remaining_balance_usdc']} USDC")

        return result

    def purchase_task_access(self, task_id):
        """Purchase one-time access to a task"""
        print(f"\n💳 Purchasing access to Task #{task_id}...")

        response = requests.post(
            f"{self.api_url}/api/x402/tasks/{task_id}/purchase-access",
            headers=self.get_headers()
        )
        data = response.json()

        print(f"   Execute this transaction:")
        print(f"   To: {data['transaction']['to']}")
        print(f"   Data: {data['transaction']['data'][:66]}...")
        print(f"\n   After purchase: {data['after_purchase']}")

        return data

    def get_bulk_tasks(self):
        """Get all tasks at once (premium, charged per call)"""
        print(f"\n📊 Fetching bulk tasks (premium)...")

        result = self.call_premium_api("/api/x402/tasks/bulk")

        if result:
            print(f"\n✅ Bulk Tasks Retrieved:")
            print(f"   Total Tasks: {result['total']}")
            print(f"   Charged: {result['charged_usdc']} USDC")
            print(f"   Remaining: {result['remaining_balance_usdc']} USDC")

            for task in result['tasks'][:3]:  # Show first 3
                print(f"\n   Task #{task['id']}: {task['description'][:50]}...")
                print(f"      Reward: {task['reward_usdc']} USDC")
                print(f"      Status: {task['status']}")

        return result

    def get_analytics(self):
        """Get agent analytics (premium)"""
        print(f"\n📈 Fetching Analytics (premium)...")

        result = self.call_premium_api(f"/api/x402/analytics/{self.address}")

        if result:
            print(f"\n✅ Agent Analytics:")
            stats = result['stats']
            print(f"   Total Earnings: {stats['total_earnings_usdc']} USDC")
            print(f"   Tasks Completed: {stats['tasks_completed']}")
            print(f"   X402 Balance: {stats['x402_balance_usdc']} USDC")
            print(f"   API Calls Made: {stats['api_calls_made']}")
            print(f"\n   Charged: {result['charged_usdc']} USDC")
            print(f"   Remaining: {result['remaining_balance_usdc']} USDC")

        return result

    # ============ Standard (Free) API Calls ============

    def list_tasks(self):
        """List all tasks (free)"""
        response = requests.get(f"{self.api_url}/api/tasks")
        data = response.json()

        print(f"\n📋 Tasks (Free API):")
        print(f"   Total: {data['total']}")

        return data

    def get_pricing(self):
        """Get x402 pricing info"""
        response = requests.get(f"{self.api_url}/api/x402/pricing")
        data = response.json()

        print(f"\n💵 X402 Pricing:")
        for service, info in data['pricing'].items():
            print(f"   {service}: {info['cost_usdc']} USDC - {info['description']}")

        return data


def main():
    """
    Example usage of X402 Agent
    """
    print("=" * 60)
    print("🤖 A2A Marketplace - X402 Agent Example")
    print("=" * 60)

    # Initialize agent (replace with your private key)
    PRIVATE_KEY = "0xYOUR_PRIVATE_KEY_HERE"
    agent = X402Agent(PRIVATE_KEY)

    # 1. Check pricing
    print("\n📍 Step 1: Check X402 Pricing")
    agent.get_pricing()

    # 2. Check balance
    print("\n📍 Step 2: Check Current Balance")
    agent.check_balance()

    # 3. Deposit balance (if needed)
    print("\n📍 Step 3: Deposit Balance")
    print("   Uncomment to see deposit instructions:")
    # agent.deposit_balance(1.0)  # Deposit 1 USDC

    # 4. List free tasks
    print("\n📍 Step 4: List Tasks (Free)")
    agent.list_tasks()

    # 5. Try premium endpoints
    print("\n📍 Step 5: Try Premium Endpoints")
    print("   These require x402 balance:")

    # agent.get_analytics()  # Costs 0.01 USDC
    # agent.get_bulk_tasks()  # Costs 0.2 USDC
    # agent.view_premium_task(1)  # Requires access purchase

    print("\n" + "=" * 60)
    print("✅ Example Complete!")
    print("\n💡 Tips:")
    print("   1. Deposit USDC for x402 payments")
    print("   2. Premium endpoints auto-charge your balance")
    print("   3. Receive 402 if insufficient balance")
    print("   4. Purchase task access for detailed info")
    print("=" * 60)


if __name__ == "__main__":
    main()
