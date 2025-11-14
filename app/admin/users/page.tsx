'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Search, Users, Trophy, Mail, Calendar, Eye, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface UserDetail {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: string;
  xp_total: number;
  created_at: string;
  country: string;
  bio?: string;
  sports_role?: string;
  telegram?: string;
  dao1_did_nft?: string;
  wallet_address?: string;
  website?: string;
  youtube?: string;
  linkhub?: string;
  facebook?: string;
  instagram?: string;
  profile_unlocked: boolean;
  email_verified: boolean;
  last_login?: string;
  streak_count: number;
  avatar_url?: string;
}

export default function UserManagementPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [viewUserModal, setViewUserModal] = useState<UserDetail | null>(null);
  const [editUserModal, setEditUserModal] = useState<UserDetail | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editXP, setEditXP] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (!loading && user && user.role !== 'Super Admin' && user.role !== 'Admin') {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // cookies HTTP-only são enviados automaticamente
        const response = await fetch('/api/admin/users');
        const data = await response.json();
        if (data.success) {
          setUsers(data.users || []);
          setFilteredUsers(data.users || []);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
      setLoadingData(false);
    };

    if (user && (user.role === 'Super Admin' || user.role === 'Admin')) {
      fetchUsers();
    }
  }, [user]);

  useEffect(() => {
    let filtered = users;

    if (searchQuery) {
      filtered = filtered.filter((u) =>
        u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter((u) => u.role === roleFilter);
    }

    setFilteredUsers(filtered);
  }, [searchQuery, roleFilter, users]);

  const handleViewUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`);
      const data = await response.json();
      if (data.success) {
        setViewUserModal(data.user);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to load user details',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load user details',
        variant: 'destructive',
      });
    }
  };

  const handleEditUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`);
      const data = await response.json();
      if (data.success) {
        setEditUserModal(data.user);
        setEditRole(data.user.role);
        setEditXP(data.user.xp_total);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to load user details',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load user details',
        variant: 'destructive',
      });
    }
  };

  const handleSaveUser = async () => {
    if (!editUserModal) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/users/${editUserModal.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: editRole,
          xp_total: editXP,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Success',
          description: 'User updated successfully',
        });
        setEditUserModal(null);

        const usersResponse = await fetch('/api/admin/users');
        const usersData = await usersResponse.json();
        if (usersData.success) {
          setUsers(usersData.users || []);
          setFilteredUsers(usersData.users || []);
        }
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to update user',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update user',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user || (user.role !== 'Super Admin' && user.role !== 'Admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  const stats = {
    total: users.length,
    superAdmins: users.filter((u) => u.role === 'Super Admin').length,
    admins: users.filter((u) => u.role === 'Admin').length,
    members: users.filter((u) => u.role === 'Member').length,
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 dark:from-gray-950 dark:via-blue-950/20 dark:to-gray-900 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <Link href="/admin">
                <Button variant="ghost" className="mb-4">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Admin
                </Button>
              </Link>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">User Management</h1>
              <p className="text-gray-600 dark:text-gray-300">
                View and manage user accounts, roles, and permissions
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    Total Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.total}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    Super Admins
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600">{stats.superAdmins}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    Admins
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">{stats.admins}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    Members
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{stats.members}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    All Users ({filteredUsers.length})
                  </CardTitle>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-full sm:w-64"
                      />
                    </div>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="w-full sm:w-40">
                        <SelectValue placeholder="Filter by role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="Super Admin">Super Admin</SelectItem>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Member">Member</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingData ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-300">Loading users...</p>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-300">No users found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">User</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Role</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">XP</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Joined</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((u) => (
                          <tr key={u.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                                  {(u.username || u.email)?.[0]?.toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-medium">{u.username}</p>
                                  {u.full_name && (
                                    <p className="text-sm text-gray-600 dark:text-gray-300">
                                      {u.full_name}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                <Mail className="h-4 w-4" />
                                {u.email}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                className={
                                  u.role === 'Super Admin'
                                    ? 'bg-purple-600'
                                    : u.role === 'Admin'
                                    ? 'bg-blue-600'
                                    : 'bg-gray-600'
                                }
                              >
                                {u.role}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <Trophy className="h-4 w-4 text-yellow-600" />
                                <span className="font-semibold">{u.xp_total || 0}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                <Calendar className="h-4 w-4" />
                                {new Date(u.created_at).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewUser(u.id)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditUser(u.id)}
                                >
                                  <Edit className="h-4 w-4 mr-1" />
                                  Edit
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />

      {/* VIEW MODAL */}
      <Dialog open={!!viewUserModal} onOpenChange={() => setViewUserModal(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>Complete information about this user</DialogDescription>
          </DialogHeader>
          {viewUserModal && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold">Username</Label>
                  <p className="text-sm">{viewUserModal.username}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Full Name</Label>
                  <p className="text-sm">{viewUserModal.full_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Email</Label>
                  <p className="text-sm">{viewUserModal.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Country</Label>
                  <p className="text-sm">{viewUserModal.country}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Role</Label>
                  <Badge
                    className={
                      viewUserModal.role === 'Super Admin'
                        ? 'bg-purple-600'
                        : viewUserModal.role === 'Admin'
                        ? 'bg-blue-600'
                        : 'bg-gray-600'
                    }
                  >
                    {viewUserModal.role}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Total XP</Label>
                  <p className="text-sm font-bold">{viewUserModal.xp_total}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Streak</Label>
                  <p className="text-sm">{viewUserModal.streak_count} days</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Sports Role</Label>
                  <p className="text-sm">{viewUserModal.sports_role || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Email Verified</Label>
                  <Badge variant={viewUserModal.email_verified ? 'default' : 'secondary'}>
                    {viewUserModal.email_verified ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Profile Unlocked</Label>
                  <Badge variant={viewUserModal.profile_unlocked ? 'default' : 'secondary'}>
                    {viewUserModal.profile_unlocked ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Joined</Label>
                  <p className="text-sm">
                    {new Date(viewUserModal.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Last Login</Label>
                  <p className="text-sm">
                    {viewUserModal.last_login
                      ? new Date(viewUserModal.last_login).toLocaleDateString()
                      : 'Never'}
                  </p>
                </div>
              </div>
              {viewUserModal.bio && (
                <div>
                  <Label className="text-sm font-semibold">Bio</Label>
                  <p className="text-sm mt-1">{viewUserModal.bio}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                {viewUserModal.telegram && (
                  <div>
                    <Label className="text-sm font-semibold">Telegram</Label>
                    <p className="text-sm">{viewUserModal.telegram}</p>
                  </div>
                )}
                {viewUserModal.wallet_address && (
                  <div>
                    <Label className="text-sm font-semibold">Wallet</Label>
                    <p className="text-sm truncate">{viewUserModal.wallet_address}</p>
                  </div>
                )}
                {viewUserModal.website && (
                  <div>
                    <Label className="text-sm font-semibold">Website</Label>
                    <p className="text-sm truncate">{viewUserModal.website}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* EDIT MODAL */}
      <Dialog open={!!editUserModal} onOpenChange={() => setEditUserModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user role and XP</DialogDescription>
          </DialogHeader>
          {editUserModal && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-semibold mb-2">User</Label>
                <p className="text-sm">
                  {editUserModal.username} ({editUserModal.email})
                </p>
              </div>
              <div>
                <Label htmlFor="role" className="text-sm font-semibold">
                  Role
                </Label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Member">Member</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                    {user?.role === 'Super Admin' && (
                      <SelectItem value="Super Admin">Super Admin</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {user?.role !== 'Super Admin' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Only Super Admins can assign Super Admin role
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="xp" className="text-sm font-semibold">
                  Total XP
                </Label>
                <Input
                  id="xp"
                  type="number"
                  value={editXP}
                  onChange={(e) => setEditXP(parseInt(e.target.value) || 0)}
                  min="0"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUserModal(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveUser} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
