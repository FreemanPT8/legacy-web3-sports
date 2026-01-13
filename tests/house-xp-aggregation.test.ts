import assert from 'node:assert/strict';
import { deriveHouseParticipantCounts, deriveHouseXpSummary, type AggregatedHouseStats } from '@/lib/houses/stats';

type TestCase = () => Promise<void> | void;

async function runTest(name: string, fn: TestCase) {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

const baseStats: AggregatedHouseStats = {
  member_count: 12,
  member_only_count: 9,
  head_count: 1,
  moderator_count: 2,
  total_xp: 1200,
  head_xp: 300,
  moderator_xp: 250,
  member_xp: 650,
};

async function main() {
  await runTest('deriveHouseParticipantCounts respects stored totals', () => {
    const breakdown = deriveHouseParticipantCounts(baseStats);
    assert.equal(breakdown.total, 12);
    assert.equal(breakdown.head, 1);
    assert.equal(breakdown.moderators, 2);
    assert.equal(breakdown.members, 9);
  });

  await runTest('deriveHouseParticipantCounts infers member count when aggregate missing', () => {
    const breakdown = deriveHouseParticipantCounts({
      ...baseStats,
      member_count: null as any,
      member_only_count: null as any,
    });
    assert.equal(breakdown.total, 12);
    assert.equal(breakdown.members, 9);
  });

  await runTest('deriveHouseXpSummary returns stored total when provided', () => {
    const summary = deriveHouseXpSummary(baseStats);
    assert.equal(summary.totalXp, 1200);
    assert.deepEqual(summary.xpBreakdown, {
      head: 300,
      moderators: 250,
      members: 650,
    });
  });

  await runTest('deriveHouseXpSummary recomputes total when breakdown changes', () => {
    const summary = deriveHouseXpSummary({
      ...baseStats,
      total_xp: null as any,
      head_xp: 100,
      moderator_xp: 200,
      member_xp: 700,
    });
    assert.equal(summary.totalXp, 1000);
    assert.deepEqual(summary.xpBreakdown, {
      head: 100,
      moderators: 200,
      members: 700,
    });
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
