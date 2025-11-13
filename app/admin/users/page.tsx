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

  // Redirect if not admin
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (!loading && user && user.role !== 'Super Admin' && user.role !== 'Admin') {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  // Fetch users with auth token
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/admin/users', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });

        const data = await response.json();
        if (data.success) {
          setUsers(data.users || []);
          setFilteredUsers(data.users || []);
        } else {
          console.error('Error loading users:', data.error);
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

  // Filters
  useEffect(() => {
    let filtered = users;

    if (searchQuery) {
      filtered = filtered.filter(u =>
        u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => u.role === roleFilter);
    }

    setFilteredUsers(filtered);
  }, [searchQuery, roleFilter, users]);

  // View user
  const handleViewUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
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

  // Edit user
  const handleEditUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
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

  // Save changes
  const handleSaveUser = async () => {
    if (!editUserModal) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/users/${editUserModal.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
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

        // Refresh list
        const usersResponse = await fetch('/api/admin/users', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });

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
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const stats = {
    total: users.length,
    superAdmins: users.filter(u => u.role === 'Super Admin').length,
    admins: users.filter(u => u.role === 'Admin').length,
    members: users.filter(u => u.role === 'Member').length,
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-8 bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="container mx-auto px-4 max-w-7xl">

          {/* HEADER */}
          <div className="mb-8">
            <Link href="/admin">
              <Button variant="ghost" className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Admin
              </Button>
            </Link>
            <h1 className="text-4xl font-bold mb-2">User Management</h1>
            <p className="text-gray-600">View and manage user accounts, roles, and permissions</p>
          </div>

          {/* STATS */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <Card><CardHeader><CardTitle>Total Users</CardTitle></CardHeader><CardContent><div className="text-3xl">{stats.total}</div></CardContent></Card>
            <Card><CardHeader><CardTitle>Super Admins</CardTitle></CardHeader><CardContent><div className="text-3xl text-purple-600">{stats.superAdmins}</div></CardContent></Card>
            <Card><CardHeader><CardTitle>Admins</CardTitle></CardHeader><CardContent><div className="text-3xl text-blue-600">{stats.admins}</div></CardContent></Card>
            <Card><CardHeader><CardTitle>Members</CardTitle></CardHeader><CardContent><div className="text-3xl text-green-600">{stats.members}</div></CardContent></Card>
          </div>

          {/* USERS LIST */}
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
                  <div className="animate-spin h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4">Loading users...</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p>No users found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">User</th>
                        <th className="text-left py-3 px-4">Email</th>
                        <th className="text-left py-3 px-4">Role</th>
                        <th className="text-left py-3 px-4">XP</th>
                        <th className="text-left py-3 px-4">Joined</th>
                        <th className="text-left py-3 px-4">Actions</th>
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
                                  <p className="text-sm text-gray-600">{u.full_name}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
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
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar className="h-4 w-4" />
                              {new Date(u.created_at).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleViewUser(u.id)}>
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleEditUser(u.id)}>
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
      </main>

      <Footer />

      {/* VIEW MODAL */}
      <Dialog open={!!viewUserModal} onOpenChange={() => setViewUserModal(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>Complete information about this user</DialogDescription>
          </DialogHeader>

          {/* … (NÃO ALTEREI ESTA PARTE, ESTÁ IGUAL AO TEU CÓDIGO ORIGINAL) … */}
          
        </DialogContent>
      </Dialog>

      {/* EDIT MODAL */}
      <Dialog open={!!editUserModal} onOpenChange={() => setEditUserModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user role and XP</DialogDescription>
          </DialogHeader>

          {/* … (NÃO ALTEREI NADA AQUI) … */}

        </DialogContent>
      </Dialog>
    </div>
  );
}
