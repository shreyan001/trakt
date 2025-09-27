import { useAccount } from 'wagmi'
import { useState, useEffect } from 'react'
import { formatEther } from 'viem'
import { publicClient } from '@/walletConnect/siwe'
import DeployedContracts from './deployedContracts'

type Asset = {
    name: string
    symbol: string
    balance: number
    price: number
    value: number
  }
  
  export default function PortfolioWallet() {
    const { address, isConnected } = useAccount()

    const [assets, setAssets] = useState<Asset[]>([])
    const [netWorth, setNetWorth] = useState(0)
    const [profit, setProfit] = useState(0)

    useEffect(() => {
      if (isConnected && address) {
        fetchAssetData()
      }
    }, [isConnected, address])

    const fetchAssetData = async () => {
      if (!address) return

      const ogPrice = 10 // Fixed price for 0G token at $10
      let ogBalance = BigInt(0)

      try {
        ogBalance = await publicClient.getBalance({ address })
      } catch (error) {
        console.error('Error fetching balance:', error)
      }

      const ogBalanceNumber = parseFloat(formatEther(ogBalance))
      const ogValue = ogBalanceNumber * ogPrice

      const newAssets: Asset[] = [
        {
          name: "0G Network",
          symbol: "0G",
          balance: ogBalanceNumber,
          price: ogPrice,
          value: ogValue
        }
      ]

      setAssets(newAssets)
      setNetWorth(ogValue)
      // For this example, we'll set a static profit. In a real app, you'd calculate this based on historical data.
      setProfit(5.5)
    }

    if (!isConnected) {
      return (
        <div className="w-full bg-white/10 backdrop-blur-md text-white font-mono p-6 rounded-2xl border border-white/20 shadow-2xl">
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-[#4299e1] to-[#3182ce] rounded-full mx-auto mb-4 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-[#4299e1] mb-2">Wallet Required</h3>
            <p className="text-gray-300 text-sm mb-4">Connect your wallet to view your portfolio and manage assets</p>
            <div className="bg-white/5 rounded-xl p-3 border border-white/10">
              <p className="text-xs text-gray-400">💡 Connect wallet in the top right corner</p>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="w-full bg-white/10 backdrop-blur-md text-white font-mono p-4 rounded-2xl border border-white/20 shadow-2xl">
        <h2 className="text-xl font-bold mb-4 text-[#4299e1]">My Portfolio</h2>
        <div className="mb-4 bg-white/5 p-4 rounded-xl border border-white/10">
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-xs text-gray-400">Balance</p>
              <p>${netWorth.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Net Worth</p>
              <p>${netWorth.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Profit</p>
              <p className="text-[#3182ce]">+{profit.toFixed(2)}%</p>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-[#4299e1] mb-2">Available Assets</h3>
          {assets.map((asset, index) => (
            <div key={index} className="bg-white/5 p-3 rounded-xl text-xs border border-white/10">
              <div className="flex justify-between items-center">
                <p className="font-bold">{asset.symbol}</p>
                <p>${asset.value.toLocaleString()}</p>
              </div>
              <div className="flex justify-between text-gray-400">
                <p>{asset.balance.toLocaleString()}</p>
                <p>${asset.price.toLocaleString()}/token</p>
              </div>
            </div>
          ))}
        </div>
        <DeployedContracts />
      </div>
    )
  }