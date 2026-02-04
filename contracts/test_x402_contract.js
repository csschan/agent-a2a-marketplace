const { ethers } = require('ethers');

async function testX402() {
  console.log('🧪 Testing X402 Contract Functions\n');
  console.log('=' .repeat(60));
  
  const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");
  const contractAddress = "0xfe9c8AEb6a1C9c04cC5636Ba9F49ee7334107455";
  
  const abi = [
    "function defaultAccessFee() view returns (uint256)",
    "function apiCallCost() view returns (uint256)",
    "function getBalance(address) view returns (uint256)",
    "function taskCounter() view returns (uint256)"
  ];
  
  const contract = new ethers.Contract(contractAddress, abi, provider);
  
  try {
    console.log('📍 Contract: ' + contractAddress);
    console.log('📍 Network: Base Sepolia\n');
    
    // Test 1: Default Access Fee
    console.log('Test 1: Default Access Fee');
    const accessFee = await contract.defaultAccessFee();
    console.log('✅ Default Access Fee: ' + ethers.formatUnits(accessFee, 6) + ' USDC\n');
    
    // Test 2: API Call Cost
    console.log('Test 2: API Call Cost');
    const apiCost = await contract.apiCallCost();
    console.log('✅ API Call Cost: ' + ethers.formatUnits(apiCost, 6) + ' USDC\n');
    
    // Test 3: Check Balance
    console.log('Test 3: Check Balance');
    const testAddress = "0x03fDBf3BEA4Fa14806fB69DAf26FFA24f6c22E93";
    const balance = await contract.getBalance(testAddress);
    console.log('✅ Balance for ' + testAddress + ': ' + ethers.formatUnits(balance, 6) + ' USDC\n');
    
    // Test 4: Task Counter
    console.log('Test 4: Task Counter');
    const taskCount = await contract.taskCounter();
    console.log('✅ Total Tasks: ' + taskCount.toString() + '\n');
    
    console.log('=' .repeat(60));
    console.log('🎉 All X402 Contract Tests Passed!\n');
    
    return true;
  } catch (error) {
    console.error('❌ Test Failed:', error.message);
    return false;
  }
}

testX402();
