'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  PieChart, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Calendar, 
  Shield, 
  ArrowUpRight,
  Clock,
  CheckCircle2
} from 'lucide-react'

interface FractionalContract {
  id: string
  type: 'rental' | 'freelance'
  title: string
  totalValue: number
  fractionsSold: number
  totalFractions: number
  monthlyReturn: number
  duration: string
  status: 'active' | 'completed' | 'pending'
  riskLevel: 'low' | 'medium' | 'high'
  nextPayment: string
  investors: number
}

interface Investment {
  id: string
  contractId: string
  contractTitle: string
  fractionsOwned: number
  totalInvested: number
  currentValue: number
  monthlyReturn: number
  status: 'earning' | 'completed'
}

export default function ContractFractionalization() {
  const [activeTab, setActiveTab] = useState('available')

  // Mock data - in real implementation, this would come from 0G chain
  const availableContracts: FractionalContract[] = [
    {
      id: '1',
      type: 'rental',
      title: 'Downtown Apartment - 2BR',
      totalValue: 150000,
      fractionsSold: 750,
      totalFractions: 1000,
      monthlyReturn: 8.5,
      duration: '12 months',
      status: 'active',
      riskLevel: 'low',
      nextPayment: '2024-02-01',
      investors: 45
    },
    {
      id: '2',
      type: 'freelance',
      title: 'E-commerce Platform Development',
      totalValue: 50000,
      fractionsSold: 200,
      totalFractions: 500,
      monthlyReturn: 12.0,
      duration: '6 months',
      status: 'active',
      riskLevel: 'medium',
      nextPayment: '2024-01-25',
      investors: 12
    },
    {
      id: '3',
      type: 'rental',
      title: 'Commercial Office Space',
      totalValue: 300000,
      fractionsSold: 1800,
      totalFractions: 2000,
      monthlyReturn: 6.8,
      duration: '24 months',
      status: 'active',
      riskLevel: 'low',
      nextPayment: '2024-02-15',
      investors: 89
    }
  ]

  const myInvestments: Investment[] = [
    {
      id: '1',
      contractId: '1',
      contractTitle: 'Downtown Apartment - 2BR',
      fractionsOwned: 50,
      totalInvested: 7500,
      currentValue: 7850,
      monthlyReturn: 637.5,
      status: 'earning'
    },
    {
      id: '2',
      contractId: '2',
      contractTitle: 'E-commerce Platform Development',
      fractionsOwned: 25,
      totalInvested: 2500,
      currentValue: 2650,
      monthlyReturn: 300,
      status: 'earning'
    }
  ]

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-[#10B981] bg-[#10B981]/20 border-[#10B981]/30'
      case 'medium': return 'text-[#F59E0B] bg-[#F59E0B]/20 border-[#F59E0B]/30'
      case 'high': return 'text-red-400 bg-red-400/20 border-red-400/30'
      default: return 'text-gray-400 bg-gray-400/20 border-gray-400/30'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-[#10B981] bg-[#10B981]/20 border-[#10B981]/30'
      case 'completed': return 'text-[#3B82F6] bg-[#3B82F6]/20 border-[#3B82F6]/30'
      case 'pending': return 'text-[#F59E0B] bg-[#F59E0B]/20 border-[#F59E0B]/30'
      default: return 'text-gray-400 bg-gray-400/20 border-gray-400/30'
    }
  }

  const totalInvested = myInvestments.reduce((sum, inv) => sum + inv.totalInvested, 0)
  const totalCurrentValue = myInvestments.reduce((sum, inv) => sum + inv.currentValue, 0)
  const totalMonthlyReturn = myInvestments.reduce((sum, inv) => sum + inv.monthlyReturn, 0)

  return (
    <div className="space-y-6">
      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-800/60 border-gray-700/40 backdrop-blur-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#3B82F6]/20 rounded-xl flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-[#3B82F6]" />
              </div>
              <div>
                <div className="text-xl font-bold text-white">${totalInvested.toLocaleString()}</div>
                <div className="text-sm text-gray-400">Total Invested</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/60 border-gray-700/40 backdrop-blur-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#10B981]/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#10B981]" />
              </div>
              <div>
                <div className="text-xl font-bold text-white">${totalCurrentValue.toLocaleString()}</div>
                <div className="text-sm text-gray-400">Current Value</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/60 border-gray-700/40 backdrop-blur-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#F59E0B]/20 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[#F59E0B]" />
              </div>
              <div>
                <div className="text-xl font-bold text-white">${totalMonthlyReturn.toLocaleString()}</div>
                <div className="text-sm text-gray-400">Monthly Return</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/60 border-gray-700/40 backdrop-blur-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#10B981]/20 rounded-xl flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5 text-[#10B981]" />
              </div>
              <div>
                <div className="text-xl font-bold text-[#10B981]">
                  +{(((totalCurrentValue - totalInvested) / totalInvested) * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-400">Total Return</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-800/60 border border-gray-700/40">
          <TabsTrigger value="available" className="data-[state=active]:bg-[#3B82F6] data-[state=active]:text-white">
            Available Contracts
          </TabsTrigger>
          <TabsTrigger value="portfolio" className="data-[state=active]:bg-[#3B82F6] data-[state=active]:text-white">
            My Portfolio
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-4">
          {availableContracts.map((contract) => (
            <Card key={contract.id} className="bg-gray-800/60 border-gray-700/40 backdrop-blur-xl">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2">
                      {contract.type === 'rental' ? (
                        <div className="w-8 h-8 bg-[#3B82F6]/20 rounded-lg flex items-center justify-center">
                          <Shield className="w-4 h-4 text-[#3B82F6]" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 bg-[#10B981]/20 rounded-lg flex items-center justify-center">
                          <PieChart className="w-4 h-4 text-[#10B981]" />
                        </div>
                      )}
                      {contract.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={`text-xs ${getRiskColor(contract.riskLevel)} border`}>
                        {contract.riskLevel} risk
                      </Badge>
                      <Badge className={`text-xs ${getStatusColor(contract.status)} border`}>
                        {contract.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs border-gray-600 text-gray-300">
                        {contract.type}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">${contract.totalValue.toLocaleString()}</div>
                    <div className="text-sm text-gray-400">Total Value</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-400">Fractions Sold</span>
                        <span className="text-white">{contract.fractionsSold}/{contract.totalFractions}</span>
                      </div>
                      <Progress 
                        value={(contract.fractionsSold / contract.totalFractions) * 100} 
                        className="h-2 bg-gray-700"
                      />
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-400">{contract.investors} investors</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm">Monthly Return</span>
                      <span className="text-[#10B981] font-semibold">{contract.monthlyReturn}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm">Duration</span>
                      <span className="text-white text-sm">{contract.duration}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400 text-sm">Next Payment</span>
                      <span className="text-white text-sm">{new Date(contract.nextPayment).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex flex-col justify-center">
                    <Button className="bg-gradient-to-r from-[#3B82F6] to-[#2563eb] hover:from-[#10B981] hover:to-[#059669] text-white">
                      Invest Now
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="portfolio" className="space-y-4">
          {myInvestments.map((investment) => (
            <Card key={investment.id} className="bg-gray-800/60 border-gray-700/40 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
                    {investment.contractTitle}
                  </div>
                  <Badge className={`text-xs ${getStatusColor(investment.status)} border`}>
                    {investment.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Fractions Owned</div>
                    <div className="text-xl font-bold text-white">{investment.fractionsOwned}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Total Invested</div>
                    <div className="text-xl font-bold text-white">${investment.totalInvested.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Current Value</div>
                    <div className="text-xl font-bold text-[#10B981]">${investment.currentValue.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Monthly Return</div>
                    <div className="text-xl font-bold text-[#F59E0B]">${investment.monthlyReturn.toLocaleString()}</div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-700/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-400">Next payment in 5 days</span>
                    </div>
                    <div className="text-sm text-[#10B981]">
                      +{(((investment.currentValue - investment.totalInvested) / investment.totalInvested) * 100).toFixed(1)}% return
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}