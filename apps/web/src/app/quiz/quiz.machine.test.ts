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
  { type: 'START_SOLO' as const, youLabel: 'You' },
  { type: 'START_GROUP' as const },
  { type: 'START_GROUP_QUESTIONS' as const, names: ['Alice', 'Bob'] },
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
          START_SOLO: () => actor.send({ type: 'START_SOLO', youLabel: 'You' }),
          START_GROUP: () => actor.send({ type: 'START_GROUP' }),
          START_GROUP_QUESTIONS: () =>
            actor.send({ type: 'START_GROUP_QUESTIONS', names: ['Alice', 'Bob'] }),
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
    actor.send({ type: 'START_SOLO', youLabel: 'You' });
    actor.send({ type: 'NEXT' }); // favoriteMovie → era

    actor.send({ type: 'BACK' }); // era → favoriteMovie

    expect(actor.getSnapshot().matches({ questions: 'favoriteMovie' })).toBe(true);
    expect(actor.getSnapshot().context.dir).toBe(-1);
  });

  it('BACK from favoriteMovie (solo) returns to intro', () => {
    const actor = makeActor();
    actor.send({ type: 'START_SOLO', youLabel: 'You' });

    actor.send({ type: 'BACK' });

    expect(actor.getSnapshot().value).toBe('intro');
  });

  it('BACK from favoriteMovie (group, first person) returns to groupSetup', () => {
    const actor = makeActor();
    actor.send({ type: 'START_GROUP' });
    actor.send({ type: 'START_GROUP_QUESTIONS', names: ['Alice', 'Bob'] });

    actor.send({ type: 'BACK' });

    expect(actor.getSnapshot().value).toBe('groupSetup');
  });

  it('BACK from favoriteMovie (group, second person) returns to betweenPersons', () => {
    const actor = makeActor();
    actor.send({ type: 'START_GROUP' });
    actor.send({ type: 'START_GROUP_QUESTIONS', names: ['Alice', 'Bob'] });

    for (let i = 0; i < 5; i++) actor.send({ type: 'NEXT' }); // complete person 0
    actor.send({ type: 'CONTINUE' }); // → person 1, favoriteMovie

    actor.send({ type: 'BACK' }); // → betweenPersons

    const { value, context } = actor.getSnapshot();
    expect(value).toBe('betweenPersons');
    expect(context.currentPersonIdx).toBe(0); // person 0 is the "done" person
  });

  it('BACK from betweenPersons returns to favoriteActor of current person', () => {
    const actor = makeActor();
    actor.send({ type: 'START_GROUP' });
    actor.send({ type: 'START_GROUP_QUESTIONS', names: ['Alice', 'Bob'] });

    for (let i = 0; i < 5; i++) actor.send({ type: 'NEXT' }); // → betweenPersons

    actor.send({ type: 'BACK' }); // → questions.favoriteActor, person 0

    const snapshot = actor.getSnapshot();
    expect(snapshot.matches({ questions: 'favoriteActor' })).toBe(true);
    expect(snapshot.context.currentPersonIdx).toBe(0);
    expect(snapshot.context.dir).toBe(-1);
  });

  it('RESET from submitting returns to a fresh intro state', () => {
    const actor = makeActor();
    actor.send({ type: 'START_SOLO', youLabel: 'You' });

    for (let i = 0; i < 5; i++) actor.send({ type: 'NEXT' });
    expect(actor.getSnapshot().value).toBe('submitting');

    actor.send({ type: 'RESET' });

    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe('intro');
    expect(snapshot.context.people).toEqual([]);
    expect(snapshot.context.currentPersonIdx).toBe(0);
    expect(snapshot.context.recommendationId).toBeNull();
    expect(snapshot.context.submitError).toBeNull();
  });

  it('successful submission waits in navigatingToResults instead of resetting to intro', () => {
    const actor = makeActor();
    actor.send({ type: 'START_SOLO', youLabel: 'You' });

    for (let i = 0; i < 5; i++) actor.send({ type: 'NEXT' });
    actor.send({ type: 'SUBMIT_SUCCESS', id: 'rec_123' });

    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe('navigatingToResults');
    expect(snapshot.context.recommendationId).toBe('rec_123');
    expect(snapshot.context.people).toHaveLength(1);
  });

  it('RESET from navigatingToResults starts a fresh quiz', () => {
    const actor = makeActor();
    actor.send({ type: 'START_SOLO', youLabel: 'You' });

    for (let i = 0; i < 5; i++) actor.send({ type: 'NEXT' });
    actor.send({ type: 'SUBMIT_SUCCESS', id: 'rec_123' });
    actor.send({ type: 'RESET' });

    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe('intro');
    expect(snapshot.context.people).toEqual([]);
    expect(snapshot.context.recommendationId).toBeNull();
  });

  it('failed submission preserves answers and can retry', () => {
    const actor = makeActor();
    actor.send({ type: 'START_SOLO', youLabel: 'You' });

    actor.send({ type: 'UPDATE_PERSON', updates: { favoriteMovie: 'Heat' } });
    for (let i = 0; i < 5; i++) actor.send({ type: 'NEXT' });
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
    actor.send({ type: 'START_SOLO', youLabel: 'You' });

    for (let i = 0; i < 5; i++) actor.send({ type: 'NEXT' });
    actor.send({ type: 'SUBMIT_FAILURE' });
    actor.send({ type: 'BACK' });

    const snapshot = actor.getSnapshot();
    expect(snapshot.matches({ questions: 'favoriteActor' })).toBe(true);
  });
});
