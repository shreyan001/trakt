'use client'

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Copy, Code, ExternalLink, Check } from 'lucide-react'
import { publicClient } from '@/walletConnect/siwe'
import { useWalletClient, useAccount } from 'wagmi'
import { contractsArray } from '@/lib/contractCompile'
import { PieChart } from 'react-minimal-pie-chart'

export function SmartContractDisplay({ contractCode }: { contractCode: string }) {
  const [isDeployed, setIsDeployed] = useState(false)
  const [showCode, setShowCode] = useState(true)
  const [deployedAddress, setDeployedAddress] = useState<string>('')
  const [isCopied, setIsCopied] = useState(false)
  const { data: walletClient } = useWalletClient()
  const { address: walletAddress } = useAccount()
  const [solidityScanResults, setSolidityScanResults] = useState<any>(null)
  const [showScanComments, setShowScanComments] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [closestContractIndex, setClosestContractIndex] = useState<number>(-1)
  const [closestContract, setClosestContract] = useState<any>(null)
  const [contractId, setContractId] = useState<string>('')


  const handleCopy = () => {
    navigator.clipboard.writeText(contractCode)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  useEffect(() => {
    // Since contractsArray now has only one entry, directly use it
    const contract = contractsArray[0];
    setClosestContractIndex(0);
    setClosestContract(contract);
     
    if (contract && contract.solidityScanResults) {
      setSolidityScanResults(contract.solidityScanResults);
    }
  }, [contractCode]);

  const useDeployContract = async ({ sourceCode }: { sourceCode: string }) => {
    try {
      if (!closestContract) {
        throw new Error("No matching contract found");
      }

      const { abi, bytecode } = closestContract;

      //@ts-ignore
      const hash = await walletClient?.deployContract({
        //@ts-ignore
        abi,
        bytecode,
        account: walletAddress,
        args: [],
      });

      console.log('Contract deployed. Transaction hash:', hash);

      if (hash) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        console.log('Contract deployed at:', receipt.contractAddress);
        return { 
          contractAddress: receipt.contractAddress, 
          contractIndex: closestContractIndex 
        };
      }
    } catch (error) {
      console.error('Error deploying contract:', error);
      throw error;
    }
  }



  const useHandleDeploy = async () => {
    setIsLoading(true)
    const hashaddress = await useDeployContract({ sourceCode: contractCode })

    if (hashaddress) {
      //@ts-ignore
      setDeployedAddress(hashaddress.contractAddress)
      setShowCode(false)
      setIsDeployed(true)
       
      // Save contract data to JSON storage
      await saveContractData({
        //@ts-ignore
        contractAddress: hashaddress.contractAddress,
        //@ts-ignore
        transactionHash: hashaddress.transactionHash || '',
        contractIndex: closestContractIndex
      })
    }
    setIsLoading(false)
  }
  
  const saveContractData = async (deploymentData: any) => {
    try {
      console.log('saveContractData called with:', deploymentData);
      
      if (!closestContract || !walletAddress) {
        console.error('Missing required data:', { closestContract: !!closestContract, walletAddress: !!walletAddress });
        return;
      }
       
      const contractData = {
        name: closestContract.name || 'ReusableEscrow',
        contractAddress: deploymentData.contractAddress,
        abi: closestContract.abi,
        bytecode: closestContract.bytecode,
        contractType: getContractType(closestContract.name),
        partyA: walletAddress,
        transactionHash: deploymentData.transactionHash,
        networkId: '0G-testnet',
        description: getContractDescription(closestContract.name)
      }
      
      console.log('Sending contract data to API:', contractData);
       
      const response = await fetch('/api/contracts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contractData)
      })
      
      console.log('API response status:', response.status);
      console.log('API response ok:', response.ok);
       
      if (response.ok) {
         const result = await response.json()
         setContractId(result.contract.id)
         console.log('Contract data saved successfully:', result.contract.id)
      } else {
        // Handle non-200 responses
        const errorData = await response.text();
        console.error('API returned error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorData
        });
        
        // Try to parse as JSON for better error details
        try {
          const errorJson = JSON.parse(errorData);
          console.error('Parsed error details:', errorJson);
        } catch (parseError) {
          console.error('Could not parse error response as JSON');
        }
      }
    } catch (error) {
      console.error('Error saving contract data:', error)
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }
  
  const getContractType = (contractName: string): string => {
    if (contractName.includes('NFT')) return 'Digital Asset-to-NFT'
    if (contractName.includes('ERC20')) return 'Token-to-ERC20'
    if (contractName.includes('Asset')) return 'Digital Asset Exchange'
    return 'General Escrow'
  }
  
  const getContractDescription = (contractName: string): string => {
    if (contractName.includes('NFT')) return 'Convert digital assets to NFT tokens'
    if (contractName.includes('ERC20')) return 'Convert assets to ERC20 tokens'
    if (contractName.includes('Asset')) return 'Exchange digital assets securely'
    return 'General purpose escrow contract'
  }



  const toggleCode = () => {
    setShowCode(!showCode)
  }
 
  // Placeholder values for now
  const roundedSecurityScore = 75;
  const roundedThreatScore = 25;

  return (
    <div className="w-full max-w-2xl bg-white/5 backdrop-blur-md text-gray-200 rounded-2xl overflow-hidden border border-white/25 shadow-2xl font-mono">
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-[#4299e1]">Escrow Contract</h3>
          {!isDeployed && (
            <Button
              onClick={handleCopy}
              variant="outline"
              size="sm"
              className="text-gray-200 border-white/25 hover:bg-[#4299e1] hover:text-white hover:border-[#4299e1] transition-all duration-300"
            >
              {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          )}
        </div>
        

        
        {showCode && (
          <ScrollArea className="h-96 w-full border border-white/25 rounded-xl p-4 bg-white/3">
            <pre className="text-sm">
              <code>{contractCode}</code>
            </pre>
          </ScrollArea>
        )}
        
        {isDeployed && !showCode && (
          <div className="bg-white/5 backdrop-blur-md p-6 rounded-xl border border-[#4299e1] mb-6 shadow-lg">
            <div className="space-y-2">
              <p className="text-[#4299e1] font-bold text-lg">Contract deployed successfully!</p>
              <p className="text-sm">
                <span className="text-gray-300">Contract Address:</span>{' '}
                <span className="text-[#4299e1] break-all cursor-pointer font-mono" onClick={() => navigator.clipboard.writeText(deployedAddress)} title="Click to copy">
                  {deployedAddress}
                </span>
              </p>
              
              <div className="mt-4 space-y-2">
                <p className="text-sm text-gray-300 mt-4 mb-3 font-medium">Manage your deployed contract:</p>
                <div className="flex gap-2 flex-wrap">
                  <Button 
                    onClick={() => window.open(`https://chainscan-newton.0g.ai/address/${deployedAddress}`, '_blank')} 
                    className="bg-gradient-to-r from-[#4299e1] to-[#3182ce] text-gray-100 rounded-xl hover:from-[#3182ce] hover:to-[#2b6cb0] transition-all duration-300 shadow-lg"
                  >
                    Check on 0G Explorer
                  </Button>
                  {contractId && (
                    <Button 
                      onClick={() => window.open(`/contract/${contractId}`, '_blank')} 
                      className="bg-gradient-to-r from-[#38a169] to-[#2f855a] text-gray-100 rounded-xl hover:from-[#2f855a] hover:to-[#276749] transition-all duration-300 shadow-lg"
                    >
                      Open Contract Page
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="bg-gradient-to-r from-[#4299e1] to-[#3182ce] text-white p-4 rounded-b-xl">
        {!isDeployed ? (
          <div className="space-y-4 w-full">
            <Button 
              onClick={useHandleDeploy} 
              disabled={isLoading || !walletAddress}
              className="w-full bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold py-2 px-4 rounded-xl"
            >
              {isLoading ? (
                <>
                  <span className="animate-pulse mr-2">●</span>
                  Deploying...
                </>
              ) : !walletAddress ? (
                'Connect Wallet First'
              ) : (
                'Deploy Contract'
              )}
            </Button>
        </div>
        ) : (
          <div className="flex justify-between items-center w-full">
            <span className="text-sm font-medium">Contract deployed successfully!</span>
            <a
              href={`https://chainscan-newton.0g.ai/address/${deployedAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/10 text-white px-4 py-2 rounded-xl hover:bg-white/20 hover:text-white transition-colors duration-200 flex items-center"
            >
              View on 0G Explorer <ExternalLink className="w-4 h-4 ml-2" />
            </a>
          </div>
        )}
      </div>
      
      {/* Show SolidityScan Results */}
      {closestContract && (
        <div className="p-4 border-t border-white/25">
          <h4 className="text-lg font-semibold mb-4 text-[#4299e1]">SolidityScan Results</h4>
          <div className="mb-4 p-3 border border-[#4299e1] rounded-xl bg-[#4299e1]/5">
            <div className="text-[#4299e1] flex items-center">
              <Check className="w-4 h-4 mr-2" />
              Contract ready for deployment! Security analysis available.
            </div>
            <div className="mt-2 text-sm text-gray-400">
              <p>Contract: {closestContract.name || 'ReusableEscrow'}</p>
              <p>ABI: {closestContract.abi ? 'Available' : 'Not available'}</p>
              <p>Bytecode: {closestContract.bytecode ? `${closestContract.bytecode.slice(0, 20)}...` : 'Not available'}</p>
            </div>
          </div>
          <div className="flex items-start mb-6">
            <div className="w-1/2 pr-4">
              <div className="w-32 h-32 mx-auto">
                {/* Placeholder for PieChart */}
                <div className="w-32 h-32 rounded-full bg-gray-800 flex items-center justify-center text-gray-200 text-2xl font-bold">
                  {roundedSecurityScore}%
                </div>
              </div>
              <p className="text-center mt-2 text-sm">Security Score</p>
            </div>
            <div className="w-1/2 pl-4">
              <div className="w-32 h-32 mx-auto">
                {/* Placeholder for PieChart */}
                <div className="w-32 h-32 rounded-full bg-gray-800 flex items-center justify-center text-gray-200 text-2xl font-bold">
                  {roundedThreatScore}%
                </div>
              </div>
              <p className="text-center mt-2 text-sm">Threat Score</p>
            </div>
          </div>
          <Button 
            onClick={() => setShowScanComments(!showScanComments)} 
            className="mb-4 bg-white/5 text-gray-200 border border-white/25 hover:bg-[#4299e1] hover:text-white hover:border-[#4299e1] transition-colors duration-200 w-full rounded-xl"
          >
            {showScanComments ? 'Hide' : 'Show'} Scan Comments
          </Button>
          {showScanComments && (
            <div className="text-sm mt-2 space-y-4">
              <div className="bg-white/3 p-3 rounded-xl border border-white/20">
                <h5 className="font-semibold mb-2 text-[#4299e1]">Security Score Comments:</h5>
                <p>Placeholder comments for security score.</p>
              </div>
              <div className="bg-white/3 p-3 rounded-xl border border-white/20">
                <h5 className="font-semibold mb-2 text-[#4299e1]">Security Scan Comments:</h5>
                <p>Placeholder comments for security scan.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}