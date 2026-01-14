import { supabaseAdmin } from '../lib/supabase';
import { classifyRole, NormalizedPrivateMessageRole } from '../lib/private-messages';

const HOUSE_LIMIT = Number(process.env.SEED_HOUSE_MESSAGE_LIMIT ?? 5);

const TEMPLATE_MESSAGES = [
  {
    type: 'head-to-member' as const,
    subject: (houseKey: string) => `Boas-vindas da House ${houseKey}`,
    body: (houseName: string) =>
      `Queremos que tenhas o melhor começo possível na ${houseName}. Se precisares de ajuda, responde a esta mensagem.`,
  },
  {
    type: 'member-to-head' as const,
    subject: (houseKey: string) => `Dúvida sobre a ${houseKey}`,
    body: (houseName: string) =>
      `Já atingi o mínimo de XP exigido e gostava de partilhar uma ideia para o próximo encontro da ${houseName}.`,
  },
  {
    type: 'moderator-to-member' as const,
    subject: (houseKey: string) => `Resumo semanal da ${houseKey}`,
    body: (houseName: string) =>
      `Esta é uma nota rápida da equipa de moderação da ${houseName}. Continua o bom trabalho e marca presença nos eventos.`,
  },
];

type Template = typeof TEMPLATE_MESSAGES[number];

type UserHouseRecord = { user_id: string | null; role: string | null };

async function hydrateParticipants(houseId: string) {
  const { data } = await supabaseAdmin
    .from('user_houses')
    .select('user_id, role')
    .eq('house_id', houseId)
    .is('removed_at', null);

  const records = (data ?? []) as (UserHouseRecord | null | undefined)[];
  return records
    .filter(
      (record): record is UserHouseRecord =>
        !!record?.user_id &&
        typeof record.user_id === 'string',
    )
    .map((record) => ({
      userId: record.user_id as string,
      role: classifyRole(record.role),
    }));
}

function pickFirst(ids: string[] | undefined) {
  return ids && ids.length ? ids[0] : null;
}

async function messageExists(houseKey: string, subject: string) {
  const { data, error } = await supabaseAdmin
    .from('house_private_messages')
    .select('id')
    .eq('house_key', houseKey)
    .eq('subject', subject)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('Error checking existing message', error);
    return false;
  }
  return !!data;
}

async function seedHouseMessages() {
  if (!supabaseAdmin) {
    throw new Error('supabaseAdmin client unavailable');
  }

  const { data: houses, error: housesError } = await supabaseAdmin
    .from('houses_of_sports')
    .select('id, house_key, name_i18n')
    .range(0, Math.max(HOUSE_LIMIT - 1, 0));

  if (housesError) {
    throw housesError;
  }

  const createdMessages: string[] = [];

  for (const house of houses ?? []) {
    const houseKey = (house.house_key || '').trim();
    if (!houseKey) continue;

    const houseName =
      (house.name_i18n as Record<string, string> | null)?.pt ||
      (house.name_i18n as Record<string, string> | null)?.en ||
      houseKey;

    const members = await hydrateParticipants(house.id);
    const roleBuckets: Record<NormalizedPrivateMessageRole, string[]> = {
      head: [],
      moderator: [],
      member: [],
      unknown: [],
    };

    members.forEach((participant) => {
      roleBuckets[participant.role].push(participant.userId);
    });

    const headId = pickFirst(roleBuckets.head);
    const moderatorId = pickFirst(roleBuckets.moderator);
    const memberId = pickFirst(roleBuckets.member) ?? pickFirst(roleBuckets.unknown);

    if (!headId || !memberId) {
      console.log(`Skipping ${houseKey} because head or member is missing.`);
      continue;
    }

    const now = Date.now();
    const toInsert: any[] = [];

    for (const template of TEMPLATE_MESSAGES) {
      let senderId: string | null = null;
      let recipientId: string | null = null;

      if (template.type === 'head-to-member') {
        senderId = headId;
        recipientId = memberId;
      } else if (template.type === 'member-to-head') {
        senderId = memberId;
        recipientId = headId;
      } else if (template.type === 'moderator-to-member' && moderatorId) {
        senderId = moderatorId;
        recipientId = memberId;
      }

      if (!senderId || !recipientId) continue;

      const subject = template.subject(houseKey.toUpperCase());
      const body = template.body(houseName);

      /* Skip duplicate subjects to ease repeated runs */
      if (await messageExists(houseKey, subject)) {
        continue;
      }

      toInsert.push({
        house_id: house.id,
        house_key: houseKey,
        sender_id: senderId,
        recipient_id: recipientId,
        subject,
        body,
        created_at: new Date(now - createdMessages.length * 1000 * 60).toISOString(),
      });
      createdMessages.push(subject);
    }

    if (toInsert.length) {
      const { error } = await supabaseAdmin.from('house_private_messages').insert(toInsert);
      if (error) {
        console.error('Error inserting house messages', error);
      } else {
        console.log(`Seeded ${toInsert.length} messages for ${houseKey}`);
      }
    }
  }

  console.log('Seeding completed.', createdMessages.length, 'messages created.');
}

seedHouseMessages()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to seed house messages', error);
    process.exit(1);
  });
