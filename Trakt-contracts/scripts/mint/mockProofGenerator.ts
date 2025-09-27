// mockProofGenerator.ts
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import {
  ESCROW_PROMPT,
  MODEL_PROVIDERS,
  StorageUploadResult
} from "./storageIntegration";

/**
 * Generates a mock proof for testing purposes (fallback)
 * In a real implementation, this would be replaced with actual proof generation
 * from a TEE (Trusted Execution Environment) or other verification system
 * 
 * TEEVerifier expects exactly 32-byte proofs for verifyPreimage function
 */
export function generateMockProof(data: string): string {
  // Generate a data hash that will be verified - this is exactly 32 bytes
  const dataHash = ethers.keccak256(ethers.toUtf8Bytes(data));
  
  // For TEEVerifier.verifyPreimage, the proof should be exactly 32 bytes (bytes32)
  // Return the data hash itself as the proof since TEEVerifier just validates length
  return dataHash;
}

/**
 * Generates a set of mock metadata entries for testing
 * @param count Number of metadata entries to generate
 * @returns Array of metadata objects with dataHash, description, and proof
 */
export function generateMockMetadata(count: number = 2) {
  const metadataTypes = [
    "Model weights",
    "Model configuration",
    "Model capabilities",
    "Training data summary",
    "Model architecture"
  ];

  return Array.from({ length: count }, (_, i) => {
    const description = metadataTypes[i % metadataTypes.length];
    const mockData = `${description}-${Date.now()}-${Math.random()}`;
    const dataHash = ethers.keccak256(ethers.toUtf8Bytes(mockData));
    const proof = generateMockProof(mockData);
    
    return {
      dataHash,
      description,
      proof
    };
  });
}

/**
 * Prepares agent data using simplified implementation with constants
 */
export async function prepareAgentData(modelData: any, signer: ethers.Wallet) {
  console.log("🔄 Preparing agent data with simplified implementation...");
  
  // Use the ESCROW_PROMPT and MODEL_PROVIDERS from storageIntegration
  const promptHash = ethers.keccak256(ethers.toUtf8Bytes(ESCROW_PROMPT));
  const modelConfigHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(MODEL_PROVIDERS)));
  const contextHash = ethers.keccak256(ethers.toUtf8Bytes(modelData.name + modelData.description));
  
  // Generate mock proofs for each data component (32-byte hashes)
  const promptProof = generateMockProof(ESCROW_PROMPT);
  const modelConfigProof = generateMockProof(JSON.stringify(MODEL_PROVIDERS));
  const contextProof = generateMockProof(modelData.name + modelData.description);
  
  console.log("✅ Generated agent data with escrow prompt and model providers");
  console.log(`Proof lengths: ${promptProof.length}, ${modelConfigProof.length}, ${contextProof.length}`);
  
  return [
    {
      dataHash: promptHash,
      description: "EscrowAgent Prompt Template - Specialized for 0G to NFT escrow contracts",
      proof: promptProof
    },
    {
      dataHash: modelConfigHash,
      description: "Model Providers Configuration - llama-3.3-70b-instruct and deepseek-r1-70b",
      proof: modelConfigProof
    },
    {
      dataHash: contextHash,
      description: `Agent Context - ${modelData.name} specialized configuration`,
      proof: contextProof
    }
  ];
}

/**
 * Fallback function for mock data generation when 0G Storage is unavailable
 */
export async function prepareAgentDataMock(modelData: any) {
  console.log("Preparing agent data (mock implementation)...");
  
  const metadataEntries = [
    {
      description: "AI Agent Prompt Template (Mock)",
      data: JSON.stringify({
        type: "prompt",
        content: "You are an EscrowAgent specialized in providing reusable escrow smart contracts...",
        version: modelData.version || "1.0.0"
      })
    },
    {
      description: "AI Agent Model Configuration (Mock)",
      data: JSON.stringify({
        type: "config",
        architecture: modelData.parameters?.architecture || "transformer",
        contextLength: modelData.parameters?.contextLength || 4096,
        parameterCount: modelData.parameters?.parameterCount || "7B"
      })
    }
  ];
  
  return metadataEntries.map(entry => {
    const dataHash = ethers.keccak256(ethers.toUtf8Bytes(entry.data));
    const proof = generateMockProof(entry.data);
    
    return {
      dataHash,
      description: entry.description,
      proof
    };
  });
}