'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { SPORTS_ROLES } from '@/lib/i18n';
import { useLanguage } from '@/contexts/LanguageContext';
import { User, Lock, Trophy, Award } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [profileData, setProfileData] = useState({
    bio: '',
    sports_role: '',
    telegram: '',
    dao1_did_nft: '',
    wallet_address: '',
    website: '',
    youtube: '',
    linkhub: '',
    facebook: '',
    instagram: '',
    profile_visibility: {
      bio: false,
      sports_role: false,
      telegram: false,
      dao1_did_nft: false,
      wallet_address: false,
      website: true,
      youtube: false,
      linkhub: false,
      facebook: false,
      instagram: false,
    },
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000c12] text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-sm text-slate-300">Loading...</p>
        </div>
      </div>
    );
  }

  const isUnlocked = user.xp_total >= 99;

  const xpRewards: Record<string, number> = {
    bio: 25,
    sports_role: 19,
    telegram: 19,
    dao1_did_nft: 33,
    wallet_address: 19,
    youtube: 9,
    linkhub: 33,
    facebook: 9,
    instagram: 9,
  };

  const handleSave = async () => {
    if (!isUnlocked) {
      toast({
        title: 'Profile locked',
        description: 'Earn 99 XP to unlock profile editing',
        variant: 'destructive',
      });
      return;
    }

    if (
      profileData.bio &&
      (profileData.bio.length < 8 || profileData.bio.length > 888)
    ) {
      toast({
        title: 'Invalid bio length',
        description: 'Bio must be between 8 and 888 characters',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Profile updated!',
          description: data.xpEarned
            ? `Your changes have been saved. +${data.xpEarned} XP earned!`
            : 'Your changes have been saved successfully.',
        });
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to update profile',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    }

    setSaving(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#000c12] text-white">
      <Header />

      <main className="flex-1 bg-[#000c12] py-8">
        <div className="mx-auto w-full max-w-4xl px-4">
            {/* Header com XP */}
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                  Your Profile
                </h1>
                <p className="text-sm text-slate-300">
                  Manage your personal information and privacy settings
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">
                  {user.xp_total} XP
                </div>
                <p className="text-sm text-slate-300">
                  Level {Math.floor(user.xp_total / 100)}
                </p>
              </div>
            </div>

            {/* Aviso de perfil bloqueado */}
            {!isUnlocked && (
              <Card className="mb-6 border-2 border-yellow-500 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-800">
                    <Lock className="h-5 w-5" />
                    Profile Editing Locked
                  </CardTitle>
                  <CardDescription className="text-yellow-700">
                    Earn {99 - user.xp_total} more XP to unlock full profile
                    editing capabilities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 bg-yellow-200 rounded-full h-3">
                      <div
                        className="bg-yellow-600 h-3 rounded-full transition-all"
                        style={{
                          width: `${Math.min(
                            (user.xp_total / 99) * 100,
                            100,
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-yellow-800">
                      {user.xp_total}/99
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Basic Information */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Basic Information
                </CardTitle>
                <CardDescription>
                  Public information visible to all users
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Username</Label>
                      <Input value={user.username} disabled />
                      <p className="text-xs text-slate-300 mt-1">
                        Cannot be changed
                      </p>
                  </div>
                  <div>
                    <Label>Country</Label>
                      <Input value="Your Country" disabled />
                      <p className="text-xs text-slate-300 mt-1">
                        Cannot be changed
                      </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profile Details */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  Profile Details{' '}
                    {!isUnlocked && (
                      <Lock className="h-4 w-4 text-slate-300" />
                    )}
                </CardTitle>
                <CardDescription>
                  Earn XP by completing your profile. Toggle visibility for each
                  field.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Bio */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="bio">{t('profile.bioLabel')}</Label>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-green-600"
                      >
                        +{xpRewards.bio} XP
                      </Badge>
                      <Switch
                        checked={profileData.profile_visibility.bio}
                        onCheckedChange={(checked) =>
                          setProfileData({
                            ...profileData,
                            profile_visibility: {
                              ...profileData.profile_visibility,
                              bio: checked,
                            },
                          })
                        }
                        disabled={!isUnlocked}
                      />
                      <span className="text-sm text-slate-300">
                          Public
                        </span>
                    </div>
                  </div>
                  <Textarea
                    id="bio"
                    rows={4}
                    placeholder="Tell us about yourself..."
                    value={profileData.bio}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        bio: e.target.value,
                      })
                    }
                    disabled={!isUnlocked}
                    maxLength={888}
                  />
                  <p className="text-xs text-slate-300">
                      {profileData.bio.length}/888 characters
                    </p>
                </div>

                {/* Sports Role */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sports_role">Sports Role</Label>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-green-600"
                      >
                        +{xpRewards.sports_role} XP
                      </Badge>
                      <Switch
                        checked={profileData.profile_visibility.sports_role}
                        onCheckedChange={(checked) =>
                          setProfileData({
                            ...profileData,
                            profile_visibility: {
                              ...profileData.profile_visibility,
                              sports_role: checked,
                            },
                          })
                        }
                        disabled={!isUnlocked}
                      />
                      <span className="text-sm text-slate-300">
                          Public
                        </span>
                    </div>
                  </div>
                  <Select
                    value={profileData.sports_role}
                    onValueChange={(value) =>
                      setProfileData({
                        ...profileData,
                        sports_role: value,
                      })
                    }
                    disabled={!isUnlocked}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      {SPORTS_ROLES[language].map(
                        (role: any, index: number) => (
                          <SelectItem
                            key={role?.value ?? String(index)}
                            value={role?.value ?? role}
                          >
                            {role?.label ?? role}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Outros campos com XP + visibilidade */}
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    {
                      key: 'telegram',
                      label: 'Telegram',
                      xp: xpRewards.telegram,
                    },
                    {
                      key: 'dao1_did_nft',
                      label: 'DAO1 DID NFT',
                      xp: xpRewards.dao1_did_nft,
                    },
                    {
                      key: 'wallet_address',
                      label: 'Wallet Address',
                      xp: xpRewards.wallet_address,
                    },
                    { key: 'website', label: 'Website', xp: 0 },
                    {
                      key: 'youtube',
                      label: 'YouTube',
                      xp: xpRewards.youtube,
                    },
                    {
                      key: 'linkhub',
                      label: 'LinkHub',
                      xp: xpRewards.linkhub,
                    },
                    {
                      key: 'facebook',
                      label: 'Facebook',
                      xp: xpRewards.facebook,
                    },
                    {
                      key: 'instagram',
                      label: 'Instagram',
                      xp: xpRewards.instagram,
                    },
                  ].map((field) => (
                    <div key={field.key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={field.key}>{field.label}</Label>
                        <div className="flex items-center gap-2">
                          {field.xp > 0 && (
                            <Badge
                              variant="outline"
                              className="text-green-600 text-xs"
                            >
                              +{field.xp} XP
                            </Badge>
                          )}
                          <Switch
                            checked={
                              profileData.profile_visibility[
                                field.key as keyof typeof profileData.profile_visibility
                              ]
                            }
                            onCheckedChange={(checked) =>
                              setProfileData({
                                ...profileData,
                                profile_visibility: {
                                  ...profileData.profile_visibility,
                                  [field.key]: checked,
                                },
                              })
                            }
                            disabled={!isUnlocked}
                          />
                        </div>
                      </div>
                      <Input
                        id={field.key}
                        placeholder={`Your ${field.label.toLowerCase()}`}
                        value={
                          profileData[
                            field.key as keyof typeof profileData
                          ] as string
                        }
                        onChange={(e) =>
                          setProfileData({
                            ...profileData,
                            [field.key]: e.target.value,
                          })
                        }
                        disabled={!isUnlocked}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* XP Rewards Card */}
            <Card className="mb-6 bg-gradient-to-br from-[#05212b] via-[#000c12] to-[#05212b] border border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  Profile XP Rewards
                </CardTitle>
              </CardHeader>
                <CardContent>
                 <p className="text-sm text-slate-300 mb-4">
                    Complete your profile fields to earn bonus XP! Each field is
                  awarded once.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(xpRewards).map(([key, xp]) => (
                    <div
                      key={key}
                      className="bg-[#000c12] border border-white/10 p-3 rounded-lg text-center"
                    >
                      <div className="text-xl font-bold text-primary">
                        +{xp}
                      </div>
                      <div className="text-xs text-slate-300 capitalize">
                        {key.replace('_', ' ')}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={handleSave}
              size="lg"
              className="w-full"
              disabled={!isUnlocked || saving}
            >
              {saving ? t('profile.saving') : t('profile.saveProfile')}
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
