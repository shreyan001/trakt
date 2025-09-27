import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
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

const CONTRACTS_FILE = path.join(process.cwd(), 'src', 'lib', 'deployedContracts.json')
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1'

// Sync endpoint cache (separate from main route due to Next.js restrictions)
let syncCache: DeployedContract[] = []
let syncCacheInitialized = false

function initializeSyncCache() {
  if (syncCacheInitialized) return
  
  if (!isProduction) {
    // Development: Use file system
    try {
      if (fs.existsSync(CONTRACTS_FILE)) {
        const fileContent = fs.readFileSync(CONTRACTS_FILE, 'utf-8')
        syncCache = JSON.parse(fileContent)
        console.log('Sync: Development cache initialized from file with', syncCache.length, 'contracts')
      } else {
        syncCache = []
        console.log('Sync: Development cache initialized empty (no file found)')
      }
    } catch (error) {
      console.log('Sync: Development could not read from file system, starting with empty cache:', error.message)
      syncCache = []
    }
  } else {
    // Production: Start with empty cache
    syncCache = []
    console.log('Sync: Production cache initialized empty (memory-only mode)')
  }
  
  syncCacheInitialized = true
}

// POST - Sync contracts from client localStorage to server cache
export async function POST(request: NextRequest) {
  try {
    initializeSyncCache()
    
    const { contracts } = await request.json()
    
    if (!Array.isArray(contracts)) {
      return NextResponse.json({ error: 'Invalid contracts data' }, { status: 400 })
    }
    
    // Update server cache with client contracts
    syncCache.length = 0
    syncCache.push(...contracts)
    
    // In development, also write to file
    if (!isProduction) {
      try {
        fs.writeFileSync(CONTRACTS_FILE, JSON.stringify(contracts, null, 2))
        console.log('Sync: Contracts written to file system')
      } catch (error) {
        console.error('Sync: Failed to write to file system:', error)
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Synced ${contracts.length} contracts to server`,
      count: contracts.length
    })
  } catch (error) {
    console.error('Sync POST error:', error)
    return NextResponse.json({ error: 'Failed to sync contracts' }, { status: 500 })
  }
}

// GET - Get all contracts for client to sync with localStorage
export async function GET(request: NextRequest) {
  try {
    initializeSyncCache()
    return NextResponse.json({ contracts: syncCache })
  } catch (error) {
    console.error('Sync: Error getting contracts:', error)
    return NextResponse.json({ error: 'Failed to get contracts' }, { status: 500 })
  }
}