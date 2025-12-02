'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, User as UserIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';

type LegacyUser = {
  id: string;
  username: string | null;
  xp_total: number | null;
};

type UserSelectProps = {
  value: string | null;
  onChange: (userId: string) => void;
  label?: string;
  placeholder?: string;
};

export function UserSelect({
  value,
  onChange,
  label = 'Select User',
  placeholder = 'Search user...',
}: UserSelectProps) {
  const { getToken } = useAuth();

  const [users, setUsers] = useState<LegacyUser[]>([]);
  const [filtered, setFiltered] = useState<LegacyUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadUsers() {
    try {
      setLoading(true);
      const token = getToken();

      const res = await fetch('/api/admin/users/list', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setUsers(data.users);
        setFiltered(data.users);
      } else {
        console.error('Failed to load users:', data.error);
      }
    } catch (err) {
      console.error('UserSelect error:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (search.trim() === '') {
      setFiltered(users);
    } else {
      const s = search.toLowerCase();
      setFiltered(
        users.filter((u) =>
          (u.username || '').toLowerCase().includes(s)
        )
      );
    }
  }, [search, users]);

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium mb-1">
          {label}
        </label>
      )}

      <Input
        placeholder={placeholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-1"
      />

      <div
        className="
          max-h-56 overflow-y-auto border rounded-md bg-white
          dark:bg-gray-900 dark:border-gray-700
        "
      >
        {loading ? (
          <div className="p-4 flex items-center gap-2 text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading users...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">
            No users found.
          </div>
        ) : (
          filtered.map((u) => {
            const selected = u.id === value;
            return (
              <button
                key={u.id}
                onClick={() => onChange(u.id)}
                className={`
                  w-full text-left px-3 py-2 flex items-center gap-3
                  hover:bg-blue-50 dark:hover:bg-gray-800
                  ${selected ? 'bg-blue-100 dark:bg-blue-900/40' : ''}
                `}
              >
                <UserIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />

                <div className="flex-1">
                  <p className="font-medium">{u.username || '(no name)'}</p>
                  <p className="text-xs text-gray-500">
                    {u.xp_total ?? 0} XP
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
