'use server'
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CONTRACTS_FILE = path.join(process.cwd(), 'src', 'lib', 'deployedContracts.json');

// Environment detection
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

// In-memory cache for contracts (used in production/Vercel)
let contractsCache: DeployedContract[] = []
let cacheInitialized = false;

// Initialize cache from file if possible (development) or start empty (production)
function initializeCache() {
  if (cacheInitialized) return;
  
  if (!isProduction) {
    // Development: Use file system
    try {
      if (fs.existsSync(CONTRACTS_FILE)) {
        const fileContent = fs.readFileSync(CONTRACTS_FILE, 'utf-8');
        contractsCache = JSON.parse(fileContent);
        console.log('Development: Cache initialized from file with', contractsCache.length, 'contracts');
      } else {
        contractsCache = [];
        console.log('Development: Cache initialized empty (no file found)');
      }
    } catch (error) {
      console.log('Development: Could not read from file system, starting with empty cache:', error.message);
      contractsCache = [];
    }
  } else {
    // Production: Start with empty cache (will be populated from client requests)
    contractsCache = [];
    console.log('Production: Cache initialized empty (memory-only mode)');
  }
  
  cacheInitialized = true;
}

interface DeployedContract {
  id: string;
  name: string;
  contractAddress: string;
  abi: any[];
  bytecode: string;
  contractType: string;
  partyA: string;
  partyB?: string;
  deployedAt: string;
  transactionHash?: string;
  networkId?: string;
  description?: string;
  partyASignatureStatus?: boolean;
  partyBSignatureStatus?: boolean;
  partyAAddress?: string;
  partyBAddress?: string;
  partyASignature?: string;
  partyBSignature?: string;
}

// GET - Retrieve all deployed contracts or a specific contract by ID
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contractId = searchParams.get('id');
    
    // Log environment for debugging
    console.log('API Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      isProduction: isProduction ? 'PRODUCTION MODE' : 'DEVELOPMENT MODE',
      requestedContractId: contractId,
      cacheSize: contractsCache.length
    });
    
    // Initialize cache from file if possible
    initializeCache();
    
    if (contractId) {
      const contract = contractsCache.find(c => c.id === contractId);
      
      if (!contract) {
        console.log('Contract not found in server cache:', contractId);
        console.log('Available contracts in cache:', contractsCache.map(c => c.id));
        
        // In production, this is expected - contracts should be managed via localStorage on client
        if (isProduction) {
          console.log('PRODUCTION: Contract should be retrieved from client localStorage, not server cache');
        }
        
        return NextResponse.json({ 
          error: 'Contract not found', 
          message: isProduction ? 'Contract should be available in localStorage on client side' : 'Contract not found in development cache',
          environment: isProduction ? 'production' : 'development'
        }, { status: 404 });
      }
      
      console.log('Contract found and returning:', contract.id);
      return NextResponse.json(contract);
    }
    
    console.log('Returning all contracts, count:', contractsCache.length);
    return NextResponse.json(contractsCache);
  } catch (error) {
    console.error('Error reading contracts:', error);
    return NextResponse.json({ error: 'Failed to read contracts' }, { status: 500 });
  }
}

// POST - Store a new deployed contract
export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/contracts - Starting contract storage');
    
    // Parse request body
    let contractData: Omit<DeployedContract, 'id' | 'deployedAt'>;
    try {
      contractData = await request.json();
      console.log('Contract data received:', JSON.stringify(contractData, null, 2));
    } catch (parseError) {
      console.error('Error parsing request JSON:', parseError);
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }
    
    // Validate required fields
    if (!contractData.name || !contractData.contractAddress || !contractData.partyA) {
      console.error('Missing required fields:', { name: contractData.name, contractAddress: contractData.contractAddress, partyA: contractData.partyA });
      return NextResponse.json({ error: 'Missing required fields: name, contractAddress, or partyA' }, { status: 400 });
    }
    
    // Generate unique ID
    const contractId = `${contractData.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    console.log('Generated contract ID:', contractId);
    
    const newContract: DeployedContract = {
      id: contractId,
      ...contractData,
      deployedAt: new Date().toISOString(),
      partyASignatureStatus: false,
      partyBSignatureStatus: false
    };
    
    console.log('New contract object:', JSON.stringify(newContract, null, 2));
    
    // Initialize cache and add new contract
    initializeCache();
    
    // Add new contract to cache
    contractsCache.push(newContract);
    console.log('Total contracts after adding new one:', contractsCache.length);
    
    // Write to file only in development mode
    if (!isProduction) {
      try {
        const jsonString = JSON.stringify(contractsCache, null, 2);
        console.log('Development: Writing JSON string length:', jsonString.length);
        fs.writeFileSync(CONTRACTS_FILE, jsonString);
        console.log('Development: Successfully wrote contracts file');
      } catch (writeError) {
        console.log('Development: Error writing to file:', writeError.message);
      }
    } else {
      console.log('Production: Contract saved to memory cache only');
    }
    
    console.log('Contract storage completed successfully');
    return NextResponse.json({ success: true, contract: newContract }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/contracts:', error);
    return NextResponse.json({ 
      error: 'Failed to store contract', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT - Update an existing contract
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contractId = searchParams.get('id');
    
    if (!contractId) {
      return NextResponse.json({ error: 'Contract ID is required' }, { status: 400 });
    }
    
    const updateData = await request.json();
    
    // Initialize cache
    initializeCache();
    
    // Find and update contract in cache
    const contractIndex = contractsCache.findIndex(c => c.id === contractId);
    if (contractIndex === -1) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }
    
    contractsCache[contractIndex] = { ...contractsCache[contractIndex], ...updateData };
    
    // Write to file only in development mode
    if (!isProduction) {
      try {
        fs.writeFileSync(CONTRACTS_FILE, JSON.stringify(contractsCache, null, 2));
        console.log('Development: Contract updated in file');
      } catch (writeError) {
        console.log('Development: Error writing to file:', writeError.message);
      }
    } else {
      console.log('Production: Contract updated in memory cache only');
    }
    
    return NextResponse.json({ success: true, contract: contractsCache[contractIndex] });
  } catch (error) {
    console.error('Error updating contract:', error);
    return NextResponse.json({ error: 'Failed to update contract' }, { status: 500 });
  }
}

// PATCH - Update signature status for a specific party
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contractId = searchParams.get('id');
    
    if (!contractId) {
      return NextResponse.json({ error: 'Contract ID is required' }, { status: 400 });
    }
    
    const { party, address, signature, signatureStatus } = await request.json();
    
    if (!party || !['A', 'B'].includes(party)) {
      return NextResponse.json({ error: 'Valid party (A or B) is required' }, { status: 400 });
    }
    
    // Initialize cache
    initializeCache();
    
    // Find contract in cache
    const contractIndex = contractsCache.findIndex(c => c.id === contractId);
    if (contractIndex === -1) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }
    
    // Update signature data
    const updateFields: Partial<DeployedContract> = {};
    
    if (party === 'A') {
      updateFields.partyASignatureStatus = signatureStatus;
      if (address) updateFields.partyAAddress = address;
      if (signature) updateFields.partyASignature = signature;
    } else {
      updateFields.partyBSignatureStatus = signatureStatus;
      if (address) updateFields.partyBAddress = address;
      if (signature) updateFields.partyBSignature = signature;
      if (address && !contractsCache[contractIndex].partyB) {
        updateFields.partyB = address;
      }
    }
    
    contractsCache[contractIndex] = { ...contractsCache[contractIndex], ...updateFields };
    
    // Write to file only in development mode
     if (!isProduction) {
       try {
         fs.writeFileSync(CONTRACTS_FILE, JSON.stringify(contractsCache, null, 2));
         console.log('Development: Contract signature updated in file');
       } catch (writeError) {
         console.log('Development: Error writing to file:', writeError.message);
       }
     } else {
       console.log('Production: Contract signature updated in memory cache only');
     }
    
    return NextResponse.json({ success: true, contract: contractsCache[contractIndex] });
  } catch (error) {
    console.error('Error updating signature status:', error);
    return NextResponse.json({ error: 'Failed to update signature status' }, { status: 500 });
  }
}

// DELETE - Remove a contract
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contractId = searchParams.get('id');
    
    if (!contractId) {
      return NextResponse.json({ error: 'Contract ID is required' }, { status: 400 });
    }

    // Initialize cache
    initializeCache();

    // Find and remove the contract from cache
    const contractIndex = contractsCache.findIndex(c => c.id === contractId);
    if (contractIndex === -1) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    const deletedContract = contractsCache.splice(contractIndex, 1)[0];

    // Write to file only in development mode
     if (!isProduction) {
       try {
         fs.writeFileSync(CONTRACTS_FILE, JSON.stringify(contractsCache, null, 2));
         console.log('Development: Contract deleted from file');
       } catch (writeError) {
         console.log('Development: Error writing to file:', writeError.message);
       }
     } else {
       console.log('Production: Contract deleted from memory cache only');
     }

    return NextResponse.json({ success: true, deletedContract });
  } catch (error) {
    console.error('Error deleting contract:', error);
    return NextResponse.json({ error: 'Failed to delete contract' }, { status: 500 });
  }
}