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

const STORAGE_KEY = 'pacter_deployed_contracts'

export class ContractStorage {
  // Get all contracts from localStorage
  static getContracts(): DeployedContract[] {
    if (typeof window === 'undefined') return []
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Error reading contracts from localStorage:', error)
      return []
    }
  }

  // Save contracts to localStorage
  static saveContracts(contracts: DeployedContract[]): void {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(contracts))
      console.log('Contracts saved to localStorage:', contracts.length)
    } catch (error) {
      console.error('Error saving contracts to localStorage:', error)
    }
  }

  // Add a single contract
  static addContract(contract: DeployedContract): void {
    const contracts = this.getContracts()
    
    // Check if contract already exists
    const existingIndex = contracts.findIndex(c => c.id === contract.id)
    
    if (existingIndex >= 0) {
      // Update existing contract
      contracts[existingIndex] = contract
    } else {
      // Add new contract
      contracts.push(contract)
    }
    
    this.saveContracts(contracts)
  }

  // Get a specific contract by ID
  static getContract(id: string): DeployedContract | null {
    const contracts = this.getContracts()
    return contracts.find(c => c.id === id) || null
  }

  // Update a contract
  static updateContract(id: string, updates: Partial<DeployedContract>): boolean {
    const contracts = this.getContracts()
    const index = contracts.findIndex(c => c.id === id)
    
    if (index >= 0) {
      contracts[index] = { ...contracts[index], ...updates }
      this.saveContracts(contracts)
      return true
    }
    
    return false
  }

  // Delete a contract
  static deleteContract(id: string): boolean {
    const contracts = this.getContracts()
    const index = contracts.findIndex(c => c.id === id)
    
    if (index >= 0) {
      contracts.splice(index, 1)
      this.saveContracts(contracts)
      return true
    }
    
    return false
  }

  // Sync with server - upload local contracts to server
  static async syncToServer(): Promise<{ success: boolean; synced?: number; error?: string }> {
    try {
      const localContracts = this.getContracts()
      
      if (localContracts.length === 0) {
        return { success: true, synced: 0 }
      }
      
      const response = await fetch('/api/contracts/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contracts: localContracts })
      })
      
      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`)
      }
      
      const result = await response.json()
      console.log('Sync to server completed:', result)
      
      return { success: true, synced: result.synced }
    } catch (error) {
      console.error('Error syncing to server:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  // Sync from server - download server contracts to local storage
  static async syncFromServer(): Promise<{ success: boolean; downloaded?: number; error?: string }> {
    try {
      const response = await fetch('/api/contracts/sync')
      
      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`)
      }
      
      const result = await response.json()
      const serverContracts = result.contracts || []
      
      if (serverContracts.length > 0) {
        // Merge with local contracts (server takes precedence for conflicts)
        const localContracts = this.getContracts()
        const localIds = new Set(localContracts.map(c => c.id))
        
        // Add server contracts that don't exist locally
        const newContracts = serverContracts.filter(contract => !localIds.has(contract.id))
        
        if (newContracts.length > 0) {
          const mergedContracts = [...localContracts, ...newContracts]
          this.saveContracts(mergedContracts)
          console.log('Sync from server completed:', newContracts.length, 'new contracts')
          return { success: true, downloaded: newContracts.length }
        }
      }
      
      return { success: true, downloaded: 0 }
    } catch (error) {
      console.error('Error syncing from server:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  // Full bidirectional sync
  static async fullSync(): Promise<{ success: boolean; uploaded?: number; downloaded?: number; error?: string }> {
    try {
      // First sync to server (upload local changes)
      const uploadResult = await this.syncToServer()
      if (!uploadResult.success) {
        return uploadResult
      }
      
      // Then sync from server (download remote changes)
      const downloadResult = await this.syncFromServer()
      if (!downloadResult.success) {
        return downloadResult
      }
      
      return {
        success: true,
        uploaded: uploadResult.synced,
        downloaded: downloadResult.downloaded
      }
    } catch (error) {
      console.error('Error during full sync:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  // Clear all contracts from localStorage
  static clearContracts(): void {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.removeItem(STORAGE_KEY)
      console.log('All contracts cleared from localStorage')
    } catch (error) {
      console.error('Error clearing contracts from localStorage:', error)
    }
  }
}