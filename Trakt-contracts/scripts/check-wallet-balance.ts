// Simple Wallet Balance Checker for 0G Network
import { ethers } from "ethers";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function checkWalletBalance() {
  console.log('🔍 Checking Wallet Balance on 0G Network');
  console.log('=========================================\n');

  // Configuration
  const RPC_URL = process.env.OG_RPC_URL || "https://evmrpc-testnet.0g.ai";
  const PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.ZG_TESTNET_PRIVATE_KEY;

  if (!PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY or ZG_TESTNET_PRIVATE_KEY environment variable is required');
  }

  try {
    // Setup provider and wallet
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    console.log(`📍 Wallet Address: ${wallet.address}`);
    console.log(`🔗 RPC URL: ${RPC_URL}\n`);

    // Check network connection
    console.log('🌐 Checking network connection...');
    const network = await provider.getNetwork();
    console.log(`✅ Connected to network: ${network.name} (Chain ID: ${network.chainId})\n`);

    // Check wallet balance
    console.log('💰 Checking wallet balance...');
    const balance = await provider.getBalance(wallet.address);
    const balanceInEth = ethers.formatEther(balance);
    
    console.log(`💰 Balance: ${balanceInEth} ETH`);
    console.log(`💰 Balance (Wei): ${balance.toString()}\n`);

    // Determine if wallet has sufficient funds
    if (balance === 0n) {
      console.log('❌ Wallet has no funds!');
      console.log('💡 Get testnet funds from: https://faucet.0g.ai/');
      console.log('💡 You need funds to perform storage operations\n');
    } else if (balance < ethers.parseEther('0.001')) {
      console.log('⚠️  Wallet has very low funds!');
      console.log('💡 Consider getting more testnet funds from: https://faucet.0g.ai/');
      console.log('💡 Current balance might not be sufficient for multiple operations\n');
    } else {
      console.log('✅ Wallet has sufficient funds for operations!');
      console.log('🚀 You can proceed with storage or other operations\n');
    }

    // Get latest block info
    console.log('📊 Network Status:');
    const blockNumber = await provider.getBlockNumber();
    const block = await provider.getBlock(blockNumber);
    console.log(`📦 Latest Block: ${blockNumber}`);
    console.log(`⏰ Block Timestamp: ${new Date(block!.timestamp * 1000).toISOString()}`);
    
  } catch (error: any) {
    console.error('❌ Error checking wallet balance:', error.message);
    
    if (error.message.includes('network') || error.message.includes('timeout')) {
      console.log('💡 Network connection issue. Check your internet connection.');
    } else if (error.message.includes('invalid') && error.message.includes('key')) {
      console.log('💡 Invalid private key. Check your environment variables.');
    }
  }

  console.log('\n✅ Wallet Balance Check Completed!');
}

// Run the balance check
checkWalletBalance().catch(console.error);