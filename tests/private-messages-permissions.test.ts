import assert from 'node:assert/strict';
import './setup-env';
import {
  canSendPrivateMessage,
  classifyRole,
  MESSAGE_XP_THRESHOLD,
  NormalizedPrivateMessageRole,
} from '@/lib/private-messages';

type TestFn = () => void | Promise<void>;

async function runTest(name: string, fn: TestFn) {
  try {
    await fn();
    console.log(`✔ ${name}`);
  } catch (error) {
    console.error(`✖ ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

async function main() {
  await runTest('classifyRole normalizes known roles', () => {
    const expectations: Record<string, NormalizedPrivateMessageRole> = {
      Head: 'head',
      'Lead Moderator': 'moderator',
      Member: 'member',
      '': 'member',
      Stranger: 'unknown',
    };

    for (const [input, expected] of Object.entries(expectations)) {
      assert.equal(classifyRole(input), expected);
    }
  });

  await runTest('members can message staff once XP threshold is met', () => {
    const result = canSendPrivateMessage({
      senderRole: 'member',
      recipientRole: 'head',
      senderXp: MESSAGE_XP_THRESHOLD,
    });
    assert.ok(result.allowed);
  });

  await runTest('members cannot message staff before XP threshold', () => {
    const result = canSendPrivateMessage({
      senderRole: 'member',
      recipientRole: 'head',
      senderXp: MESSAGE_XP_THRESHOLD - 1,
    });
    assert.equal(result.allowed, false);
    assert.equal(result.reason, 'xp-threshold');
  });

  await runTest('members cannot message other members', () => {
    const result = canSendPrivateMessage({
      senderRole: 'member',
      recipientRole: 'member',
      senderXp: MESSAGE_XP_THRESHOLD * 2,
    });
    assert.equal(result.allowed, false);
    assert.equal(result.reason, 'member-recipient-staff');
  });

  await runTest('staff can message members', () => {
    const result = canSendPrivateMessage({
      senderRole: 'head',
      recipientRole: 'member',
      senderXp: 0,
    });
    assert.ok(result.allowed);
  });

  await runTest('staff cannot message other staff', () => {
    const result = canSendPrivateMessage({
      senderRole: 'moderator',
      recipientRole: 'head',
    });
    assert.equal(result.allowed, false);
    assert.equal(result.reason, 'staff-recipient-member');
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
