'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, Calendar, DollarSign, CheckCircle, Clock, AlertTriangle } from 'lucide-react'

interface PaymentRecord {
  id: string
  type: 'rent' | 'freelance'
  amount: number
  date: string
  status: 'completed' | 'pending' | 'overdue'
  description: string
}

interface CreditData {
  score: number
  totalPayments: number
  onTimePayments: number
  totalEarnings: number
  recentPayments: PaymentRecord[]
}

export default function CreditTracker() {
  // Mock data - in real implementation, this would come from 0G chain
  const creditData: CreditData = {
    score: 785,
    totalPayments: 24,
    onTimePayments: 22,
    totalEarnings: 45000,
    recentPayments: [
      {
        id: '1',
        type: 'rent',
        amount: 1500,
        date: '2024-01-15',
        status: 'completed',
        description: 'Monthly Rent - Downtown Apartment'
      },
      {
        id: '2',
        type: 'freelance',
        amount: 2500,
        date: '2024-01-12',
        status: 'completed',
        description: 'Web Development Project'
      },
      {
        id: '3',
        type: 'rent',
        amount: 1500,
        date: '2024-01-01',
        status: 'pending',
        description: 'Monthly Rent - Downtown Apartment'
      }
    ]
  }

  const onTimeRate = (creditData.onTimePayments / creditData.totalPayments) * 100

  const getScoreColor = (score: number) => {
    if (score >= 750) return 'text-[#10B981]'
    if (score >= 650) return 'text-[#F59E0B]'
    return 'text-red-400'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-[#10B981]" />
      case 'pending':
        return <Clock className="w-4 h-4 text-[#F59E0B]" />
      case 'overdue':
        return <AlertTriangle className="w-4 h-4 text-red-400" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    const baseClasses = "text-xs font-medium px-2 py-1 rounded-full"
    switch (status) {
      case 'completed':
        return `${baseClasses} bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30`
      case 'pending':
        return `${baseClasses} bg-[#F59E0B]/20 text-[#F59E0B] border border-[#F59E0B]/30`
      case 'overdue':
        return `${baseClasses} bg-red-400/20 text-red-400 border border-red-400/30`
      default:
        return baseClasses
    }
  }

  return (
    <div className="space-y-6">
      {/* Credit Score Overview */}
      <Card className="bg-gray-800/60 border-gray-700/40 backdrop-blur-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#3B82F6]" />
            Credit Score on 0G Chain
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className={`text-4xl font-bold ${getScoreColor(creditData.score)}`}>
                {creditData.score}
              </div>
              <div className="text-sm text-gray-400">Excellent Credit</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold text-white">
                {onTimeRate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-400">On-time Rate</div>
            </div>
          </div>
          <Progress 
            value={onTimeRate} 
            className="h-2 bg-gray-700"
          />
        </CardContent>
      </Card>

      {/* Payment Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gray-800/60 border-gray-700/40 backdrop-blur-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#3B82F6]/20 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[#3B82F6]" />
              </div>
              <div>
                <div className="text-xl font-bold text-white">{creditData.totalPayments}</div>
                <div className="text-sm text-gray-400">Total Payments</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/60 border-gray-700/40 backdrop-blur-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#10B981]/20 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-[#10B981]" />
              </div>
              <div>
                <div className="text-xl font-bold text-white">{creditData.onTimePayments}</div>
                <div className="text-sm text-gray-400">On-time Payments</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/60 border-gray-700/40 backdrop-blur-xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#F59E0B]/20 rounded-xl flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-[#F59E0B]" />
              </div>
              <div>
                <div className="text-xl font-bold text-white">${creditData.totalEarnings.toLocaleString()}</div>
                <div className="text-sm text-gray-400">Total Earnings</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Payment History */}
      <Card className="bg-gray-800/60 border-gray-700/40 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-white">Recent Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {creditData.recentPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-xl border border-gray-600/30">
                <div className="flex items-center gap-3">
                  {getStatusIcon(payment.status)}
                  <div>
                    <div className="text-white font-medium">{payment.description}</div>
                    <div className="text-sm text-gray-400 flex items-center gap-2">
                      <Badge variant="outline" className={`${payment.type === 'rent' ? 'border-[#3B82F6]/30 text-[#3B82F6]' : 'border-[#10B981]/30 text-[#10B981]'} bg-transparent`}>
                        {payment.type}
                      </Badge>
                      <span>{new Date(payment.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-semibold">${payment.amount.toLocaleString()}</div>
                  <div className={getStatusBadge(payment.status)}>
                    {payment.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}