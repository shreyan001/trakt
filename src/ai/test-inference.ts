import { INFTInference } from './iNFT-Inference';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testINFTInference() {
    try {
        console.log('🚀 Testing iNFT Inference with Token ID 0');
        console.log('=' .repeat(50));
        
        // Create inference instance (will use private key from env)
        const inference = new INFTInference();
        
        // Wait a moment for broker initialization
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Test 1: Extract NFT data
        console.log('\n📋 Test 1: Extracting NFT Data');
        const nftData = await inference.extractNFTData(0);
        console.log('NFT Data:', {
            tokenId: nftData.tokenId,
            owner: nftData.owner,
            descriptionsCount: nftData.descriptions.length,
            hashesCount: nftData.hashes.length,
            hasEscrowPrompt: !!nftData.escrowPrompt,
            hasModelProviders: !!nftData.modelProviders,
            hasAgentContext: !!nftData.agentContext
        });
        
        // Test 2: Run inference with NFT context
        console.log('\n🤖 Test 2: Running Inference');
        const userQuery = "What are the key features of an escrow contract for NFT transactions?";
        
        const result = await inference.runInference(
            0, // Token ID
            userQuery,
            "llama-3.3-70b-instruct" // Model name
        );
        
        console.log('\n✅ Inference Result:');
        console.log('Query:', userQuery);
        console.log('Model:', result.model);
        console.log('Provider:', result.provider);
        console.log('Response:', result.result);
        console.log('Request ID:', result.requestId);
        
        // Test 3: Check NFT data is loaded
        console.log('\n📊 Test 3: NFT Data Status');
        console.log('Is NFT Data Loaded:', inference.isNFTDataLoaded());
        const loadedData = inference.getNFTData();
        console.log('Loaded Data Summary:', {
            descriptionsCount: loadedData.descriptions.length,
            hashesCount: loadedData.hashes.length,
            escrowPrompt: loadedData.escrowPrompt?.substring(0, 100) + '...',
            modelProviders: loadedData.modelProviders,
            agentContext: loadedData.agentContext
        });
        
        console.log('\n🎉 All tests completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

// Run the test
testINFTInference().catch(console.error);