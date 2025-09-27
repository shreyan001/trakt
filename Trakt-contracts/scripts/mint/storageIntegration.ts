// Storage integration simplified to use constants only
// 0G SDK imports removed as we're using mock data approach

const AGENT_NFT_ABI = [
  "function mint(bytes[] proofs, string[] dataDescriptions, address to) public payable returns (uint256)",
];

const ESCROW_PROMPT = "You are an EscrowAgent specialized in providing reusable escrow smart contracts specifically for this instance 0G to NFT or NFT to 0G if the intent is true you are supposed to reply back with this `https://raw.githubusercontent.com/shreyan001/Trakt/refs/heads/main/Trakt-NFT-main/NFTto0G.sol.txt` as the reply";

const MODEL_PROVIDERS = [
  {
    name: "llama-3.3-70b-instruct",
    address: "0xf07240Efa67755B5311bc75784a061eDB47165Dd",
    description: "State-of-the-art 70B parameter model for general AI tasks",
    verification: "TEE (TeeML)"
  },
  {
    name: "deepseek-r1-70b",
    address: "0x3feE5a4dd5FDb8a32dDA97Bed899830605dBD9D3",
    description: "Advanced reasoning model optimized for complex problem solving",
    verification: "TEE (TeeML)"
  }
];

// Interface kept for compatibility with existing code
export interface StorageUploadResult {
  rootHash: string;
  filePath: string;
  description: string;
  dataHash: string;
}

// Export the constants for use in other modules
export { AGENT_NFT_ABI, ESCROW_PROMPT, MODEL_PROVIDERS };