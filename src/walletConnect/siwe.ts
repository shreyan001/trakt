import {
    createSIWEConfig,
    SIWECreateMessageArgs,
    formatMessage,
    SIWESession,
    SIWEVerifyMessageArgs,
  } from '@web3modal/siwe';
  import { defaultWagmiConfig } from '@web3modal/wagmi/react/config';
  import { getCsrfToken, getSession, signIn, signOut } from 'next-auth/react';
  import { cookieStorage, createStorage } from 'wagmi';
  import { createPublicClient, http, defineChain } from 'viem';
  import { switchChain, getChainId } from '@wagmi/core';

  // Get projectId from https://cloud.walletconnect.com
  export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;
  
  if (!projectId) throw new Error('Project ID is not defined');

  // Define 0G Galileo Testnet custom chain
  export const ogGalileoTestnet = defineChain({
    id: 16601,
    name: '0G-Galileo-Testnet',
    nativeCurrency: {
      decimals: 18,
      name: '0G Token',
      symbol: 'OG',
    },
    rpcUrls: {
      default: { http: ['https://evmrpc-testnet.0g.ai'] },
    },
    blockExplorers: {
      default: { 
        name: '0G BlockChain Explorer', 
        url: 'https://chainscan-galileo.0g.ai' 
      },
    },
    testnet: true,
  });
  
  export const metadata = {
    name: 'Trakt',
    description: 'The Autonomous Middleman Protocol - AI-verified escrows for digital agreements powered by 0G Network',
    url: 'https://Trakt.vercel.app/', // origin must match your domain & subdomain
    icons: ['https://raw.githubusercontent.com/shreyan001/Trakts/refs/heads/main/public/logo.png'],
  };
  
  export const publicClient = createPublicClient({
    chain: ogGalileoTestnet,
    transport: http()
  });
  
  // Helper function to validate and switch to correct chain
  export const validateAndSwitchChain = async (): Promise<boolean> => {
    try {
      const currentChainId = getChainId(config);
      
      if (currentChainId !== ogGalileoTestnet.id) {
        // Prompt user to switch to 0G Galileo Testnet
        const switchResult = await switchChain(config, {
          chainId: ogGalileoTestnet.id,
        });
        
        return switchResult.id === ogGalileoTestnet.id;
      }
      
      return true;
    } catch (error) {
      console.error('Failed to switch chain:', error);
      return false;
    }
  };

  // Helper function to extract numeric chain ID from EIP-155 format
  export const parseChainId = (chainId: string | number): number => {
    if (typeof chainId === 'number') return chainId;
    
    // Handle EIP-155 format (e.g., "eip155:5115" -> 5115)
    if (chainId.includes(':')) {
      return parseInt(chainId.split(':')[1], 10);
    }
    
    return parseInt(chainId, 10);
  };
  
  // Create wagmiConfig
  const chains = [ogGalileoTestnet] as const;
  export const config = defaultWagmiConfig({
    chains,
    projectId,
    metadata,
    ssr: true,
    storage: createStorage({
      storage: cookieStorage,
    }),
  });
  

  
  export const siweConfig = createSIWEConfig({
    getMessageParams: async () => {
      // First check current chain without switching
      const currentChainId = getChainId(config);
      
      if (currentChainId !== ogGalileoTestnet.id) {
        throw new Error(`Wrong network detected. Please switch to 0G Galileo Testnet (Chain ID: ${ogGalileoTestnet.id}) first, then try signing in again.`);
      }
      
      return {
        domain: typeof window !== 'undefined' ? window.location.host : '',
        uri: typeof window !== 'undefined' ? window.location.origin : '',
        chains: [ogGalileoTestnet.id],
        statement: 'Please sign with your account on 0G Galileo Testnet',
      };
    },
    createMessage: ({ address, ...args }: SIWECreateMessageArgs) =>
      formatMessage(args, address),
    getNonce: async () => {
      // Strict chain validation before getting nonce
      const currentChainId = getChainId(config);
      if (currentChainId !== ogGalileoTestnet.id) {
        throw new Error(`Authentication blocked: Wrong network detected. Current: ${currentChainId}, Required: ${ogGalileoTestnet.id}. Please switch to 0G Galileo Testnet first.`);
      }
      
      const nonce = await getCsrfToken();
      if (!nonce) {
        throw new Error('Failed to get nonce!');
      }
  
      return nonce;
    },    getSession: async () => {
      const session = await getSession();
      if (!session) {
        throw new Error('Failed to get session!');
      }

      const { address, chainId } = session as unknown as SIWESession;

      // Ensure chainId is properly formatted for the session
      const numericChainId = typeof chainId === 'number' ? chainId : parseChainId(String(chainId));

      return { address, chainId: numericChainId };
    },
    verifyMessage: async ({ message, signature }: SIWEVerifyMessageArgs) => {
      try {
        // Validate chain before verification
        const currentChainId = getChainId(config);
        if (currentChainId !== ogGalileoTestnet.id) {
          console.error(`Wrong chain for verification. Expected: ${ogGalileoTestnet.id}, Got: ${currentChainId}`);
          return false;
        }
        
        const success = await signIn('credentials', {
          message,
          redirect: false,
          signature,
          callbackUrl: '/protected',
        });
  
        return Boolean(success?.ok);
      } catch (error) {
        console.error('Verification failed:', error);
        return false;
      }
    },
    signOut: async () => {
      try {
        await signOut({
          redirect: false,
        });
  
        return true;
      } catch (error) {
        return false;
      }
    },
  });