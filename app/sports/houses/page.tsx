'use client';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Waves,
  Trophy,
  Clock,
  Mail,
  Dumbbell,
  Globe,
  Heart,
  Target,
  Zap,
  Bike,
  Activity,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

// Sport configurations with icons and colors
const sportsConfig = [
  {
    name: 'Swimming',
    icon: Waves,
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    iconColor: 'text-blue-600 dark:text-blue-400'
  },
  {
    name: 'Football',
    icon: Trophy,
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    iconColor: 'text-green-600 dark:text-green-400'
  },
  {
    name: 'Basketball',
    icon: Target,
    color: 'from-orange-500 to-red-500',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    iconColor: 'text-orange-600 dark:text-orange-400'
  },
  {
    name: 'Tennis',
    icon: Activity,
    color: 'from-yellow-500 to-amber-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
    iconColor: 'text-yellow-600 dark:text-yellow-400'
  },
  {
    name: 'Athletics',
    icon: Zap,
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    iconColor: 'text-purple-600 dark:text-purple-400'
  },
  {
    name: 'Cycling',
    icon: Bike,
    color: 'from-teal-500 to-cyan-500',
    bgColor: 'bg-teal-50 dark:bg-teal-950/30',
    iconColor: 'text-teal-600 dark:text-teal-400'
  },
  {
    name: 'Gymnastics',
    icon: Sparkles,
    color: 'from-rose-500 to-pink-500',
    bgColor: 'bg-rose-50 dark:bg-rose-950/30',
    iconColor: 'text-rose-600 dark:text-rose-400'
  },
  {
    name: 'Martial Arts',
    icon: Dumbbell,
    color: 'from-red-500 to-orange-500',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    iconColor: 'text-red-600 dark:text-red-400'
  },
];

export default function HousesPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Enhanced Hero Section */}
        <section className="relative bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-600 dark:from-blue-900 dark:via-cyan-900 dark:to-teal-900 text-white py-20 overflow-hidden">
          {/* Decorative Background Elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-300 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-teal-300 rounded-full blur-3xl" />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-block mb-4">
                <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm px-4 py-2 text-sm">
                  <Globe className="h-4 w-4 mr-2 inline" />
                  {t('houses.title')}
                </Badge>
              </div>

              <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
                {t('houses.mainTitle')}
              </h1>

              <p className="text-xl md:text-2xl text-blue-100 mb-8 leading-relaxed">
                {t('houses.mainSubtitle')}
              </p>

              <div className="flex flex-wrap gap-4 justify-center mb-12">
                <Link href="#houses">
                  <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg">
                    <Target className="h-5 w-5 mr-2" />
                    {t('houses.exploreHouses')}
                  </Button>
                </Link>
                <Link href="/sports/onboarding">
                  <Button size="lg" variant="outline" className="bg-transparent border-2 border-white text-white hover:bg-white/10 shadow-lg">
                    <Sparkles className="h-5 w-5 mr-2" />
                    {t('houses.applyToLead')}
                  </Button>
                </Link>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <div className="text-3xl font-bold mb-1">8</div>
                  <div className="text-sm text-blue-100">{t('houses.totalSports')}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <div className="text-3xl font-bold mb-1">∞</div>
                  <div className="text-sm text-blue-100">{t('houses.unlimitedPotential')}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <div className="text-3xl font-bold mb-1">24/7</div>
                  <div className="text-sm text-blue-100">{t('houses.communitySupport')}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Wave Divider */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
              <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 80C1200 80 1320 70 1380 65L1440 60V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="currentColor" className="text-gray-50 dark:text-gray-950"/>
            </svg>
          </div>
        </section>

        {/* Main Content */}
        <div className="bg-gray-50 dark:bg-gray-950 py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">

              {/* What are Houses Section */}
              <Card className="mb-12 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50 border-blue-200 dark:border-blue-800 shadow-lg">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-blue-600 p-2 rounded-lg">
                      <Heart className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-3xl">{t('houses.whatAre')}</CardTitle>
                  </div>
                  <CardDescription className="text-base">
                    {t('houses.whatAreDescEnhanced')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    {t('houses.whatAreDesc')}
                  </p>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl text-center shadow-md hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-700">
                      <div className="bg-blue-100 dark:bg-blue-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                      </div>
                      <p className="font-semibold text-lg mb-2">{t('houses.expertCommunities')}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t('houses.expertCommunitiesDesc')}</p>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl text-center shadow-md hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-700">
                      <div className="bg-cyan-100 dark:bg-cyan-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Trophy className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />
                      </div>
                      <p className="font-semibold text-lg mb-2">{t('houses.specializedContent')}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t('houses.specializedContentDesc')}</p>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl text-center shadow-md hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-700">
                      <div className="bg-teal-100 dark:bg-teal-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Mail className="h-8 w-8 text-teal-600 dark:text-teal-400" />
                      </div>
                      <p className="font-semibold text-lg mb-2">{t('houses.directSupport')}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t('houses.directSupportDesc')}</p>
                    </div>
                  </div>

                  {/* Benefits List */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-blue-600" />
                      {t('houses.benefits')}
                    </h3>
                    <ul className="grid md:grid-cols-2 gap-3">
                      <li className="flex items-start gap-2 text-sm">
                        <div className="mt-1 bg-green-100 dark:bg-green-900 rounded-full p-1">
                          <div className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                        </div>
                        <span>{t('houses.benefit1')}</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <div className="mt-1 bg-green-100 dark:bg-green-900 rounded-full p-1">
                          <div className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                        </div>
                        <span>{t('houses.benefit2')}</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <div className="mt-1 bg-green-100 dark:bg-green-900 rounded-full p-1">
                          <div className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                        </div>
                        <span>{t('houses.benefit3')}</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <div className="mt-1 bg-green-100 dark:bg-green-900 rounded-full p-1">
                          <div className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                        </div>
                        <span>{t('houses.benefit4')}</span>
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Houses Grid */}
              <div id="houses" className="mb-12">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold mb-3">{t('houses.underConstruction')}</h2>
                  <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                    {t('houses.constructionDesc')}
                  </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {sportsConfig.map((sport) => {
                    const IconComponent = sport.icon;
                    return (
                      <Card
                        key={sport.name}
                        className={`group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border-2 ${sport.bgColor}`}
                      >
                        <CardHeader>
                          <div className="flex items-center justify-between mb-4">
                            <div className={`bg-gradient-to-br ${sport.color} p-4 rounded-xl shadow-lg group-hover:scale-110 transition-transform`}>
                              <IconComponent className="h-8 w-8 text-white" strokeWidth={2.5} />
                            </div>
                            <Badge variant="outline" className="border-gray-300 dark:border-gray-600">
                              {t('houses.comingSoon')}
                            </Badge>
                          </div>
                          <CardTitle className="text-xl">
                            {t('houses.houseOf')} {sport.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                            {t('houses.underDevelopment')}
                          </p>
                          <Button
                            variant="outline"
                            className="w-full group-hover:bg-gray-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-gray-900 transition-colors"
                            disabled
                          >
                            <Clock className="h-4 w-4 mr-2" />
                            {t('houses.notifyMe')}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* Call to Action - Lead a House */}
              <Card className="bg-gradient-to-br from-blue-600 to-cyan-600 dark:from-blue-700 dark:to-cyan-700 text-white shadow-2xl border-0 overflow-hidden relative">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-300/10 rounded-full blur-3xl -ml-32 -mb-32" />

                <CardHeader className="relative z-10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                      <Trophy className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-3xl">{t('houses.startNewHouse')}</CardTitle>
                  </div>
                  <CardDescription className="text-blue-100 text-base">
                    {t('houses.helpBuild')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 relative z-10">
                  <p className="text-lg leading-relaxed">
                    {t('houses.professionalInterest')}
                  </p>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                      <Trophy className="h-8 w-8 mb-3" />
                      <p className="font-semibold mb-1">{t('houses.leadCommunityTitle')}</p>
                      <p className="text-sm text-blue-100">{t('houses.leadCommunity')}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                      <Users className="h-8 w-8 mb-3" />
                      <p className="font-semibold mb-1">{t('houses.shapeEducationTitle')}</p>
                      <p className="text-sm text-blue-100">{t('houses.shapeEducation')}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                      <Sparkles className="h-8 w-8 mb-3" />
                      <p className="font-semibold mb-1">{t('houses.receivePrivilegesTitle')}</p>
                      <p className="text-sm text-blue-100">{t('houses.receivePrivileges')}</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link href="/sports/onboarding" className="flex-1">
                      <Button size="lg" className="w-full bg-white text-blue-600 hover:bg-blue-50 shadow-lg text-base">
                        <Sparkles className="h-5 w-5 mr-2" />
                        {t('houses.applyToLead')}
                      </Button>
                    </Link>
                    <Link href="/about" className="flex-1">
                      <Button size="lg" variant="outline" className="w-full bg-transparent border-2 border-white text-white hover:bg-white/10 text-base">
                        {t('houses.learnMore')}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
