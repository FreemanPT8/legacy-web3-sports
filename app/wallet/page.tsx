'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Wallet,
  Send,
  Download,
  TrendingUp,
  Clock,
  Copy,
  ExternalLink,
  Plus
} from 'lucide-react';

interface Token {
  id: string;
  name: string;
  symbol: string;
  balance: number;
  value_usd: number;
  change_24h: number;
  icon: string;
}

interface Transaction {
  id: string;
  type: 'send' | 'receive' | 'stake' | 'claim';
  token: string;
  amount: number;
  from?: string;
  to?: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
}

export default function WalletPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [walletAddress] = useState('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    loadWalletData();
  }, [user]);

  const loadWalletData = () => {
    const mockTokens: Token[] = [
      {
        id: '1',
        name: 'Ethereum',
        symbol: 'ETH',
        balance: 2.5,
        value_usd: 5250.00,
        change_24h: 3.5,
        icon: '⟠',
      },
      {
        id: '2',
        name: 'Apertum Token',
        symbol: 'APT',
        balance: 1000,
        value_usd: 1500.00,
        change_24h: -1.2,
        icon: '🔷',
      },
      {
        id: '3',
        name: 'USDC',
        symbol: 'USDC',
        balance: 500,
        value_usd: 500.00,
        change_24h: 0.0,
        icon: '💵',
      },
    ];

    const mockTransactions: Transaction[] = [
      {
        id: '1',
        type: 'receive',
        token: 'APT',
        amount: 100,
        from: '0x1234...5678',
        date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        status: 'completed',
      },
      {
        id: '2',
        type: 'send',
        token: 'ETH',
        amount: 0.5,
        to: '0x8765...4321',
        date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        status: 'completed',
      },
      {
        id: '3',
        type: 'claim',
        token: 'APT',
        amount: 50,
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'completed',
      },
      {
        id: '4',
        type: 'stake',
        token: 'APT',
        amount: 500,
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'completed',
      },
    ];

    setTokens(mockTokens);
    setTransactions(mockTransactions);
    setLoading(false);
  };

  const totalBalance = tokens.reduce((acc, token) => acc + token.value_usd, 0);

  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
  };

  const getTimeSince = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-[#000c12] py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">Your Wallet</h1>
              <p className="text-muted-foreground">Manage your crypto assets on Apertum network</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-2">
                <Card className="bg-gradient-to-br from-blue-600 to-cyan-600 text-white">
                  <CardContent className="p-8">
                    <div className="flex items-center gap-2 mb-6">
                      <Wallet className="h-6 w-6" />
                      <span className="text-sm opacity-90">Total Balance</span>
                    </div>
                    <div className="text-5xl font-bold mb-6">
                      ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="flex items-center gap-2 bg-white/10 rounded-lg px-4 py-3">
                      <span className="text-sm flex-1 font-mono truncate">{walletAddress}</span>
                      <Button size="sm" variant="ghost" onClick={copyAddress} className="text-white hover:bg-white/20">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-white hover:bg-white/20">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <Card>
                  <CardContent className="p-6">
                    <Button className="w-full  mb-3">
                      <Download className="h-4 w-4 mr-2" />
                      {t('wallet.receive')}
                    </Button>
                    <Button className="w-full" variant="outline">
                      <Send className="h-4 w-4 mr-2" />
                      {t('wallet.send')}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Tabs defaultValue="tokens" className="space-y-6">
              <TabsList>
                <TabsTrigger value="tokens">
                  <Wallet className="h-4 w-4 mr-2" />
                  {t('wallet.tokens')}
                </TabsTrigger>
                <TabsTrigger value="transactions">
                  <Clock className="h-4 w-4 mr-2" />
                  {t('wallet.transactions')}
                </TabsTrigger>
                <TabsTrigger value="nfts">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  NFTs
                </TabsTrigger>
              </TabsList>

              <TabsContent value="tokens">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Your Tokens</CardTitle>
                      <Button size="sm" variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Token
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {tokens.map((token) => (
                          <div
                            key={token.id}
                            className="flex items-center justify-between p-4 bg-card rounded-lg hover:bg-muted transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-4">
                              <div className="text-3xl">{token.icon}</div>
                              <div>
                                <div className="font-semibold">{token.name}</div>
                                <div className="text-sm text-muted-foreground">{token.symbol}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">
                                {token.balance.toLocaleString()} {token.symbol}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                ${token.value_usd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </div>
                              <Badge
                                variant={token.change_24h >= 0 ? 'default' : 'destructive'}
                                className="mt-1"
                              >
                                {token.change_24h >= 0 ? '+' : ''}{token.change_24h.toFixed(2)}%
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="transactions">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('wallet.transactionHistory')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {transactions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No transactions yet
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {transactions.map((tx) => (
                          <div
                            key={tx.id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className={`p-2 rounded-full ${
                                tx.type === 'receive' ? 'bg-green-100' :
                                tx.type === 'send' ? 'bg-primary/10' :
                                tx.type === 'stake' ? 'bg-purple-100' :
                                'bg-yellow-100'
                              }`}>
                                {tx.type === 'receive' ? <Download className="h-5 w-5 text-green-600" /> :
                                 tx.type === 'send' ? <Send className="h-5 w-5 text-primary" /> :
                                 tx.type === 'stake' ? <TrendingUp className="h-5 w-5 text-purple-600" /> :
                                 <Plus className="h-5 w-5 text-yellow-600" />}
                              </div>
                              <div>
                                <div className="font-semibold capitalize">{tx.type}</div>
                                <div className="text-sm text-muted-foreground">
                                  {tx.from && `From ${tx.from}`}
                                  {tx.to && `To ${tx.to}`}
                                  {!tx.from && !tx.to && getTimeSince(tx.date)}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`font-semibold ${
                                tx.type === 'receive' || tx.type === 'claim' ? 'text-green-600' : ''
                              }`}>
                                {tx.type === 'receive' || tx.type === 'claim' ? '+' : '-'}
                                {tx.amount} {tx.token}
                              </div>
                              <div className="text-sm text-muted-foreground">{getTimeSince(tx.date)}</div>
                              <Badge
                                variant={
                                  tx.status === 'completed' ? 'default' :
                                  tx.status === 'pending' ? 'secondary' :
                                  'destructive'
                                }
                                className="mt-1"
                              >
                                {tx.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="nfts">
                <Card>
                  <CardContent className="text-center py-12">
                    <TrendingUp className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No NFTs Yet</h3>
                    <p className="text-muted-foreground mb-6">
                      Start collecting NFTs on the Apertum network
                    </p>
                    <Button className="">
                      Explore NFT Marketplace
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <Card className="mt-6 bg-gradient-to-r from-purple-50 to-blue-50">
              <CardHeader>
                <CardTitle>Earn More Tokens</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-gray-700">
                  Complete platform activities to earn APT tokens and other rewards
                </p>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>✓ Complete lessons and courses</li>
                  <li>✓ Participate in forum discussions</li>
                  <li>✓ Maintain daily streaks</li>
                  <li>✓ Achieve milestones</li>
                </ul>
                <Button className="">
                  View Opportunities
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}








