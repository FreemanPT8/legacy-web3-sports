import assert from 'node:assert/strict';
import {
  evaluateUnlockCondition,
  type UnlockCondition,
  type UnlockConditionContext,
} from '../lib/education/unlockLogic';

type PartialContext = Partial<UnlockConditionContext>;

function createContext(overrides: PartialContext = {}): UnlockConditionContext {
  return {
    xpTotal: 0,
    startHereCompleted: false,
    courseCompletionBySlug: {},
    levelStatuses: {},
    ...overrides,
  };
}

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

runTest('xp threshold respects minimum requirements', () => {
  const ctx = createContext({ xpTotal: 500 });

  assert.strictEqual(
    evaluateUnlockCondition(
      { type: 'xp_threshold', min_xp: 1000 } as UnlockCondition,
      ctx,
    ),
    false,
  );
  assert.strictEqual(
    evaluateUnlockCondition(
      { type: 'xp_threshold', min_xp: 200 } as UnlockCondition,
      ctx,
    ),
    true,
  );
});

runTest('course completion leverages start course progress and other slugs', () => {
  const ctx = createContext({
    startHereCompleted: true,
    courseCompletionBySlug: {
      'advanced-course': true,
    },
  });

  assert.strictEqual(
    evaluateUnlockCondition(
      { type: 'course_completed', course_slug: 'comeca-aqui' },
      ctx,
    ),
    true,
  );
  assert.strictEqual(
    evaluateUnlockCondition(
      { type: 'course_completed', course_slug: 'advanced-course' },
      ctx,
    ),
    true,
  );
  assert.strictEqual(
    evaluateUnlockCondition(
      { type: 'course_completed', course_slug: 'missing-course' },
      ctx,
    ),
    false,
  );
});

runTest('level dependencies validate unlocked and completed states', () => {
  const ctx = createContext({
    levelStatuses: {
      cadets: { isUnlocked: true, isCompleted: true },
      juveniles: { isUnlocked: true, isCompleted: false },
    },
  });

  assert.strictEqual(
    evaluateUnlockCondition(
      { type: 'academy_level_completed', level_slug: 'cadets' },
      ctx,
    ),
    true,
  );
  assert.strictEqual(
    evaluateUnlockCondition(
      { type: 'academy_level_completed', level_slug: 'juveniles' },
      ctx,
    ),
    false,
  );
  assert.strictEqual(
    evaluateUnlockCondition(
      { type: 'academy_level_unlocked', level_slug: 'juveniles' },
      ctx,
    ),
    true,
  );
});

if (process.exitCode && process.exitCode !== 0) {
  process.exit(process.exitCode);
}
