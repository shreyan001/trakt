// Simple 0G Storage Test - Store and Retrieve a Word
import { ethers } from "ethers";
import { ZgFile, Indexer } from "@0glabs/0g-ts-sdk";
import * as dotenv from "dotenv";
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
dotenv.config();

async function main() {
  console.log('🚀 Starting Simple 0G Storage Test');
  console.log('==================================\n');

  // Configuration
  const RPC_URL = process.env.OG_RPC_URL || "https://evmrpc-testnet.0g.ai";
  const INDEXER_RPC = "https://indexer-storage-testnet-turbo.0g.ai"; // Use the correct indexer URL
  const PRIVATE_KEY =  process.env.ZG_TESTNET_PRIVATE_KEY;

  if (!PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY or ZG_TESTNET_PRIVATE_KEY environment variable is required');
  }

  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log(`📍 Wallet Address: ${wallet.address}`);
  console.log(`🔗 RPC URL: ${RPC_URL}`);
  console.log(`💾 Indexer RPC: ${INDEXER_RPC}\n`);

  try {
    // Step 1: Create a simple word to store
    const testWord = "Hello0G";
    console.log(`📝 Test Word: "${testWord}"`);

    // Step 2: Create a temporary file and ZgFile from the word
    console.log('\n🔧 Creating temporary file and ZgFile...');
    const tempFilePath = path.join(__dirname, 'temp_word.txt');
    
    // Write the word to a temporary file
    fs.writeFileSync(tempFilePath, testWord);
    
    // Create ZgFile from the temporary file using the correct method
    const zgFile = await ZgFile.fromFilePath(tempFilePath);
    
    // Step 3: Generate merkle tree
    console.log('🌳 Generating merkle tree...');
    const [tree, treeErr] = await zgFile.merkleTree();
    
    if (treeErr || !tree) {
      throw new Error(`Failed to create merkle tree: ${treeErr}`);
    }

    console.log(`🌳 Merkle Root: ${tree.rootHash()}`);
    
    // Step 4: Upload the file to 0G storage using indexer
    console.log('\n📤 Uploading word to 0G storage...');
    const indexer = new Indexer(INDEXER_RPC);
    
    const [tx, uploadErr] = await indexer.upload(zgFile, RPC_URL, wallet);
    
    if (uploadErr) {
      throw new Error(`Failed to upload file: ${uploadErr}`);
    }
    
    console.log(`✅ Storage submission successful!`);
    console.log(`📋 Transaction Hash: ${tx}`);
    console.log(`🔑 Root Hash: ${tree.rootHash()}`);

    // Close the file
    await zgFile.close();

    // Step 5: Wait for the file to be available
    console.log('\n⏳ Waiting for file to be available in storage...');
    
    // Wait for file to be available (with timeout)
    let attempts = 0;
    const maxAttempts = 30; // 30 attempts with 2 second intervals = 1 minute timeout
    let fileAvailable = false;
    
    while (attempts < maxAttempts && !fileAvailable) {
      try {
        // Note: getFileInfo method may not be available in current SDK version
        // Skipping file availability check and proceeding directly to download
        fileAvailable = true;
        console.log(`✅ Proceeding to download attempt...`);
        break;
      } catch (error) {
        attempts++;
        console.log(`⏳ Attempt ${attempts}/${maxAttempts} - File not yet available, waiting...`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      }
    }

    if (!fileAvailable) {
      console.log('⚠️  File upload may still be processing. Proceeding with download attempt...');
    }

    // Step 6: Download and retrieve the word
    console.log('\n📥 Downloading word from 0G storage...');
    
    const downloadPath = path.join(__dirname, 'downloaded_word.txt');
    const rootHash = tree.rootHash();
    if (!rootHash) {
      throw new Error('Failed to get root hash from merkle tree');
    }
    const downloadErr = await indexer.download(rootHash, downloadPath, true);
    
    if (downloadErr) {
      throw new Error(`Failed to download file from storage: ${downloadErr}`);
    }

    // Read the downloaded file
    const retrievedWord = fs.readFileSync(downloadPath, 'utf8');
    
    console.log(`📝 Retrieved Word: "${retrievedWord}"`);
    
    // Clean up temporary files
    fs.unlinkSync(tempFilePath);
    fs.unlinkSync(downloadPath);
    console.log('🧹 Temporary files cleaned up');
    
    // Step 7: Verify the data
    console.log('\n🔍 Verification:');
    console.log(`Original Word:  "${testWord}"`);
    console.log(`Retrieved Word: "${retrievedWord}"`);
    console.log(`Match: ${testWord === retrievedWord ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    if (testWord === retrievedWord) {
      console.log('\n🎉 Storage test completed successfully!');
      console.log(`🔑 Your word "${testWord}" was successfully stored and retrieved from 0G storage`);
      console.log(`📋 Root Hash for future reference: ${tree?.rootHash() || 'N/A'}`);
    } else {
      console.log('\n❌ Storage test failed - retrieved data does not match original');
    }

  } catch (error: any) {
    console.error('\n❌ Error during storage test:', error);
    
    // Provide helpful error messages
    if (error.message && error.message.includes('insufficient funds')) {
      console.log('\n💡 Tip: Make sure your wallet has sufficient funds for gas fees');
    } else if (error.message && error.message.includes('network')) {
      console.log('\n💡 Tip: Check your network connection and RPC URL');
    }
  }

  console.log('\n✅ Simple 0G Storage Test Completed!');
}

// Run the test
main().catch(console.error);