# AgentNFT Minting Script

This script allows you to mint an AgentNFT token on the 0G network, following the ERC-7857 draft standard with support for TEE proofs.

## Prerequisites

- Node.js (v14 or higher)
- Yarn package manager
- A wallet with funds on the 0G network

## Environment Variables

The script uses the existing `.env` file in the project root directory, which should contain:

```
OG_RPC_URL='https://evmrpc-testnet.0g.ai'
OG_STORAGE_URL='https://storage-testnet.0g.ai'
OG_COMPUTE_URL='https://compute-testnet.0g.ai' 
ZG_TESTNET_PRIVATE_KEY=your_private_key_here
ZG_AGENT_NFT_CREATOR_PRIVATE_KEY=your_creator_private_key_here
```

Optionally, you can add:

```
RECIPIENT_ADDRESS=optional_recipient_address
```

## Usage

1. Ensure dependencies are installed:
   ```
   yarn install
   ```

2. Run the script:
   ```
   yarn hardhat run scripts/mint/mint.ts --network zgTestnet
   ```

## Script Overview

The script performs the following steps:

1. **Load Contract Information**: Loads the AgentNFT and TEEVerifier contract ABIs and addresses from the deployment files.

2. **Prepare Metadata and Proofs**: Generates mock proofs and metadata for the NFT. In a production environment, this would integrate with the 0G Storage SDK and real TEE proofs.

3. **Test Proof Verification**: Optionally tests the proofs with the TEEVerifier contract (this may fail with mock proofs, which is expected).

4. **Mint NFT**: Calls the `mint` function on the AgentNFT contract with the generated proofs and metadata.

5. **Save Token Details**: After successful minting, saves the token details to a JSON file in the `token-details` directory.

## Notes

- The current implementation uses mock proofs for testing purposes. In a production environment, you would replace this with real TEE proofs.

- 0G Storage SDK integration is commented out and would need to be configured for production use.

- The script includes detailed logging to help track the minting process.

- Token details are saved locally for reference, including the token ID, owner, contract address, and metadata.

- The script uses the contract addresses from the deployment files in `deployments/zgTestnet/` directory.