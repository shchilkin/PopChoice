import { createTestModel } from '@xstate/graph';
import { describe, expect, it } from 'vitest';
import { createActor } from 'xstate';

import { quizMachine } from './quiz.machine';

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function makeActor() {
  return createActor(quizMachine).start();
}

// ------------------------------------------------------------------
// Model-based tests via @xstate/test
//
// Steps are now named sub-states of `questions`, so the graph
// algorithm traverses them automatically — no custom serializeState
// needed.
// ------------------------------------------------------------------

const model = createTestModel(quizMachine);

const EVENTS = [
  { type: 'START_FAST_PICK' as const, youLabel: 'You' },
  { type: 'START_NORMAL_MATCH' as const, youLabel: 'You' },
  { type: 'START_FAST_SOLO' as const, youLabel: 'You' },
  { type: 'START_FAST_DUO' as const },
  { type: 'START_FAST_GROUP' as const },
  { type: 'START_SOLO' as const, youLabel: 'You' },
  { type: 'START_DUO' as const },
  { type: 'START_GROUP' as const },
  { type: 'START_GROUP_QUESTIONS' as const, names: ['Alice', 'Bob', 'Charlie'] },
  { type: 'NEXT' as const },
  { type: 'BACK' as const },
  { type: 'CONTINUE' as const },
  { type: 'SUBMIT_SUCCESS' as const, id: 'rec_123' },
  { type: 'SUBMIT_FAILURE' as const, message: 'failed' },
  { type: 'RETRY_SUBMIT' as const },
];

const paths = model.getShortestPaths({ events: EVENTS });

describe('quiz machine – forward paths (model-based)', () => {
  paths.forEach((path) => {
    it(path.description, async () => {
      const actor = makeActor();

      await path.test({
        states: {
          intro: () => {
            expect(actor.getSnapshot().value).toBe('intro');
          },

          groupSetup: () => {
            const { value, context } = actor.getSnapshot();
            expect(value).toBe('groupSetup');
            expect(context.mode).toBe('group');
          },

          fastAudience: () => {
            expect(actor.getSnapshot().value).toBe('fastAudience');
          },

          normalAudience: () => {
            expect(actor.getSnapshot().value).toBe('normalAudience');
          },

          fastQuestions: () => {
            expect(actor.getSnapshot().matches('fastQuestions')).toBe(true);
            expect(actor.getSnapshot().context.flow).toBe('fast');
            expect(actor.getSnapshot().context.people.length).toBeGreaterThan(0);
          },

          '#quiz.fastQuestions.intent': () => {
            expect(actor.getSnapshot().matches({ fastQuestions: 'intent' })).toBe(true);
          },

          '#quiz.fastQuestions.avoids': () => {
            expect(actor.getSnapshot().matches({ fastQuestions: 'avoids' })).toBe(true);
          },

          '#quiz.fastQuestions.discovery': () => {
            expect(actor.getSnapshot().matches({ fastQuestions: 'discovery' })).toBe(true);
          },

          // Matches any sub-state of questions — asserts structural invariants.
          // Individual step sub-states use #-prefixed IDs below.
          questions: () => {
            expect(actor.getSnapshot().matches('questions')).toBe(true);
            expect(actor.getSnapshot().context.people.length).toBeGreaterThan(0);
          },

          '#quiz.questions.favoriteMovie': () => {
            expect(actor.getSnapshot().matches({ questions: 'favoriteMovie' })).toBe(true);
          },

          '#quiz.questions.era': () => {
            expect(actor.getSnapshot().matches({ questions: 'era' })).toBe(true);
          },

          '#quiz.questions.mood': () => {
            expect(actor.getSnapshot().matches({ questions: 'mood' })).toBe(true);
          },

          '#quiz.questions.tone': () => {
            expect(actor.getSnapshot().matches({ questions: 'tone' })).toBe(true);
          },

          '#quiz.questions.discovery': () => {
            expect(actor.getSnapshot().matches({ questions: 'discovery' })).toBe(true);
          },

          '#quiz.questions.avoids': () => {
            expect(actor.getSnapshot().matches({ questions: 'avoids' })).toBe(true);
          },

          '#quiz.questions.favoriteActor': () => {
            expect(actor.getSnapshot().matches({ questions: 'favoriteActor' })).toBe(true);
          },

          betweenPersons: () => {
            const { value, context } = actor.getSnapshot();
            expect(value).toBe('betweenPersons');
            // The next person must exist so BetweenPersons can render their name
            expect(context.people[context.currentPersonIdx + 1]).toBeDefined();
          },

          submitting: () => {
            expect(actor.getSnapshot().value).toBe('submitting');
          },

          navigatingToResults: () => {
            const { value, context } = actor.getSnapshot();
            expect(value).toBe('navigatingToResults');
            expect(context.recommendationId).toBe('rec_123');
          },

          submitFailed: () => {
            const { value, context } = actor.getSnapshot();
            expect(value).toBe('submitFailed');
            expect(context.recommendationId).toBeNull();
            expect(context.submitError).toBe('failed');
          },
        },

        events: {
          START_FAST_PICK: () => actor.send({ type: 'START_FAST_PICK', youLabel: 'You' }),
          START_NORMAL_MATCH: () => actor.send({ type: 'START_NORMAL_MATCH', youLabel: 'You' }),
          START_FAST_SOLO: () => actor.send({ type: 'START_FAST_SOLO', youLabel: 'You' }),
          START_FAST_DUO: () => actor.send({ type: 'START_FAST_DUO' }),
          START_FAST_GROUP: () => actor.send({ type: 'START_FAST_GROUP' }),
          START_SOLO: () => actor.send({ type: 'START_SOLO', youLabel: 'You' }),
          START_DUO: () => actor.send({ type: 'START_DUO' }),
          START_GROUP: () => actor.send({ type: 'START_GROUP' }),
          START_GROUP_QUESTIONS: () =>
            actor.send({ type: 'START_GROUP_QUESTIONS', names: ['Alice', 'Bob', 'Charlie'] }),
          NEXT: () => actor.send({ type: 'NEXT' }),
          BACK: () => actor.send({ type: 'BACK' }),
          CONTINUE: () => actor.send({ type: 'CONTINUE' }),
          SUBMIT_SUCCESS: () => actor.send({ type: 'SUBMIT_SUCCESS', id: 'rec_123' }),
          SUBMIT_FAILURE: () => actor.send({ type: 'SUBMIT_FAILURE', message: 'failed' }),
          RETRY_SUBMIT: () => actor.send({ type: 'RETRY_SUBMIT' }),
        },
      });
    });
  });
});

// ------------------------------------------------------------------
// BACK-navigation scenarios
//
// getShortestPaths skips BACK paths (forward paths are shorter).
// These explicit sequences cover the four BACK branches.
// ------------------------------------------------------------------

describe('quiz machine – BACK navigation', () => {
  it('BACK from any step > favoriteMovie goes to previous step', () => {
    const actor = makeActor();
    actor.send({ type: 'START_NORMAL_MATCH', youLabel: 'You' });
    actor.send({ type: 'START_SOLO', youLabel: 'You' });
    actor.send({ type: 'NEXT' }); // favoriteMovie → era

    actor.send({ type: 'BACK' }); // era → favoriteMovie

    expect(actor.getSnapshot().matches({ questions: 'favoriteMovie' })).toBe(true);
    expect(actor.getSnapshot().context.dir).toBe(-1);
  });

  it('BACK from favoriteActor returns to the Normal avoids step', () => {
    const actor = makeActor();
    actor.send({ type: 'START_NORMAL_MATCH', youLabel: 'You' });
    actor.send({ type: 'START_SOLO', youLabel: 'You' });

    for (let i = 0; i < 6; i++) actor.send({ type: 'NEXT' });
    actor.send({ type: 'BACK' });

    expect(actor.getSnapshot().matches({ questions: 'avoids' })).toBe(true);
    expect(actor.getSnapshot().context.dir).toBe(-1);
  });

  it('BACK from favoriteMovie (solo) returns to Normal audience choice', () => {
    const actor = makeActor();
    actor.send({ type: 'START_NORMAL_MATCH', youLabel: 'You' });
    actor.send({ type: 'START_SOLO', youLabel: 'You' });

    actor.send({ type: 'BACK' });

    expect(actor.getSnapshot().value).toBe('normalAudience');
  });

  it('BACK from the first Fast Pick step returns to Fast audience choice', () => {
    const actor = makeActor();
    actor.send({ type: 'START_FAST_PICK', youLabel: 'You' });
    actor.send({ type: 'START_FAST_SOLO', youLabel: 'You' });

    actor.send({ type: 'BACK' });

    expect(actor.getSnapshot().value).toBe('fastAudience');
  });

  it('Fast Pick solo starts the short question flow', () => {
    const actor = makeActor();
    actor.send({ type: 'START_FAST_PICK', youLabel: 'You' });
    actor.send({ type: 'START_FAST_SOLO', youLabel: 'You' });

    const snapshot = actor.getSnapshot();
    expect(snapshot.matches({ fastQuestions: 'intent' })).toBe(true);
    expect(snapshot.context.mode).toBe('solo');
    expect(snapshot.context.flow).toBe('fast');
  });

  it('Fast Pick group uses group setup before the short question flow', () => {
    const actor = makeActor();
    actor.send({ type: 'START_FAST_PICK', youLabel: 'You' });
    actor.send({ type: 'START_FAST_GROUP' });

    expect(actor.getSnapshot().value).toBe('groupSetup');
    expect(actor.getSnapshot().context.flow).toBe('fast');

    actor.send({ type: 'START_GROUP_QUESTIONS', names: ['Alice', 'Bob', 'Charlie'] });

    const snapshot = actor.getSnapshot();
    expect(snapshot.matches({ fastQuestions: 'intent' })).toBe(true);
    expect(snapshot.context.mode).toBe('group');
  });

  it('Duo starts normal group setup with duo audience', () => {
    const actor = makeActor();
    actor.send({ type: 'START_NORMAL_MATCH', youLabel: 'You' });
    actor.send({ type: 'START_DUO' });

    let snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe('groupSetup');
    expect(snapshot.context.mode).toBe('group');
    expect(snapshot.context.flow).toBe('normal');
    expect(snapshot.context.audience).toBe('duo');

    actor.send({ type: 'START_GROUP_QUESTIONS', names: ['Alice', 'Bob'] });

    snapshot = actor.getSnapshot();
    expect(snapshot.matches({ questions: 'favoriteMovie' })).toBe(true);
    expect(snapshot.context.people).toHaveLength(2);
  });

  it('Fast Pick duo uses group setup before the short question flow', () => {
    const actor = makeActor();
    actor.send({ type: 'START_FAST_PICK', youLabel: 'You' });
    actor.send({ type: 'START_FAST_DUO' });

    let snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe('groupSetup');
    expect(snapshot.context.mode).toBe('group');
    expect(snapshot.context.flow).toBe('fast');
    expect(snapshot.context.audience).toBe('duo');

    actor.send({ type: 'START_GROUP_QUESTIONS', names: ['Alice', 'Bob'] });

    snapshot = actor.getSnapshot();
    expect(snapshot.matches({ fastQuestions: 'intent' })).toBe(true);
    expect(snapshot.context.people).toHaveLength(2);
  });

  it('BACK from a later Fast Pick step returns to the previous fast step', () => {
    const actor = makeActor();
    actor.send({ type: 'START_FAST_PICK', youLabel: 'You' });
    actor.send({ type: 'START_FAST_SOLO', youLabel: 'You' });
    actor.send({ type: 'NEXT' }); // intent -> avoids
    actor.send({ type: 'NEXT' }); // avoids -> discovery

    actor.send({ type: 'BACK' });

    expect(actor.getSnapshot().matches({ fastQuestions: 'avoids' })).toBe(true);
    expect(actor.getSnapshot().context.dir).toBe(-1);
  });

  it('BACK from favoriteMovie (group, first person) returns to groupSetup', () => {
    const actor = makeActor();
    actor.send({ type: 'START_NORMAL_MATCH', youLabel: 'You' });
    actor.send({ type: 'START_GROUP' });
    actor.send({ type: 'START_GROUP_QUESTIONS', names: ['Alice', 'Bob', 'Charlie'] });

    actor.send({ type: 'BACK' });

    expect(actor.getSnapshot().value).toBe('groupSetup');
  });

  it('BACK from Fast Pick group first step returns to groupSetup', () => {
    const actor = makeActor();
    actor.send({ type: 'START_FAST_PICK', youLabel: 'You' });
    actor.send({ type: 'START_FAST_GROUP' });
    actor.send({ type: 'START_GROUP_QUESTIONS', names: ['Alice', 'Bob', 'Charlie'] });

    actor.send({ type: 'BACK' });

    expect(actor.getSnapshot().value).toBe('groupSetup');
  });

  it('BACK from Fast Pick group first step on the second person returns to betweenPersons', () => {
    const actor = makeActor();
    actor.send({ type: 'START_FAST_PICK', youLabel: 'You' });
    actor.send({ type: 'START_FAST_GROUP' });
    actor.send({ type: 'START_GROUP_QUESTIONS', names: ['Alice', 'Bob', 'Charlie'] });

    for (let i = 0; i < 3; i++) actor.send({ type: 'NEXT' }); // complete person 0
    actor.send({ type: 'CONTINUE' }); // -> person 1, fast intent
    actor.send({ type: 'BACK' });

    const { value, context } = actor.getSnapshot();
    expect(value).toBe('betweenPersons');
    expect(context.currentPersonIdx).toBe(0);
  });

  it('BACK from favoriteMovie (group, second person) returns to betweenPersons', () => {
    const actor = makeActor();
    actor.send({ type: 'START_NORMAL_MATCH', youLabel: 'You' });
    actor.send({ type: 'START_GROUP' });
    actor.send({ type: 'START_GROUP_QUESTIONS', names: ['Alice', 'Bob', 'Charlie'] });

    for (let i = 0; i < 7; i++) actor.send({ type: 'NEXT' }); // complete person 0
    actor.send({ type: 'CONTINUE' }); // → person 1, favoriteMovie

    actor.send({ type: 'BACK' }); // → betweenPersons

    const { value, context } = actor.getSnapshot();
    expect(value).toBe('betweenPersons');
    expect(context.currentPersonIdx).toBe(0); // person 0 is the "done" person
  });

  it('BACK from betweenPersons returns to favoriteActor of current person', () => {
    const actor = makeActor();
    actor.send({ type: 'START_NORMAL_MATCH', youLabel: 'You' });
    actor.send({ type: 'START_GROUP' });
    actor.send({ type: 'START_GROUP_QUESTIONS', names: ['Alice', 'Bob', 'Charlie'] });

    for (let i = 0; i < 7; i++) actor.send({ type: 'NEXT' }); // → betweenPersons

    actor.send({ type: 'BACK' }); // → questions.favoriteActor, person 0

    const snapshot = actor.getSnapshot();
    expect(snapshot.matches({ questions: 'favoriteActor' })).toBe(true);
    expect(snapshot.context.currentPersonIdx).toBe(0);
    expect(snapshot.context.dir).toBe(-1);
  });

  it('BACK from Fast Pick betweenPersons returns to discovery of current person', () => {
    const actor = makeActor();
    actor.send({ type: 'START_FAST_PICK', youLabel: 'You' });
    actor.send({ type: 'START_FAST_GROUP' });
    actor.send({ type: 'START_GROUP_QUESTIONS', names: ['Alice', 'Bob', 'Charlie'] });

    for (let i = 0; i < 3; i++) actor.send({ type: 'NEXT' }); // -> betweenPersons
    actor.send({ type: 'BACK' });

    const snapshot = actor.getSnapshot();
    expect(snapshot.matches({ fastQuestions: 'discovery' })).toBe(true);
    expect(snapshot.context.currentPersonIdx).toBe(0);
  });

  it('RESET from submitting returns to a fresh intro state', () => {
    const actor = makeActor();
    actor.send({ type: 'START_NORMAL_MATCH', youLabel: 'You' });
    actor.send({ type: 'START_SOLO', youLabel: 'You' });

    for (let i = 0; i < 7; i++) actor.send({ type: 'NEXT' });
    expect(actor.getSnapshot().value).toBe('submitting');

    actor.send({ type: 'RESET' });

    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe('intro');
    expect(snapshot.context.people).toEqual([]);
    expect(snapshot.context.currentPersonIdx).toBe(0);
    expect(snapshot.context.recommendationId).toBeNull();
    expect(snapshot.context.submitError).toBeNull();
  });

  it('Fast Pick submits after three steps', () => {
    const actor = makeActor();
    actor.send({ type: 'START_FAST_PICK', youLabel: 'You' });
    actor.send({ type: 'START_FAST_SOLO', youLabel: 'You' });

    for (let i = 0; i < 3; i++) actor.send({ type: 'NEXT' });

    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe('submitting');
    expect(snapshot.context.flow).toBe('fast');
  });

  it('successful submission waits in navigatingToResults instead of resetting to intro', () => {
    const actor = makeActor();
    actor.send({ type: 'START_NORMAL_MATCH', youLabel: 'You' });
    actor.send({ type: 'START_SOLO', youLabel: 'You' });

    for (let i = 0; i < 7; i++) actor.send({ type: 'NEXT' });
    actor.send({ type: 'SUBMIT_SUCCESS', id: 'rec_123' });

    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe('navigatingToResults');
    expect(snapshot.context.recommendationId).toBe('rec_123');
    expect(snapshot.context.people).toHaveLength(1);
  });

  it('navigatingToResults is final for the current quiz session', () => {
    const actor = makeActor();
    actor.send({ type: 'START_NORMAL_MATCH', youLabel: 'You' });
    actor.send({ type: 'START_SOLO', youLabel: 'You' });

    for (let i = 0; i < 7; i++) actor.send({ type: 'NEXT' });
    actor.send({ type: 'SUBMIT_SUCCESS', id: 'rec_123' });
    actor.send({ type: 'BACK' });
    actor.send({ type: 'RESET' });

    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe('navigatingToResults');
    expect(snapshot.context.people).toHaveLength(1);
    expect(snapshot.context.recommendationId).toBe('rec_123');
  });

  it('failed submission preserves answers and can retry', () => {
    const actor = makeActor();
    actor.send({ type: 'START_NORMAL_MATCH', youLabel: 'You' });
    actor.send({ type: 'START_SOLO', youLabel: 'You' });

    actor.send({ type: 'UPDATE_PERSON', updates: { favoriteMovie: 'Heat' } });
    for (let i = 0; i < 7; i++) actor.send({ type: 'NEXT' });
    actor.send({ type: 'SUBMIT_FAILURE', message: 'network' });

    let snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe('submitFailed');
    expect(snapshot.context.people[0]?.favoriteMovie).toBe('Heat');
    expect(snapshot.context.submitError).toBe('network');

    actor.send({ type: 'RETRY_SUBMIT' });

    snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe('submitting');
    expect(snapshot.context.people[0]?.favoriteMovie).toBe('Heat');
    expect(snapshot.context.submitError).toBeNull();
  });

  it('failed submission can return to the final quiz step', () => {
    const actor = makeActor();
    actor.send({ type: 'START_NORMAL_MATCH', youLabel: 'You' });
    actor.send({ type: 'START_SOLO', youLabel: 'You' });

    for (let i = 0; i < 7; i++) actor.send({ type: 'NEXT' });
    actor.send({ type: 'SUBMIT_FAILURE' });
    actor.send({ type: 'BACK' });

    const snapshot = actor.getSnapshot();
    expect(snapshot.matches({ questions: 'favoriteActor' })).toBe(true);
  });

  it('failed Fast Pick submission can return to the final fast step', () => {
    const actor = makeActor();
    actor.send({ type: 'START_FAST_PICK', youLabel: 'You' });
    actor.send({ type: 'START_FAST_SOLO', youLabel: 'You' });

    for (let i = 0; i < 3; i++) actor.send({ type: 'NEXT' });
    actor.send({ type: 'SUBMIT_FAILURE' });
    actor.send({ type: 'BACK' });

    const snapshot = actor.getSnapshot();
    expect(snapshot.matches({ fastQuestions: 'discovery' })).toBe(true);
  });
});
