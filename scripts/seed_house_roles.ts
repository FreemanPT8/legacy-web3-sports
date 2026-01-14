import { supabaseAdmin } from '../lib/supabase';
import { ensureUserRole } from '../lib/roles';

type HouseRow = {
  id: string;
  house_key: string | null;
};

type UserRow = {
  id: string;
  role: string | null;
  username: string | null;
};

type AdminAssignmentRow = {
  id: string;
  user_id: string | null;
  houses: string[] | null;
};

async function seedHouseRoles() {
  if (!supabaseAdmin) {
    throw new Error('supabaseAdmin client unavailable');
  }

  const { data: houses, error: houseError } = await supabaseAdmin
    .from('houses_of_sports')
    .select('id, house_key');
  if (houseError) {
    throw houseError;
  }

  const { data: users, error: userError } = await supabaseAdmin
    .from('users')
    .select('id, role, username');
  if (userError) {
    throw userError;
  }

  const roleBuckets: Record<'Super Admin' | 'Admin' | 'Member', UserRow[]> = {
    'Super Admin': [],
    Admin: [],
    Member: [],
  };

  (users ?? []).forEach((user: UserRow) => {
    const normalized = ensureUserRole(user.role);
    if (normalized === 'Super Admin') {
      roleBuckets['Super Admin'].push(user);
    } else if (normalized === 'Admin') {
      roleBuckets.Admin.push(user);
    } else {
      roleBuckets.Member.push(user);
    }
  });

  const pickUser = (roles: Array<'Super Admin' | 'Admin' | 'Member'>): UserRow | null => {
    for (const role of roles) {
      if (roleBuckets[role].length) return roleBuckets[role][0];
    }
    return users && users.length ? users[0] : null;
  };

  const { data: assignments } = await supabaseAdmin
    .from('admin_assignments')
    .select('id, user_id, houses');

  const assignmentsByUser = new Map<string, AdminAssignmentRow>();
  (assignments ?? []).forEach((row: AdminAssignmentRow) => {
    if (row.user_id) assignmentsByUser.set(row.user_id, row);
  });

  const { data: existingHeads } = await supabaseAdmin
    .from('house_heads')
    .select('house_id');
  const headHouseIds = new Set<string>((existingHeads ?? []).map((row: any) => row.house_id));

  const { data: existingMembers } = await supabaseAdmin
    .from('user_houses')
    .select('house_id')
    .eq('membership_role', 'MEMBER')
    .is('removed_at', null);
  const memberHouseIds = new Set<string>((existingMembers ?? []).map((row: any) => row.house_id));

  for (const house of houses ?? []) {
    const houseKey = (house.house_key || '').trim().toUpperCase();
    if (!houseKey) continue;

    if (!headHouseIds.has(house.id)) {
      const headUser = pickUser(['Super Admin', 'Admin']);
      if (!headUser) {
        console.log(`No admin user available to assign head for ${houseKey}`);
      } else {
        let assignment = assignmentsByUser.get(headUser.id);
        if (!assignment) {
          const { data: inserted, error } = await supabaseAdmin
            .from('admin_assignments')
            .insert({ user_id: headUser.id, houses: [houseKey], countries: [] })
            .select('id, user_id, houses')
            .single();
          if (error) {
            console.error('Failed to create admin assignment', error);
          } else if (inserted) {
            assignment = inserted as AdminAssignmentRow;
            assignmentsByUser.set(headUser.id, assignment);
          }
        } else {
          const housesList = Array.isArray(assignment.houses) ? assignment.houses : [];
          if (!housesList.includes(houseKey)) {
            const next = Array.from(new Set([...housesList, houseKey]));
            await supabaseAdmin
              .from('admin_assignments')
              .update({ houses: next })
              .eq('id', assignment.id);
            assignment.houses = next;
          }
        }

        if (assignment?.id) {
          const { error } = await supabaseAdmin.from('house_heads').insert({
            house_id: house.id,
            admin_id: assignment.id,
          });
          if (error) {
            console.error(`Failed to assign head for ${houseKey}`, error);
          } else {
            headHouseIds.add(house.id);
          }
        }
      }
    }

    if (!memberHouseIds.has(house.id)) {
      const memberUser = pickUser(['Member', 'Admin', 'Super Admin']);
      if (!memberUser) {
        console.log(`No member user available to assign for ${houseKey}`);
      } else {
        const { error } = await supabaseAdmin.from('user_houses').upsert(
          {
            user_id: memberUser.id,
            house_id: house.id,
            membership_role: 'MEMBER',
            assigned_via: 'SEED',
          },
          { onConflict: 'user_id,house_id,membership_role' },
        );
        if (error) {
          console.error(`Failed to assign member for ${houseKey}`, error);
        } else {
          memberHouseIds.add(house.id);
        }
      }
    }
  }

  console.log('House roles seed completed.');
}

seedHouseRoles()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to seed house roles', error);
    process.exit(1);
  });
