'use server'
import { ethers } from "ethers";
import { Indexer } from "@0glabs/0g-ts-sdk";
import { createZGComputeNetworkBroker } from "@0glabs/0g-serving-broker";
import * as fs from "fs";
import * as path from "path";

// AgentNFT ABI - key functions for data retrieval
const AGENT_NFT_ABI = [
    "function dataDescriptionsOf(uint256 tokenId) external view returns (string[] memory)",
    "function dataHashesOf(uint256 tokenId) external view returns (bytes32[] memory)",
    "function ownerOf(uint256 tokenId) external view returns (address)",
    "function tokenURI(uint256 tokenId) external view returns (string memory)"
];

// Deployed contract address on 0G testnet
const AGENT_NFT_ADDRESS = "0x81674F2F71DC648E391Ff90A8e9556e41bbf42F7";

export class INFTInference {
    private signer: ethers.Wallet;
    private nftContract: ethers.Contract;
    private broker: any;
    private indexer: Indexer;
    private nftData: {
        descriptions: string[];
        hashes: string[];
        escrowPrompt?: string;
        modelProviders?: string;
        agentContext?: string;
    } = { descriptions: [], hashes: [] };

    constructor(
        privateKey?: string,
        indexerRpc: string = "https://indexer-storage-testnet-turbo.0g.ai"
    ) {
        // Use provided private key or get from environment
        const key = privateKey || process.env.ZG_AGENT_NFT_CREATOR_PRIVATE_KEY;
        if (!key) {
            throw new Error("Private key is required either as parameter or ZG_AGENT_NFT_CREATOR_PRIVATE_KEY env var");
        }
        
        // Setup provider and signer
        const provider = new ethers.JsonRpcProvider(process.env.OG_RPC_URL || "https://evmrpc-testnet.0g.ai");
        this.signer = new ethers.Wallet(key, provider);
        this.nftContract = new ethers.Contract(AGENT_NFT_ADDRESS, AGENT_NFT_ABI, this.signer);
        this.indexer = new Indexer(indexerRpc);
        
        // Initialize broker directly in constructor
        this.initializeBroker();
    }

    private async initializeBroker() {
        try {
            this.broker = await createZGComputeNetworkBroker(this.signer);
            console.log("✅ 0G Compute Network broker initialized");
        } catch (error) {
            console.error("❌ Failed to initialize broker:", error);
            throw error;
        }
    }

    /**
     * Extract NFT data from the contract using tokenId
     */
    async extractNFTData(tokenId: number) {
        try {
            console.log(`🔍 Extracting NFT data for Token ID: ${tokenId}`);
            
            // Get data descriptions and hashes from the contract
            const descriptions = await this.nftContract.dataDescriptionsOf(tokenId);
            const hashes = await this.nftContract.dataHashesOf(tokenId);
            const owner = await this.nftContract.ownerOf(tokenId);
            
            this.nftData.descriptions = descriptions;
            this.nftData.hashes = hashes;
            
            // Parse the descriptions to extract specific data
            descriptions.forEach((desc: string, index: number) => {
                if (desc.includes("EscrowAgent Prompt Template")) {
                    this.nftData.escrowPrompt = desc;
                } else if (desc.includes("Model Providers Configuration")) {
                    this.nftData.modelProviders = desc;
                } else if (desc.includes("Agent Context")) {
                    this.nftData.agentContext = desc;
                }
            });
            
            console.log(`✅ NFT Data extracted successfully`);
            console.log(`   Owner: ${owner}`);
            console.log(`   Descriptions: ${descriptions.length}`);
            console.log(`   Hashes: ${hashes.length}`);
            
            return {
                tokenId,
                owner,
                descriptions,
                hashes,
                escrowPrompt: this.nftData.escrowPrompt,
                modelProviders: this.nftData.modelProviders,
                agentContext: this.nftData.agentContext
            };
        } catch (error) {
            console.error(`❌ Error extracting NFT data:`, error);
            throw error;
        }
    }

    /**
     * Prepare the inference prompt using NFT data
     */
    async preparePrompt(userInput: string, tokenId: number) {
        if (!this.nftData.escrowPrompt) {
            await this.extractNFTData(tokenId);
        }
        
        const basePrompt = this.nftData.escrowPrompt || "You are an AI assistant specialized in escrow contracts.";
        const contextInfo = this.nftData.agentContext || "";
        
        return `${basePrompt}\n\nContext: ${contextInfo}\n\nUser Query: ${userInput}`;
    }

    /**
     * Setup 0G Compute Network service
     */
    async setupService(modelName: string = "llama-3.3-70b-instruct") {
        try {
            console.log(`🔧 Setting up 0G Compute Network service...`);
            
            // List available services
            const services = await this.broker.inference.listService();
            console.log(`📋 Found ${services.length} available services`);
            
            // Find the requested model
            const targetService = services.find((service: any) => 
                service.name === modelName
            );
            
            if (!targetService) {
                throw new Error(`Model ${modelName} not found in available services`);
            }
            
            console.log(`✅ Found service: ${targetService.name}`);
            console.log(`   Provider: ${targetService.provider}`);
            
            // Acknowledge the provider
            await this.broker.inference.acknowledgeProviderSigner(targetService.provider);
            
            return targetService;
        } catch (error) {
            console.error(`❌ Error setting up service:`, error);
            throw error;
        }
    }

    /**
     * Run inference using NFT data and 0G Compute Network
     */
    async runInference(
        tokenId: number,
        userInput: string,
        modelName: string = "llama-3.3-70b-instruct"
    ) {
        try {
            console.log(`🚀 Starting inference for Token ID: ${tokenId}`);
            
            // Extract NFT data if not already done
            if (this.nftData.descriptions.length === 0) {
                await this.extractNFTData(tokenId);
            }
            
            // Prepare the prompt with NFT context
            const inferencePrompt = await this.preparePrompt(userInput, tokenId);
            console.log(`📝 Prepared prompt with NFT context`);
            
            // Setup the service
            const service = await this.setupService(modelName);
            
            // Get request headers for authentication
            const headers = await this.broker.inference.getRequestHeaders(
                service.provider,
                inferencePrompt
            );
            
            console.log(`🌐 Sending request to ${service.name}...`);
            
            // Make the inference request
            const response = await fetch(`${service.endpoint}/chat/completions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...headers
                },
                body: JSON.stringify({
                    messages: [{ role: "user", content: inferencePrompt }],
                    model: service.model || modelName,
                }),
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            const result = data.choices[0].message.content;
            
            console.log(`✅ Inference completed successfully`);
            
            // Process response for payment settlement
            try {
                await this.broker.inference.processResponse(
                    service.provider,
                    result,
                    data.id
                );
                console.log(`💰 Payment processed`);
            } catch (paymentError) {
                console.warn(`⚠️  Payment processing failed:`, paymentError);
            }
            
            return {
                result,
                tokenId,
                model: modelName,
                provider: service.provider,
                nftData: this.nftData,
                requestId: data.id
            };
        } catch (error) {
            console.error(`❌ Error during inference:`, error);
            throw error;
        }
    }

    /**
     * Get NFT data without running inference
     */
    getNFTData() {
        return this.nftData;
    }

    /**
     * Check if NFT data has been loaded
     */
    isNFTDataLoaded() {
        return this.nftData.descriptions.length > 0;
    }
}
