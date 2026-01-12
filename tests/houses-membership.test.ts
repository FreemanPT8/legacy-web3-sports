import assert from 'node:assert/strict';
import './setup-env';
import {
  ensureHouseForSportCountry,
  __setHouseCreationSupabaseAdmin,
} from '@/lib/houses/creation';
import {
  syncUserHouseMembership,
  __setUserHousesSupabaseAdmin,
  __setEnsureHouseForTests,
  __setSyncHouseMembersForTests,
} from '@/lib/user-houses';

type StepResult = { data?: any; error?: any };

type TableStep = {
  table: string;
  action: 'select' | 'maybeSingle' | 'single' | 'delete' | 'upsert';
  result?: StepResult;
  expectPayload?: (payload: any) => void;
};

type RpcStep = {
  action: 'rpc';
  fn: string;
  result?: StepResult;
  expectPayload?: (payload: any) => void;
};

type Step = TableStep | RpcStep;

class SupabaseMock {
  private steps: Step[];

  constructor(steps: Step[]) {
    this.steps = [...steps];
  }

  from(table: string) {
    return new QueryBuilder(table, this);
  }

  rpc(fn: string, params: Record<string, unknown>) {
    const { result } = this.consume({ action: 'rpc', fn }, { params });
    return Promise.resolve(result ?? { data: null, error: null });
  }

  assertComplete() {
    if (this.steps.length > 0) {
      throw new Error(`Supabase mock has ${this.steps.length} pending step(s).`);
    }
  }

  consume(descriptor: { action: Step['action']; table?: string; fn?: string }, payload?: any) {
    const step = this.steps.shift();
    if (!step) {
      throw new Error(
        `Unexpected ${descriptor.action} on ${descriptor.table ?? descriptor.fn}`,
      );
    }

    if (descriptor.action === 'rpc') {
      if (step.action !== 'rpc') {
        throw new Error(`Expected RPC step, received ${step.action}`);
      }
      const rpcStep = step as RpcStep;
      if (rpcStep.fn !== descriptor.fn) {
        throw new Error(`Expected RPC ${rpcStep.fn}, received ${descriptor.fn}`);
      }
    } else {
      if (step.action !== descriptor.action) {
        throw new Error(`Expected action ${step.action}, received ${descriptor.action}`);
      }
      const tableStep = step as TableStep;
      if (tableStep.table !== descriptor.table) {
        const expected = `${tableStep.table}`;
        throw new Error(`Expected table ${expected}, received ${descriptor.table}`);
      }
    }

    if (step.expectPayload) {
      step.expectPayload(payload);
    }

    return { result: step.result ?? { data: null, error: null } };
  }
}

class QueryBuilder {
  private insertPayload: any;

  constructor(private table: string, private mock: SupabaseMock) {}

  select() {
    return this;
  }

  eq() {
    return this;
  }

  is() {
    return this;
  }

  in() {
    return this;
  }

  limit() {
    return this;
  }

  order() {
    return this;
  }

  insert(payload: any) {
    this.insertPayload = payload;
    return this;
  }

  delete() {
    return new DeleteBuilder(this.table, this.mock);
  }

  upsert(payload: any) {
    const { result } = this.mock.consume(
      { action: 'upsert', table: this.table },
      payload,
    );
    return Promise.resolve(result ?? { error: null });
  }

  maybeSingle() {
    const { result } = this.mock.consume({ action: 'maybeSingle', table: this.table });
    return Promise.resolve(result ?? { data: null, error: null });
  }

  single() {
    const { result } = this.mock.consume(
      { action: 'single', table: this.table },
      this.insertPayload,
    );
    return Promise.resolve(result ?? { data: null, error: null });
  }

  then(resolve?: (value: StepResult) => void, reject?: (reason: unknown) => void) {
    const { result } = this.mock.consume({ action: 'select', table: this.table });
    return Promise.resolve(result ?? { data: null, error: null }).then(resolve, reject);
  }
}

class DeleteBuilder {
  constructor(private table: string, private mock: SupabaseMock) {}

  eq() {
    return this;
  }

  neq() {
    return this;
  }

  then(resolve?: (value: StepResult) => void, reject?: (reason: unknown) => void) {
    const { result } = this.mock.consume({ action: 'delete', table: this.table });
    return Promise.resolve(result ?? { error: null }).then(resolve, reject);
  }
}

async function runTest(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

async function main() {
  await runTest('ensureHouseForSportCountry returns existing house', async () => {
    const mock = new SupabaseMock([
      {
        table: 'houses_of_sports',
        action: 'maybeSingle',
        result: {
          data: { id: 'house-existing', house_key: 'HOUSE_EXISTING', status: 'active', country_code: 'PT' },
        },
      },
    ]);
    __setHouseCreationSupabaseAdmin(mock as any);

    const result = await ensureHouseForSportCountry({
      sportId: 'sport-1',
      countryCode: 'pt',
    });

    assert.equal(result.created, false);
    assert.equal(result.houseId, 'house-existing');
    assert.equal(result.countryCode, 'PT');

    mock.assertComplete();
    __setHouseCreationSupabaseAdmin();
  });

  await runTest('ensureHouseForSportCountry creates a new house when missing', async () => {
    const mock = new SupabaseMock([
      {
        table: 'houses_of_sports',
        action: 'maybeSingle',
        result: { data: null, error: null },
      },
      {
        table: 'sports',
        action: 'maybeSingle',
        result: { data: { id: 'sport-2', code: 'SPT', name_i18n: { en: 'Sport' } } },
      },
      {
        table: 'houses_of_sports',
        action: 'maybeSingle',
        result: { data: null, error: null },
      },
      {
        table: 'houses_of_sports',
        action: 'single',
        expectPayload: (payload) => {
          assert.equal(payload.sport_id, 'sport-2');
          assert.equal(payload.country_code, 'PT');
        },
        result: { data: { id: 'house-new', house_key: 'SPT_PT', status: 'under_construction', country_code: 'PT' } },
      },
    ]);
    __setHouseCreationSupabaseAdmin(mock as any);

    const result = await ensureHouseForSportCountry({
      sportId: 'sport-2',
      countryCode: 'pt',
    });

    assert.equal(result.created, true);
    assert.equal(result.houseId, 'house-new');
    assert.equal(result.countryCode, 'PT');

    mock.assertComplete();
    __setHouseCreationSupabaseAdmin();
  });

  await runTest('syncUserHouseMembership auto-creates house and assigns membership', async () => {
    const mock = new SupabaseMock([
      {
        table: 'users',
        action: 'maybeSingle',
        result: {
          data: {
            primary_country_code: 'pt',
            primary_sport_id: 'sport-9',
            country: null,
            sport_id: null,
          },
        },
      },
      {
        action: 'rpc',
        fn: 'sync_user_house_membership_db',
        result: { data: null, error: null },
      },
      {
        table: 'user_houses',
        action: 'select',
        result: { data: [], error: null },
      },
      {
        table: 'user_houses',
        action: 'delete',
        result: { error: null },
      },
      {
        table: 'user_houses',
        action: 'upsert',
        expectPayload: (payload) => {
          assert.equal(payload[0].house_id, 'house-42');
          assert.equal(payload[0].user_id, 'user-1');
        },
        result: { error: null },
      },
    ]);

    __setUserHousesSupabaseAdmin(mock as any);
    __setEnsureHouseForTests(async () => ({
      houseId: 'house-42',
      houseKey: 'HOUSE_42',
      status: 'under_construction',
      countryCode: 'PT',
      created: true,
    }));

    const backgroundCalls: Array<{ houseId: string; sportId?: string | null; countryCode?: string | null }> = [];
    __setSyncHouseMembersForTests(async (houseId, sportId, countryCode) => {
      backgroundCalls.push({ houseId, sportId: sportId ?? null, countryCode: countryCode ?? null });
      return { success: true, attempted: 0, assigned: 0 };
    });

    const result = await syncUserHouseMembership('user-1', {
      assignedVia: 'PROFILE',
      logPrefix: 'test',
    });

    assert.equal(result.success, true);
    assert.equal(result.houseId, 'house-42');
    assert.equal(backgroundCalls.length, 1);
    assert.equal(backgroundCalls[0].houseId, 'house-42');
    assert.equal(backgroundCalls[0].sportId, 'sport-9');
    assert.equal(backgroundCalls[0].countryCode, 'PT');

    mock.assertComplete();
    __setUserHousesSupabaseAdmin();
    __setEnsureHouseForTests();
    __setSyncHouseMembersForTests();
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
