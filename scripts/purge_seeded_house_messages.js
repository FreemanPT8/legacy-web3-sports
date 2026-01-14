/* eslint-disable no-console */
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing Supabase env vars for purge');
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function purgeSeededMessages() {
  const { data: deletedMessages, error: deleteError } = await supabase
    .from('house_private_messages')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
    .select('id');

  if (deleteError) {
    console.error('Failed to delete seeded messages', deleteError);
  } else {
    console.log('Deleted seeded messages:', (deletedMessages || []).length);
  }

  const { data: deletedMemberships, error: membershipError } = await supabase
    .from('user_houses')
    .delete()
    .eq('assigned_via', 'SEED');

  if (membershipError) {
    console.error('Failed to delete seeded memberships', membershipError);
  } else {
    console.log('Deleted seeded memberships:', (deletedMemberships || []).length);
  }
}

purgeSeededMessages()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Purge failed', error);
    process.exit(1);
  });
