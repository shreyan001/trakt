// Simple 0G Storage Test - Alternative Approach
import { ethers } from "ethers";
import { ZgFile, Indexer } from "@0glabs/0g-ts-sdk";
import * as dotenv from "dotenv";
import * as fs from 'fs';
import * as path from 'path';


// Load environment variables
dotenv.config();

async function main() {
  console.log('🚀 Starting Simple 0G Storage Test (Alternative)');
  console.log('================================================\n');

  // Configuration - using different endpoints
  const RPC_URL = "https://evmrpc-testnet.0g.ai";
  const INDEXER_RPC = "https://indexer-storage-testnet-standard.0g.ai"; // Try standard endpoint
  const PRIVATE_KEY = process.env.PRIVATE_KEY || process.env.ZG_TESTNET_PRIVATE_KEY;

  if (!PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY or ZG_TESTNET_PRIVATE_KEY environment variable is required');
  }

  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log(`📍 Wallet Address: ${wallet.address}`);
  console.log(`🔗 RPC URL: ${RPC_URL}`);
  console.log(`💾 Indexer RPC: ${INDEXER_RPC}\n`);

  // Check wallet balance first
  try {
    const balance = await provider.getBalance(wallet.address);
    console.log(`💰 Wallet Balance: ${ethers.formatEther(balance)} ETH`);
    
    if (balance === 0n) {
      console.log('⚠️  Warning: Wallet has no balance. You may need testnet funds.');
      console.log('💡 Get testnet funds from: https://faucet.0g.ai/');
    }
  } catch (error: any) {
    console.log('⚠️  Could not check wallet balance:', error.message);
  }

  try {
    // Step 1: Create a simple word to store
    const testWord = "Hello0G";
    console.log(`\n📝 Test Word: "${testWord}"`);

    // Step 2: Create a temporary file and ZgFile from the word
    console.log('🔧 Creating temporary file and ZgFile...');
    const tempFilePath = path.join(__dirname, 'temp_word.txt');
    
    // Write the word to a temporary file
    fs.writeFileSync(tempFilePath, testWord);
    console.log(`📁 Temporary file created: ${tempFilePath}`);
    
    // Create ZgFile from the temporary file using the correct method
    console.log('📦 Creating ZgFile from file...');
    const zgFile = await ZgFile.fromFilePath(tempFilePath);
    
    // Step 3: Generate merkle tree
    console.log('🌳 Generating merkle tree...');
    const [tree, treeErr] = await zgFile.merkleTree();
    
    if (treeErr) {
      throw new Error(`Failed to create merkle tree: ${treeErr}`);
    }

    console.log(`✅ Merkle tree generated successfully`);
    console.log(`🔑 Merkle Root: ${tree.rootHash()}`);
    
    // Step 4: Try to upload the file to 0G storage using indexer
    console.log('\n📤 Attempting to upload word to 0G storage...');
    console.log('⏳ This may take a moment...');
    
    const indexer = new Indexer(INDEXER_RPC);
    
    // Set a longer timeout and try upload
    const uploadPromise = indexer.upload(zgFile, RPC_URL, wallet);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Upload timeout after 60 seconds')), 60000)
    );
    
    try {
      const [tx, uploadErr] = await Promise.race([uploadPromise, timeoutPromise]);
      
      if (uploadErr) {
        throw new Error(`Failed to upload file: ${uploadErr}`);
      }
      
      console.log(`✅ Storage submission successful!`);
      console.log(`📋 Transaction Hash: ${tx}`);
      console.log(`🔑 Root Hash: ${tree.rootHash()}`);

      // Close the file
      await zgFile.close();

      // Step 5: Try to download the file
      console.log('\n📥 Attempting to download word from 0G storage...');
      
      const downloadPath = path.join(__dirname, 'downloaded_word.txt');
      
      // Try download with timeout
      const downloadPromise = indexer.download(tree.rootHash(), downloadPath, true);
      const downloadTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Download timeout after 30 seconds')), 30000)
      );
      
      const downloadErr = await Promise.race([downloadPromise, downloadTimeoutPromise]);
      
      if (downloadErr) {
        console.log(`⚠️  Download failed: ${downloadErr}`);
        console.log('💡 This might be because the file is still being processed in the network');
      } else {
        // Read the downloaded file
        const retrievedWord = fs.readFileSync(downloadPath, 'utf8');
        
        console.log(`📝 Retrieved Word: "${retrievedWord}"`);
        
        // Verify the data
        console.log('\n🔍 Verification:');
        console.log(`Original Word:  "${testWord}"`);
        console.log(`Retrieved Word: "${retrievedWord}"`);
        console.log(`Match: ${testWord === retrievedWord ? '✅ SUCCESS' : '❌ FAILED'}`);
        
        if (testWord === retrievedWord) {
          console.log('\n🎉 Storage test completed successfully!');
          console.log(`🔑 Your word "${testWord}" was successfully stored and retrieved from 0G storage`);
          console.log(`📋 Root Hash for future reference: ${tree.rootHash()}`);
        } else {
          console.log('\n❌ Storage test failed - retrieved data does not match original');
        }
        
        // Clean up downloaded file
        fs.unlinkSync(downloadPath);
      }
      
    } catch (uploadError: any) {
      console.log(`⚠️  Upload failed: ${uploadError.message}`);
      
      if (uploadError.message.includes('timeout')) {
        console.log('💡 The upload timed out, but the file might still be processing');
        console.log('🔑 Root Hash for future reference: ' + tree.rootHash());
        console.log('💡 You can try to download later using this root hash');
      } else if (uploadError.message.includes('insufficient funds')) {
        console.log('💡 Make sure your wallet has sufficient funds for gas fees');
        console.log('💡 Get testnet funds from: https://faucet.0g.ai/');
      } else {
        console.log('💡 This might be a network connectivity issue or the storage network might be busy');
      }
      
      // Still close the file
      await zgFile.close();
    }
    
    // Clean up temporary file
    fs.unlinkSync(tempFilePath);
    console.log('🧹 Temporary file cleaned up');

  } catch (error: any) {
    console.error('\n❌ Error during storage test:', error.message);
    
    // Provide helpful error messages
    if (error.message.includes('insufficient funds')) {
      console.log('\n💡 Tip: Make sure your wallet has sufficient funds for gas fees');
      console.log('💡 Get testnet funds from: https://faucet.0g.ai/');
    } else if (error.message.includes('network') || error.message.includes('timeout')) {
      console.log('\n💡 Tip: Check your network connection and try again');
      console.log('💡 The 0G storage network might be experiencing high load');
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('\n💡 Tip: DNS resolution failed - check your internet connection');
    }
  }

  console.log('\n✅ Simple 0G Storage Test Completed!');
  console.log('📝 Summary:');
  console.log('   - Created a test word: "Hello0G"');
  console.log('   - Generated merkle tree successfully');
  console.log('   - Attempted upload to 0G storage network');
  console.log('   - This demonstrates the basic 0G storage workflow');
}

// Run the test
main().catch(console.error);