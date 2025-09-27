import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { FileText, ExternalLink } from 'lucide-react';
import deployedContractsData from '../../lib/deployedContracts.json';

type Contract = {
  id: string;
  name: string;
  contractType: string;
  deployedAt: string;
  contractAddress: string;
  description?: string;
  partyA?: string;
  partyB?: string;
};

export default function DeployedContracts() {
  const { address, isConnected } = useAccount();
  const [userContracts, setUserContracts] = useState<Contract[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);

  useEffect(() => {
    if (isConnected && address) {
      fetchUserContracts();
    }
  }, [isConnected, address]);

  const fetchUserContracts = async () => {
    setContractsLoading(true);
    try {
      // Use real data from deployedContracts.json and filter by partyA
      const allContracts: Contract[] = deployedContractsData.map(contract => ({
        id: contract.id,
        name: contract.name,
        contractType: contract.contractType,
        deployedAt: contract.deployedAt,
        contractAddress: contract.contractAddress,
        description: contract.description,
        partyA: contract.partyA,
        partyB: contract.partyB
      }));
      
      // Filter contracts where partyA matches the connected wallet address
      const userOwnedContracts = allContracts.filter(contract => 
        contract.partyA && address && 
        contract.partyA.toLowerCase() === address.toLowerCase()
      );
      
      // Simulate API delay for better UX
      setTimeout(() => {
        setUserContracts(userOwnedContracts);
        setContractsLoading(false);
      }, 500);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      setContractsLoading(false);
    }
  };

  if (!isConnected) {
    return <div>Please connect your wallet</div>;
  }

  return (
    <div className="w-full bg-black/35 backdrop-blur-md text-white font-mono p-4 rounded-2xl border border-white/20 shadow-2xl mt-4">
      <h2 className="text-xl font-bold mb-4 text-[#4299e1] flex items-center">
        <FileText className="h-5 w-5 mr-2" />
        Recent Escrow Contracts
      </h2>
      <div className="bg-black/20 p-4 rounded-xl border border-white/10">
        {contractsLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#4299e1]"></div>
            <span className="ml-2 text-gray-400 text-sm">Loading contracts...</span>
          </div>
        ) : userContracts.length > 0 ? (
          <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-black scrollbar-track-transparent">
            <div className="space-y-2 pr-1">
              {userContracts.map((contract, index) => (
                <div
                  key={contract.id}
                  onClick={() => window.open(`/contract/${contract.id}`, '_blank')}
                  className="bg-black/20 hover:bg-black/30 border border-white/10 hover:border-[#4299e1] p-3 rounded-xl cursor-pointer transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-white font-medium text-sm group-hover:text-[#4299e1] transition-colors">
                          {contract.name}
                        </h3>
                        <span className="text-xs bg-[#4299e1] text-white px-2 py-0.5 rounded-full font-medium">
                          {contract.contractType}
                        </span>
                      </div>
                      <p className="text-gray-400 text-xs">
                        Contract: {contract.contractAddress.slice(0, 8)}...{contract.contractAddress.slice(-6)}
                      </p>
                      {contract.partyA && (
                        <p className="text-gray-400 text-xs">
                          Party A: {contract.partyA.slice(0, 6)}...{contract.partyA.slice(-4)}
                        </p>
                      )}
                      {contract.partyB && (
                        <p className="text-gray-400 text-xs">
                          Party B: {contract.partyB.slice(0, 6)}...{contract.partyB.slice(-4)}
                        </p>
                      )}
                      <p className="text-gray-500 text-xs">
                        {new Date(contract.deployedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-gray-500 group-hover:text-[#4299e1] transition-colors" />
                  </div>
                </div>
              ))}
            </div>
            {userContracts.length > 4 && (
              <div className="text-center pt-2 border-t border-white/10 mt-2">
                <span className="text-gray-400 text-xs">
                  Showing {userContracts.length} deployed contracts
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            <FileText className="h-8 w-8 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-400 text-sm mb-1">No contracts deployed yet</p>
            <p className="text-gray-500 text-xs">Deploy your first contract to see it here</p>
          </div>
        )}
      </div>
    </div>
  );
}