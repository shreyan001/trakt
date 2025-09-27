// mint.ts
import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { prepareAgentData, generateMockMetadata } from "./mockProofGenerator";
// 0G Storage SDK integration is handled in storageIntegration.ts

dotenv.config();

// Load contract ABI from deployment files
let agentNFTAbi: any;
let teeVerifierAbi: any;

try {
  // Load AgentNFT implementation ABI from build artifacts (not deployment proxy ABI)
  const agentNFTArtifact = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../../build/artifacts/contracts/AgentNFT.sol/AgentNFT.json"),
      "utf8"
    )
  );
  agentNFTAbi = agentNFTArtifact.abi;
  
  const teeVerifierDeployment = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../../deployments/zgTestnet/TEEVerifier.json"),
      "utf8"
    )
  );
  teeVerifierAbi = teeVerifierDeployment.abi;
} catch (error) {
  console.error("Error loading contract ABIs:", error);
  process.exit(1);
}

// Interface for metadata structure
interface AgentMetadata {
  dataHash: string;
  description: string;
  proof: string; // Hex string of proof bytes
}

async function main() {
  try {
    console.log("🚀 Starting mint process...");
    
    // --- SETUP ---
    console.log("📡 Setting up provider and signer...");
    const provider = new ethers.JsonRpcProvider(process.env.OG_RPC_URL);
    console.log(`Provider URL: ${process.env.OG_RPC_URL}`);
    
    // Use the private key from the .env file
    const signer = new ethers.Wallet(process.env.ZG_AGENT_NFT_CREATOR_PRIVATE_KEY!, provider);
    console.log(`Signer created successfully`);
    
    // Get contract address from deployment file
    console.log("📄 Loading contract deployment info...");
    const agentNFTDeployment = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "../../deployments/zgTestnet/AgentNFT.json"),
        "utf8"
      )
    );
    const contractAddress = agentNFTDeployment.address;
    console.log(`Contract address loaded: ${contractAddress}`);

    console.log(`Using contract at: ${contractAddress}`);
    console.log(`Signer address: ${signer.address}`);
    console.log(`AgentNFT ABI loaded: ${agentNFTAbi ? 'Yes' : 'No'}`);

    const agentNFT = new ethers.Contract(contractAddress, agentNFTAbi, signer);
    console.log(`AgentNFT contract instance created: ${agentNFT ? 'Success' : 'Failed'}`);
    
    // Get TEEVerifier address
    console.log("🔐 Loading TEEVerifier deployment info...");
    const teeVerifierDeployment = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "../../deployments/zgTestnet/TEEVerifier.json"),
        "utf8"
      )
    );
    const teeVerifierAddress = teeVerifierDeployment.address;
    console.log(`TEEVerifier address loaded: ${teeVerifierAddress}`);
    console.log(`Using TEEVerifier at: ${teeVerifierAddress}`);
    console.log(`TEEVerifier ABI loaded: ${teeVerifierAbi ? 'Yes' : 'No'}`);
    const teeVerifier = new ethers.Contract(teeVerifierAddress, teeVerifierAbi, signer);
    console.log(`TEEVerifier contract instance created: ${teeVerifier ? 'Success' : 'Failed'}`);

    // --- STEP 1: Prepare metadata and proofs ---
    // Use simplified implementation with predefined constants
    
    console.log("🔧 Preparing agent data with simplified implementation...");
    
    // Agent model data structure
    const agentModelData = {
      name: "EscrowAgent AI Model",
      description: "AI Agent specialized in providing reusable escrow smart contracts for 0G to NFT transactions",
      version: "1.0.0",
      parameters: {
        type: "llm",
        architecture: "transformer",
        contextLength: 4096,
        parameterCount: "7B"
      }
    };
    console.log("📋 Agent model data structure:", JSON.stringify(agentModelData, null, 2));
    
    // Prepare agent data with simplified implementation
    console.log("⚙️ Calling prepareAgentData function...");
    const agentMetadata: AgentMetadata[] = await prepareAgentData(agentModelData, signer);
    console.log("✅ prepareAgentData completed successfully");
    
    console.log(`Generated ${agentMetadata.length} metadata entries`);
    agentMetadata.forEach((meta, i) => {
      console.log(`  ${i+1}. ${meta.description} (${meta.dataHash.slice(0, 10)}...)`);
      console.log(`     - Data hash: ${meta.dataHash}`);
      console.log(`     - Proof length: ${meta.proof.length} characters`);
      console.log(`     - Proof preview: ${meta.proof.slice(0, 50)}...`);
    });

    // Extract proofs and descriptions from metadata
    console.log("📦 Extracting proofs and descriptions...");
    const proofs = agentMetadata.map(item => item.proof);
    const dataDescriptions = agentMetadata.map(item => item.description);
    console.log(`Extracted ${proofs.length} proofs and ${dataDescriptions.length} descriptions`);
    console.log("Proof types:", proofs.map(p => typeof p));
    console.log("Proof lengths:", proofs.map(p => p.length));

    // --- STEP 2: Verify proofs with TEEVerifier (optional test) ---
    console.log("🔍 Testing proof verification with TEEVerifier...");
    try {
      for (let i = 0; i < proofs.length; i++) {
        console.log(`Verifying proof ${i}:`);
        console.log(`  - Proof data: ${proofs[i]}`);
        console.log(`  - Proof type: ${typeof proofs[i]}`);
        console.log(`  - Is array: ${Array.isArray(proofs[i])}`);
        const verificationResult = await teeVerifier.verifyPreimage([proofs[i]]);
        console.log(`Proof ${i} verification result:`, verificationResult);
      }
      console.log("✅ All proofs verified successfully");
    } catch (error: any) {
      console.warn("⚠️ Proof verification test failed. This is expected with mock proofs:", error);
      console.log("📋 Error details:");
      console.log(`  - Error message: ${error?.message || 'Unknown error'}`);
      console.log(`  - Error code: ${error?.code || 'N/A'}`);
      console.log("🔄 Continuing with mint operation anyway for testing purposes...");
    }

    // --- STEP 3: Mint the NFT ---
    console.log("🎯 Starting NFT minting process...");
    
    // Default recipient is the signer if not specified
    const recipient = process.env.RECIPIENT_ADDRESS || signer.address;
    console.log(`📍 Recipient address: ${recipient}`);

    console.log("🔍 Pre-mint validation:");
    console.log(`- AgentNFT contract: ${agentNFT ? 'Initialized' : 'NOT INITIALIZED'}`);
    console.log(`- AgentNFT address: ${agentNFT?.target || 'UNDEFINED'}`);
    console.log(`- Number of proofs: ${proofs.length}`);
    console.log(`- Number of descriptions: ${dataDescriptions.length}`);
    console.log(`- Recipient: ${recipient}`);
    console.log(`- Signer: ${signer.address}`);
    
    // Validate mint function exists
    console.log(`- Mint function exists: ${typeof agentNFT?.mint === 'function' ? 'Yes' : 'No'}`);
    if (typeof agentNFT?.mint !== 'function') {
      throw new Error('AgentNFT contract mint function is not available');
    }
    
    console.log("📊 Detailed parameter validation:");
    proofs.forEach((proof, i) => {
      console.log(`  Proof ${i}: type=${typeof proof}, length=${proof?.length || 'undefined'}`);
    });
    dataDescriptions.forEach((desc, i) => {
      console.log(`  Description ${i}: type=${typeof desc}, length=${desc?.length || 'undefined'}`);
    });

    // Estimate gas for the transaction
    console.log("⛽ Estimating gas for mint transaction...");
    let gasEstimate;
    try {
      gasEstimate = await agentNFT.mint.estimateGas(
        proofs,
        dataDescriptions,
        recipient,
        { value: 0 } // If minting requires payment, add it here
      );
      console.log(`✅ Gas estimation successful: ${gasEstimate}`);
    } catch (gasError: any) {
      console.error("❌ Gas estimation failed:");
      console.error(`  - Error message: ${gasError?.message || 'Unknown error'}`);
      console.error(`  - Error code: ${gasError?.code || 'N/A'}`);
      console.error(`  - Full error:`, gasError);
      throw gasError;
    }

    console.log(`Estimated gas: ${gasEstimate}`);

    // Execute the mint transaction
    console.log("🚀 Executing mint transaction...");
    let tx;
    try {
      tx = await agentNFT.mint(
        proofs,
        dataDescriptions,
        recipient,
        {
          value: 0, // If minting requires payment, add it here
          gasLimit: Math.ceil(Number(gasEstimate) * 1.2), // Add 20% buffer to gas estimate
        }
      );
      console.log(`✅ Minting transaction sent: ${tx.hash}`);
    } catch (mintError: any) {
      console.error("❌ Mint transaction failed:");
      console.error(`  - Error message: ${mintError?.message || 'Unknown error'}`);
      console.error(`  - Error code: ${mintError?.code || 'N/A'}`);
      console.error(`  - Full error:`, mintError);
      throw mintError;
    }

    console.log("⏳ Waiting for transaction confirmation...");

    // Wait for the transaction to be mined
    let receipt;
    try {
      receipt = await tx.wait();
      console.log(`✅ Transaction confirmed in block: ${receipt.blockNumber}`);
      console.log(`Gas used: ${receipt.gasUsed}`);
    } catch (receiptError: any) {
      console.error("❌ Transaction confirmation failed:");
      console.error(`  - Error message: ${receiptError?.message || 'Unknown error'}`);
      console.error(`  - Full error:`, receiptError);
      throw receiptError;
    }

    // Parse events to get the token ID
    // The Minted event has the following signature:
    // event Minted(uint256 indexed tokenId, address indexed minter, address indexed owner, bytes32[] dataHashes, string[] dataDescriptions);
    const mintedEvent = receipt?.logs
      .filter((log: any) => {
        try {
          // Try to parse the log as a Minted event
          const parsedLog = agentNFT.interface.parseLog({
            topics: log.topics,
            data: log.data,
          });
          return parsedLog?.name === "Minted";
        } catch (e) {
          return false;
        }
      })
      .map((log: any) => {
        return agentNFT.interface.parseLog({
          topics: log.topics,
          data: log.data,
        });
      })[0];

    if (mintedEvent) {
      const tokenId = mintedEvent.args[0];
      console.log(`\nMint successful! Token ID: ${tokenId}`);
      console.log(`Owner: ${mintedEvent.args[2]}`);
      console.log(`Transaction Hash: ${tx.hash}`);
      
      // Save the token ID to a file for future reference
      const outputDir = path.join(__dirname, "../output");
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const outputFile = path.join(outputDir, `token_${tokenId}.json`);
      fs.writeFileSync(
        outputFile,
        JSON.stringify({
          tokenId: tokenId.toString(),
          owner: mintedEvent.args[2],
          timestamp: new Date().toISOString(),
          transactionHash: tx.hash,
          dataDescriptions,
          dataHashes: mintedEvent.args[3].map((hash: any) => hash.toString()),
        }, null, 2)
      );
      
      console.log(`Token details saved to: ${outputFile}`);
    } else {
      console.log("Mint successful, but couldn't parse the Minted event.");
      console.log(`Transaction Hash: ${tx.hash}`);
    }

  } catch (error: any) {
    console.error("💥 Mint process failed:");
    console.error(`  - Error type: ${error?.constructor?.name || 'Unknown'}`);
    console.error(`  - Error message: ${error?.message || 'Unknown error'}`);
    console.error(`  - Error code: ${error?.code || 'N/A'}`);
    console.error(`  - Stack trace:`, error?.stack || 'No stack trace available');
    console.error(`  - Full error object:`, error);
    process.exit(1);
  }
}

// Execute the script
main().catch((error: any) => {
  console.error("🚨 Unhandled error in main function:");
  console.error(`  - Error type: ${error?.constructor?.name || 'Unknown'}`);
  console.error(`  - Error message: ${error?.message || 'Unknown error'}`);
  console.error(`  - Full error:`, error);
  process.exit(1);
});