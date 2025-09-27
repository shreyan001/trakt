'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send } from 'lucide-react'
import { HumanMessageText } from "@/components/ui/message"
import { EndpointsContext } from '@/app/agent'
import { useActions } from '@/ai/client'
import ConnectButton from './ui/walletButton'
import Image from 'next/image'
import { useAccount } from 'wagmi'
import PortfolioWallet from './ui/portfolioWallet';
import CreditTracker from './ui/creditTracker';
import ContractFractionalization from './ui/contractFractionalization';

export function MainPage() {
  const { address, isConnected } = useAccount()
  const actions = useActions<typeof EndpointsContext>();
  const [input, setInput] = useState("")
  const [sidebarTab, setSidebarTab] = useState<'wallet' | 'credit' | 'contracts'>('wallet')
  const [history, setHistory] = useState<[role: string, content: string][]>([
    ["human", "Hello!"],
    ["ai", "Welcome to Trakt! How can I assist you today?"]
  ]);
  const [elements, setElements] = useState<JSX.Element[]>([]);

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [elements]); // This will trigger whenever elements change

  const handleSend = async () => {
    if (!isConnected) {
      // Optionally, you can show a message to the user here
      console.log("Please connect your wallet to chat");
      return;
    }

    const currentInput = input;
    const newElements = [...elements];
    
    const humanMessageRef = React.createRef<HTMLDivElement>();
    const humanKey = `human-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    newElements.push(
      <div className="flex flex-col items-end w-full gap-1 mt-auto" key={humanKey} ref={humanMessageRef}>
        <HumanMessageText content={currentInput} />
      </div>
    );
    
    setElements(newElements);
    setInput("");

    // Update history with the new human message
    const updatedHistory: [role: string, content: string][] = [...history, ["human", currentInput]];
    setHistory(updatedHistory);

    // Scroll to the human message
    setTimeout(() => {
      humanMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);

    const element = await actions.agent({
      chat_history: updatedHistory,
      input: currentInput
    });

    const aiMessageRef = React.createRef<HTMLDivElement>();
    const aiKey = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setElements(prevElements => [
      ...prevElements,
      <div className="flex flex-col gap-1 w-full max-w-fit mr-auto" key={aiKey} ref={aiMessageRef}>
        {element.ui}
      </div>
    ]);

    // Update history with the actual AI response content
    const aiResponse = element.responseContent || "AI response received";
    setHistory(prevHistory => [...prevHistory, ["ai", aiResponse]]);

    // Scroll to show the top of the AI message
    setTimeout(() => {
      aiMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 2000);
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-[#111827] via-[#1f2937] to-[#0f172a] text-white font-sans">
      <nav className="flex justify-between items-center p-6 border-b border-gray-700/50 bg-gradient-to-r from-[#3B82F6] via-[#2563eb] to-[#1d4ed8] shadow-xl backdrop-blur-sm">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-gradient-to-br from-[#10B981] to-[#059669] rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-white drop-shadow-lg">Trakt SDK</span>
            <span className="text-xs text-blue-100/80 font-medium">Foundational Tooling for 0G Chain</span>
          </div>
        </div>
        <ConnectButton/>
      </nav>
      
      <div className="flex-1 flex p-8 gap-6">
        <div className="w-96 flex-shrink-0 space-y-4">
          {/* Sidebar Navigation */}
          <div className="flex bg-gray-800/40 rounded-xl p-1 backdrop-blur-xl border border-gray-700/30">
            <button
              onClick={() => setSidebarTab('wallet')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                sidebarTab === 'wallet' 
                  ? 'bg-[#3B82F6] text-white shadow-lg' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              Wallet
            </button>
            <button
              onClick={() => setSidebarTab('credit')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                sidebarTab === 'credit' 
                  ? 'bg-[#3B82F6] text-white shadow-lg' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              Credit
            </button>
            <button
              onClick={() => setSidebarTab('contracts')}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                sidebarTab === 'contracts' 
                  ? 'bg-[#3B82F6] text-white shadow-lg' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              Contracts
            </button>
          </div>

          {/* Sidebar Content */}
          <div className="h-[calc(100vh-200px)] overflow-y-auto">
            {sidebarTab === 'wallet' && <PortfolioWallet />}
            {sidebarTab === 'credit' && <CreditTracker />}
            {sidebarTab === 'contracts' && <ContractFractionalization />}
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-4xl bg-gray-900/40 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/30 overflow-hidden">
          <ScrollArea ref={scrollAreaRef} className="h-[500px]">
            {elements.length > 0 ? (
              <div className="flex flex-col w-full gap-4 p-6">{elements}</div>
            ) : isConnected ? (
              <div className="flex h-full items-center justify-center">
              </div>
            ) : (
              <div className="flex h-full items-center justify-center p-8">
                <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl p-8 border border-gray-700/40 shadow-2xl text-center max-w-md">
                  <div className="mb-6">
                    <div className="w-16 h-16 bg-gradient-to-r from-[#3B82F6] to-[#2563eb] rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Connect to 0G Network</h3>
                    <p className="text-gray-300 text-sm leading-relaxed">Connect your wallet to access Trakt SDK features and start building on 0G chain.</p>
                  </div>
                  <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/30">
                    <p className="text-xs text-gray-400 mb-2">Supported on 0G Chain</p>
                    <div className="flex justify-center space-x-2">
                      <div className="bg-[#10B981]/20 border border-[#10B981]/30 rounded-lg px-3 py-1 text-xs text-[#10B981]">MetaMask</div>
                      <div className="bg-[#10B981]/20 border border-[#10B981]/30 rounded-lg px-3 py-1 text-xs text-[#10B981]">WalletConnect</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
          
          <div className="p-6 border-t border-gray-700/30 bg-gray-800/20">
            <div className="flex space-x-4">
              <Input
                placeholder={
                  isConnected
                    ? "Build autonomous contracts on 0G chain or ask about SDK features..."
                    : "Connect wallet to access Trakt SDK"
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) =>
                  e.key === "Enter" && isConnected && handleSend()
                }
                className="bg-gray-800/50 text-white border-gray-600/50 rounded-xl flex-grow focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/30 transition-all placeholder-gray-400 backdrop-blur-sm"
                disabled={!isConnected}
              />
              <Button
                onClick={handleSend}
                className={`bg-gradient-to-r from-[#3B82F6] to-[#2563eb] text-white border-0 rounded-xl px-6 py-3 text-sm font-semibold hover:from-[#10B981] hover:to-[#059669] transition-all duration-300 flex items-center space-x-2 shadow-lg ${
                  !isConnected && "opacity-50 cursor-not-allowed"
                }`}
                disabled={!isConnected}
              >
                <Send className="w-4 h-4" />
                <span>Build</span>
              </Button>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}