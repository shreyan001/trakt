'use client'

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Copy, ExternalLink, Check, ArrowLeft, Users, Shield, Clock, CheckCircle, Circle, Coins, Image, Headphones, FileText, Signature, Wallet, Info, ChevronDown, AlertTriangle, ScrollText } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useAccount, useSignMessage } from 'wagmi'
import ConnectButton from '@/components/ui/walletButton'
import NextImage from 'next/image'
import { ContractStorage } from '@/lib/contractStorage'

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

export default function ContractPage() {
  const params = useParams()
  const router = useRouter()
  const contractId = params.contractId as string
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  
  const [contract, setContract] = useState<DeployedContract | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCopied, setIsCopied] = useState(false)
  const [showBytecode, setShowBytecode] = useState(false)
  const [showContractDetails, setShowContractDetails] = useState(false)
  const [showContractInfo, setShowContractInfo] = useState(false)
  const [isSigningA, setIsSigningA] = useState(false)
  const [isSigningB, setIsSigningB] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    fetchContractData()
  }, [contractId])

  const fetchContractData = async () => {
    try {
      setLoading(true)
      setError(null) // Clear previous errors
      
      // Check if we're in production (client-side detection)
      const isProduction = process.env.NODE_ENV === 'production'
      console.log('Client Environment:', isProduction ? 'PRODUCTION - Using localStorage only' : 'DEVELOPMENT - Using localStorage + API fallback')
      
      // Always try localStorage first
      const localContract = ContractStorage.getContract(contractId)
      if (localContract) {
        console.log('Contract loaded from localStorage:', contractId)
        setContract(localContract)
        setLoading(false)
        
        // In development, still sync with API in background
        if (!isProduction) {
          try {
            const response = await fetch(`/api/contracts?id=${contractId}`)
            if (response.ok) {
              const serverContract = await response.json()
              // Update localStorage with server data if different
              if (JSON.stringify(localContract) !== JSON.stringify(serverContract)) {
                ContractStorage.addContract(serverContract)
                setContract(serverContract)
                console.log('Contract updated from server:', contractId)
              }
            }
          } catch (bgError) {
            console.log('Background sync failed, using localStorage data:', bgError)
          }
        }
        return
      }
      
      // If not in localStorage
      if (isProduction) {
        // In production, contracts should only exist in localStorage
        throw new Error('Contract not found in localStorage. In production, contracts are stored locally only.')
      } else {
        // In development, try API as fallback
        console.log('Contract not in localStorage, trying API fallback (development only)...')
        const response = await fetch(`/api/contracts?id=${contractId}`)
        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Contract not found: ${response.status} ${errorText}`)
        }
        const contractData = await response.json()
        
        // Save to localStorage for future use
        ContractStorage.addContract(contractData)
        setContract(contractData)
        console.log('Contract fetched from API and saved to localStorage:', contractId)
      }
    } catch (err) {
      console.error('Error fetching contract data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch contract')
    } finally {
      setLoading(false)
    }
  }

  const updateSignatureStatus = async (party: 'A' | 'B', signature: string) => {
    try {
      const response = await fetch(`/api/contracts?id=${contractId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          party,
          address,
          signature,
          signatureStatus: true
        })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('PATCH request failed:', response.status, errorText)
        throw new Error(`Failed to update signature status: ${response.status} ${errorText}`)
      }
      
      const result = await response.json()
      if (!result.success || !result.contract) {
        throw new Error('Invalid response format from server')
      }
      
      // Update localStorage with the new signature data
      ContractStorage.addContract(result.contract)
      setContract(result.contract)
      console.log(`Contract signature updated in localStorage for Party ${party}:`, contractId)
    } catch (error) {
      console.error('Error updating signature status:', error)
      throw error
    }
  }

  const handleSignContract = async (party: 'A' | 'B') => {
    if (!address || !contract) {
      console.error('Missing address or contract data')
      return
    }
    
    try {
      if (party === 'A') setIsSigningA(true)
      else setIsSigningB(true)
      
      // Create message to sign
      const message = `I, ${address}, hereby agree to the terms and conditions of the electronic contract "${contract.name}" (ID: ${contract.id}) as Party ${party}. This signature confirms my commitment to fulfill all obligations outlined in this agreement.\n\nContract Address: ${contract.contractAddress}\nTimestamp: ${new Date().toISOString()}\nChain ID: 5115 (0G Testnet)`
      
      console.log(`Signing message for Party ${party}:`, message)
      
      // Sign the message
      const signature = await signMessageAsync({ message, account: address })
      
      console.log(`Signature generated for Party ${party}:`, signature)
      
      // Update backend with signature
      await updateSignatureStatus(party, signature)
      
      console.log(`Party ${party} signed successfully`)
    } catch (error) {
      console.error(`Error signing contract for Party ${party}:`, error)
      
      // More user-friendly error handling
      let errorMessage = 'Unknown error'
      if (error instanceof Error) {
        errorMessage = error.message
      }
      
      // Check for specific error types
      if (errorMessage.includes('User rejected')) {
        errorMessage = 'Signature was cancelled by user'
      } else if (errorMessage.includes('Failed to update signature status')) {
        errorMessage = 'Signature created but failed to save. Please try again.'
      }
      
      alert(`Failed to sign contract: ${errorMessage}`)
    } finally {
      setIsSigningA(false)
      setIsSigningB(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  const handleSync = async () => {
    try {
      setIsSyncing(true)
      console.log('Starting contract data synchronization...')
      
      const result = await ContractStorage.fullSync()
      
      if (result.success) {
        console.log('Sync completed:', result)
        
        // Refresh contract data after sync
        await fetchContractData()
        
        // Show success message
        const message = `Sync completed! Uploaded: ${result.uploaded || 0}, Downloaded: ${result.downloaded || 0} contracts`
        console.log(message)
      } else {
        console.error('Sync failed:', result.error)
        alert(`Sync failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Error during sync:', error)
      alert('Sync failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a2332] via-[#2d3748] to-[#1a202c] text-white font-mono flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4299e1] mx-auto mb-4"></div>
          <p>Loading contract...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a2332] via-[#2d3748] to-[#1a202c] text-white font-mono flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Error</h1>
          <p className="text-gray-400 mb-4">{error}</p>
          <Button onClick={() => router.push('/')} className="bg-gradient-to-r from-[#4299e1] to-[#3182ce] hover:from-[#3182ce] hover:to-[#2b6cb0] text-white font-mono rounded-xl">
            Go Home
          </Button>
        </div>
      </div>
    )
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a2332] via-[#2d3748] to-[#1a202c] text-white font-mono flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Contract Not Found</h1>
          <p className="text-gray-400 mb-4">The requested contract could not be found.</p>
          <Button onClick={() => router.push('/')} className="bg-gradient-to-r from-[#4299e1] to-[#3182ce] hover:from-[#3182ce] hover:to-[#2b6cb0] text-white font-mono rounded-xl">
            Go Home
          </Button>
        </div>
      </div>
    )
  }

  const isPartyA = address?.toLowerCase() === contract.partyAAddress?.toLowerCase() || 
                   address?.toLowerCase() === contract.partyA?.toLowerCase()
  const isPartyB = address?.toLowerCase() === contract.partyBAddress?.toLowerCase() || 
                   (!contract.partyB && address && !isPartyA)
  const partyASigned = contract.partyASignatureStatus || false
  const partyBSigned = contract.partyBSignatureStatus || false

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a2332] via-[#2d3748] to-[#1a202c] text-white font-mono">
      {/* Navigation */}
      <nav className="border-b border-white/20 bg-gradient-to-r from-[#4299e1] via-[#3182ce] to-[#2b6cb0] backdrop-blur-sm sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/')}
                className="flex items-center space-x-2 text-white hover:text-[#ffd700] transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back</span>
              </button>
              <div className="h-6 w-px bg-white/30" />
              <div className="flex items-center space-x-3">
                <NextImage
                  src="/logo.png"
                  alt="Trakt"
                  width={32}
                  height={32}
                  className="rounded-lg"
                />
                <span className="text-xl font-bold text-[#ffd700] drop-shadow-lg">Trakt</span>
              </div>
            </div>
            <ConnectButton />
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Contract Header */}
        <div className="mb-8 bg-black/40 border border-white/20 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-[#4299e1] to-[#3182ce] p-3 rounded-xl">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{contract.name}</h1>
                <p className="text-gray-300">{contract.contractType} • ID: {contract.id}</p>
              </div>
            </div>
            <button
              onClick={() => setShowContractInfo(!showContractInfo)}
              className="flex items-center space-x-2 bg-black/30 hover:bg-black/50 border border-white/10 px-4 py-2 rounded-xl transition-colors"
            >
              <Info className="h-4 w-4" />
              <span>Contract Details</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showContractInfo ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showContractInfo && (
            <div className="border-t border-white/10 pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-300">Contract Address</p>
                  <div className="flex items-center space-x-2">
                    <code className="text-sm bg-black/30 border border-white/10 px-2 py-1 rounded-xl">{contract.contractAddress}</code>
                    <button
                      onClick={() => copyToClipboard(contract.contractAddress)}
                      className="text-gray-300 hover:text-white"
                    >
                      {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-300">Deployed</p>
                  <p className="text-sm text-white">{new Date(contract.deployedAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-300">Party A Address</p>
                  <code className="text-sm bg-black/30 border border-white/10 px-2 py-1 rounded-xl block">{contract.partyAAddress || contract.partyA}</code>
                </div>
                {contract.partyBAddress && (
                  <div>
                    <p className="text-sm text-gray-300">Party B Address</p>
                    <code className="text-sm bg-black/30 border border-white/10 px-2 py-1 rounded-xl block">{contract.partyBAddress}</code>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Electronic Contract Agreement */}
        <div className="mb-8 bg-black/40 border border-white/20 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center space-x-3 mb-4">
            <ScrollText className="h-6 w-6 text-[#4299e1]" />
            <h2 className="text-xl font-bold text-white">Electronic Contract Agreement</h2>
          </div>
          
          <div className="space-y-4">
            <div className="bg-black/30 border border-white/10 rounded-xl p-4">
              <p className="text-gray-200 text-sm leading-relaxed">
                This electronic contract facilitates a secure escrow transaction between two parties on the 0G Testnet. 
                By signing this agreement, both parties commit to the terms and conditions outlined below.
              </p>
            </div>
            
            <button
              onClick={() => setShowContractDetails(!showContractDetails)}
              className="flex items-center space-x-2 text-[#4299e1] hover:text-[#3182ce] transition-colors"
            >
              <span className="font-medium">Full Terms</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showContractDetails ? 'rotate-180' : ''}`} />
            </button>
            
            {showContractDetails && (
              <div className="space-y-4 border-t border-white/10 pt-4">
                <div className="grid gap-4">
                  <div className="bg-black/30 border border-white/10 rounded-xl p-4">
                    <h4 className="font-semibold text-white mb-2 flex items-center">
                      <Shield className="h-4 w-4 mr-2 text-[#4299e1]" />
                      Agreement Overview
                    </h4>
                    <p className="text-gray-200 text-sm">
                      This contract establishes a trustless escrow mechanism where Party A deposits an NFT and Party B deposits ETH. 
                      The smart contract ensures secure exchange without requiring trust between parties.
                    </p>
                  </div>
                  
                  <div className="bg-black/30 border border-white/10 rounded-xl p-4">
                    <h4 className="font-semibold text-white mb-2 flex items-center">
                      <Users className="h-4 w-4 mr-2 text-[#4299e1]" />
                      Party Obligations
                    </h4>
                    <ul className="text-gray-200 text-sm space-y-1">
                      <li>• Party A: Must deposit the specified NFT to the escrow contract</li>
                      <li>• Party B: Must deposit the agreed ETH amount to the escrow contract</li>
                      <li>• Both parties: Must sign this agreement to activate the contract</li>
                    </ul>
                  </div>
                  
                  <div className="bg-black/30 border border-white/10 rounded-xl p-4">
                    <h4 className="font-semibold text-white mb-2 flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-[#4299e1]" />
                      Execution Process
                    </h4>
                    <ol className="text-gray-200 text-sm space-y-1">
                      <li>1. Both parties sign this electronic agreement</li>
                      <li>2. Party A deposits NFT to the escrow contract</li>
                      <li>3. Party B deposits ETH to the escrow contract</li>
                      <li>4. Smart contract automatically executes the exchange</li>
                    </ol>
                  </div>
                  
                  <div className="bg-black/30 border border-white/10 rounded-xl p-4">
                    <h4 className="font-semibold text-white mb-2 flex items-center">
                      <Shield className="h-4 w-4 mr-2 text-[#4299e1]" />
                      Security & Trust Mechanisms
                    </h4>
                    <p className="text-gray-200 text-sm">
                      All transactions are secured by smart contract logic on 0G Testnet. Funds and assets are held in escrow 
                      until both parties fulfill their obligations. No central authority can access or control the escrowed assets.
                    </p>
                  </div>
                  
                  <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-4">
                    <h4 className="font-semibold text-yellow-300 mb-2 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Risk Disclosure
                    </h4>
                    <p className="text-yellow-200 text-sm">
                      This is a testnet contract for demonstration purposes. Do not use real assets of significant value. 
                      Smart contracts carry inherent risks including potential bugs or network issues.
                    </p>
                  </div>
                  
                  <div className="bg-black/30 border border-white/10 rounded-xl p-4">
                    <h4 className="font-semibold text-white mb-2 flex items-center">
                      <FileText className="h-4 w-4 mr-2 text-[#4299e1]" />
                      Legal Binding
                    </h4>
                    <p className="text-gray-200 text-sm">
                      By signing this agreement, both parties acknowledge they have read, understood, and agree to be bound by these terms. 
                      Digital signatures are legally binding and equivalent to handwritten signatures.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-[#4299e1] mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-blue-300 mb-1">Important Notice</h4>
                  <p className="text-blue-200 text-sm">
                    You must connect your wallet and be on the 0G Testnet to sign this agreement. 
                    Your signature will be cryptographically verified and stored on-chain.
                  </p>
                </div>
              </div>
            </div>
            
            {!isConnected && (
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <Wallet className="h-5 w-5 text-[#4299e1]" />
                  <div>
                    <h4 className="font-semibold text-blue-300">Wallet Connection Required</h4>
                    <p className="text-blue-200 text-sm">Please connect your wallet to proceed with signing this contract.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Signature Section */}
        <div className="mb-8 space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center">
            <Signature className="h-6 w-6 mr-3 text-[#4299e1]" />
            Digital Signatures
          </h2>
          
          {/* Party A Signature */}
          <div className="bg-black/30 border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                  partyASigned 
                    ? 'bg-[#4299e1] border-[#4299e1]' 
                    : 'border-gray-600 hover:border-[#4299e1]'
                }`}>
                  {partyASigned && <Check className="h-4 w-4 text-white" />}
                </div>
                <div>
                  <h3 className="text-white font-medium">Party A</h3>
                  <p className="text-gray-400 text-xs">
                    {contract.partyAAddress ? 
                      `${contract.partyAAddress.slice(0, 6)}...${contract.partyAAddress.slice(-4)}` : 
                      'Deployer'
                    }
                  </p>
                </div>
              </div>
              
              {!isConnected ? (
                <ConnectButton />
              ) : isPartyA ? (
                !partyASigned ? (
                  <button
                    onClick={() => handleSignContract('A')}
                    disabled={isSigningA}
                    className="bg-gradient-to-r from-[#4299e1] to-[#3182ce] hover:from-[#3182ce] hover:to-[#2c5aa0] text-white px-3 py-1 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50"
                  >
                    {isSigningA ? 'Signing...' : 'Sign'}
                  </button>
                ) : (
                  <span className="text-[#4299e1] text-sm font-medium">Signed</span>
                )
              ) : (
                <span className="text-yellow-400 text-xs">Wrong wallet</span>
              )}
            </div>
          </div>

          {/* Party B Signature */}
          <div className="bg-black/30 border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                  partyBSigned 
                    ? 'bg-[#4299e1] border-[#4299e1]' 
                    : 'border-gray-600 hover:border-[#4299e1]'
                }`}>
                  {partyBSigned && <Check className="h-4 w-4 text-white" />}
                </div>
                <div>
                  <h3 className="text-white font-medium">Party B</h3>
                  <p className="text-gray-400 text-xs">
                    {contract.partyBAddress ? 
                      `${contract.partyBAddress.slice(0, 6)}...${contract.partyBAddress.slice(-4)}` : 
                      'Counterparty'
                    }
                  </p>
                </div>
              </div>
              
              {!isConnected ? (
                <ConnectButton />
              ) : isPartyB ? (
                !partyBSigned ? (
                  <button
                    onClick={() => handleSignContract('B')}
                    disabled={isSigningB}
                    className="bg-gradient-to-r from-[#4299e1] to-[#3182ce] hover:from-[#3182ce] hover:to-[#2c5aa0] text-white px-3 py-1 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50"
                  >
                    {isSigningB ? 'Signing...' : 'Sign'}
                  </button>
                ) : (
                  <span className="text-[#4299e1] text-sm font-medium">Signed</span>
                )
              ) : (
                <span className="text-yellow-400 text-xs">Use different wallet</span>
              )}
            </div>
          </div>
        </div>

        {/* Contract Execution Status */}
        {partyASigned && partyBSigned && (
          <div className="mb-8 bg-green-500/20 border border-green-500/30 rounded-2xl p-6 backdrop-blur-sm">
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-300 mb-2">Contract Fully Executed</h2>
              <p className="text-green-200">Both parties have signed. Contract is now active and ready for deposits.</p>
            </div>
          </div>
        )}

        {/* Main Escrow Layout - Only show after both signatures */}
        {partyASigned && partyBSigned && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Party A Section */}
          <div className="bg-black/40 border border-white/20 rounded-2xl p-6 backdrop-blur-sm">
            <div className="text-center mb-6">
              <div className="bg-gradient-to-r from-[#4299e1] to-[#3182ce] p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Image className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Party A</h3>
              <p className="text-gray-300 text-sm mb-4">NFT Depositor</p>
              
              <div className="space-y-3">
                <div className="flex items-center justify-center space-x-2">
                  <Circle className="h-4 w-4 text-yellow-400" />
                  <span className="text-yellow-400 text-sm">Pending Deposit</span>
                </div>
                
                <div className="bg-black/30 border border-white/10 rounded-xl p-3">
                  <p className="text-xs text-gray-300 mb-1">Required Deposit</p>
                  <p className="text-white font-mono">1 NFT</p>
                </div>
                
                <Button className="w-full bg-gradient-to-r from-[#4299e1] to-[#3182ce] hover:from-[#3182ce] hover:to-[#2b6cb0] text-white font-mono rounded-xl">
                  Deposit NFT
                </Button>
              </div>
            </div>
          </div>

          {/* Escrow Status */}
          <div className="bg-black/40 border border-white/20 rounded-2xl p-6 backdrop-blur-sm flex flex-col justify-center">
            <div className="text-center">
              <div className="bg-gradient-to-r from-[#4299e1] to-[#3182ce] p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Escrow Status</h3>
              <p className="text-gray-300 text-sm mb-4">Secure Smart Contract</p>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">Party A Deposit:</span>
                  <span className="text-yellow-400">Pending</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">Party B Deposit:</span>
                  <span className="text-yellow-400">Pending</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">Contract Status:</span>
                  <span className="text-green-400">Active</span>
                </div>
              </div>
            </div>
          </div>

          {/* Party B Section */}
          <div className="bg-black/40 border border-white/20 rounded-2xl p-6 backdrop-blur-sm">
            <div className="text-center mb-6">
              <div className="bg-gradient-to-r from-[#4299e1] to-[#3182ce] p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Coins className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Party B</h3>
              <p className="text-gray-300 text-sm mb-4">ETH Depositor</p>
              
              <div className="space-y-3">
                <div className="flex items-center justify-center space-x-2">
                  <Circle className="h-4 w-4 text-yellow-400" />
                  <span className="text-yellow-400 text-sm">Pending Deposit</span>
                </div>
                
                <div className="bg-black/30 border border-white/10 rounded-xl p-3">
                  <p className="text-xs text-gray-300 mb-1">Required Deposit</p>
                  <p className="text-white font-mono">0.1 ETH</p>
                </div>
                
                <Button className="w-full bg-gradient-to-r from-[#4299e1] to-[#3182ce] hover:from-[#3182ce] hover:to-[#2b6cb0] text-white font-mono rounded-xl">
                  Deposit ETH
                </Button>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contract Actions */}
          <div className="bg-black/40 border border-white/20 rounded-2xl p-6 backdrop-blur-sm">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
              <Signature className="h-5 w-5" />
              <span>Actions</span>
            </h2>
            <div className="space-y-3">
              <Button 
                className="w-full bg-gradient-to-r from-[#4299e1] to-[#3182ce] hover:from-[#3182ce] hover:to-[#2b6cb0] text-white font-mono rounded-xl"
                onClick={() => window.open(`https://0G-testnet.blockscout.com/address/${contract.contractAddress}`, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View on Explorer
              </Button>
              <Button 
                variant="outline" 
                className="w-full border-white/20 text-gray-200 hover:bg-white/10 font-mono rounded-xl"
                onClick={() => copyToClipboard(contract.contractAddress)}
              >
                {isCopied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                Copy Address
              </Button>
              <Button 
                variant="outline" 
                className="w-full border-white/20 text-gray-200 hover:bg-white/10 font-mono rounded-xl"
                onClick={() => setShowBytecode(!showBytecode)}
              >
                <ScrollText className="h-4 w-4 mr-2" />
                {showBytecode ? 'Hide' : 'Show'} Bytecode
              </Button>
              <Button 
                variant="outline" 
                className="w-full border-white/20 text-gray-200 hover:bg-white/10 font-mono rounded-xl"
                onClick={handleSync}
                disabled={isSyncing}
              >
                <Users className="h-4 w-4 mr-2" />
                {isSyncing ? 'Syncing...' : 'Sync Data'}
              </Button>
            </div>
          </div>

          {/* Contract Info */}
          <div className="bg-black/40 border border-white/20 rounded-2xl p-6 backdrop-blur-sm">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
              <Info className="h-5 w-5" />
              <span>Contract Info</span>
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-300 block mb-1">Contract ID</label>
                <p className="text-white font-mono text-sm bg-black/30 p-2 rounded-xl border border-white/10">
                  {contract.id}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-300 block mb-1">Type</label>
                <p className="text-white text-sm">{contract.contractType}</p>
              </div>
              <div>
                <label className="text-sm text-gray-300 block mb-1">Network</label>
                <p className="text-white text-sm">0G Testnet</p>
              </div>
              <div>
                <label className="text-sm text-gray-300 block mb-1">Deployed</label>
                <p className="text-white text-sm">{new Date(contract.deployedAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Signature Status */}
          <div className="bg-black/40 border border-white/20 rounded-2xl p-6 backdrop-blur-sm">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Signature Status</span>
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Party A</span>
                <div className="flex items-center space-x-2">
                  {partyASigned ? (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-500" />
                  )}
                  <span className={`text-sm ${partyASigned ? 'text-green-400' : 'text-gray-500'}`}>
                    {partyASigned ? 'Signed' : 'Pending'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Party B</span>
                <div className="flex items-center space-x-2">
                  {partyBSigned ? (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-500" />
                  )}
                  <span className={`text-sm ${partyBSigned ? 'text-green-400' : 'text-gray-500'}`}>
                    {partyBSigned ? 'Signed' : 'Pending'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bytecode Section */}
        {showBytecode && (
          <div className="mt-8 bg-black/40 border border-white/20 rounded-2xl p-6 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center">
              <ScrollText className="h-6 w-6 mr-3 text-[#4299e1]" />
              Contract Bytecode
            </h2>
            <ScrollArea className="h-64 w-full">
              <pre className="text-xs text-gray-300 font-mono bg-black/30 p-4 rounded-xl border border-white/10 overflow-x-auto">
                {contract.bytecode}
              </pre>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  )
}