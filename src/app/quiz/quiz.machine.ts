import { and, assign, setup } from 'xstate';

import { emptyPerson } from './constants';

import type { PersonAnswers } from './types';

type QuizContext = {
  mode: 'solo' | 'group';
  people: PersonAnswers[];
  currentPersonIdx: number;
  dir: 1 | -1;
};

type QuizEvent =
  | { type: 'START_SOLO'; youLabel: string }
  | { type: 'START_GROUP' }
  | { type: 'START_GROUP_QUESTIONS'; names: string[] }
  | { type: 'NEXT' }
  | { type: 'BACK' }
  | { type: 'UPDATE_PERSON'; updates: Partial<PersonAnswers> }
  | { type: 'CONTINUE' };

export const quizMachine = setup({
  types: {
    context: {} as QuizContext,
    events: {} as QuizEvent,
  },
  guards: {
    isNotLastPerson: ({ context }) => context.currentPersonIdx < context.people.length - 1,
    isGroupMode: ({ context }) => context.mode === 'group',
    isFirstPerson: ({ context }) => context.currentPersonIdx === 0,
    isNotFirstPerson: ({ context }) => context.currentPersonIdx > 0,
  },
  actions: {
    setupSolo: assign(({ event }) => {
      if (event.type !== 'START_SOLO') return {};
      return {
        mode: 'solo' as const,
        people: [emptyPerson(event.youLabel)],
        currentPersonIdx: 0,
        dir: 1 as const,
      };
    }),
    setupGroup: assign({ mode: 'group' as const }),
    setupGroupQuestions: assign(({ event }) => {
      if (event.type !== 'START_GROUP_QUESTIONS') return {};
      const valid = event.names.filter((n) => n.trim().length > 0);
      const names = valid.length >= 2 ? valid : ['Person 1', 'Person 2'];
      return {
        people: names.map(emptyPerson),
        currentPersonIdx: 0,
        dir: 1 as const,
      };
    }),
    setDirForward: assign({ dir: 1 as const }),
    setDirBackward: assign({ dir: -1 as const }),
    nextPerson: assign({
      currentPersonIdx: ({ context }) => context.currentPersonIdx + 1,
      dir: 1 as const,
    }),
    prevPerson: assign({
      currentPersonIdx: ({ context }) => context.currentPersonIdx - 1,
      dir: -1 as const,
    }),
    updatePerson: assign({
      people: ({ context, event }) => {
        if (event.type !== 'UPDATE_PERSON') return context.people;
        return context.people.map((p, i) =>
          i === context.currentPersonIdx ? { ...p, ...event.updates } : p,
        );
      },
    }),
  },
}).createMachine({
  id: 'quiz',
  initial: 'intro',
  context: {
    mode: 'solo',
    people: [],
    currentPersonIdx: 0,
    dir: 1,
  },
  states: {
    intro: {
      on: {
        START_SOLO: { target: 'questions', actions: 'setupSolo' },
        START_GROUP: { target: 'groupSetup', actions: 'setupGroup' },
      },
    },
    groupSetup: {
      on: {
        START_GROUP_QUESTIONS: { target: 'questions', actions: 'setupGroupQuestions' },
        BACK: { target: 'intro' },
      },
    },
    questions: {
      initial: 'favoriteMovie',
      states: {
        favoriteMovie: {
          on: {
            NEXT: { target: 'era', actions: 'setDirForward' },
            BACK: [
              {
                guard: and(['isGroupMode', 'isNotFirstPerson']),
                target: '#quiz.betweenPersons',
                actions: 'prevPerson',
              },
              {
                guard: and(['isGroupMode', 'isFirstPerson']),
                target: '#quiz.groupSetup',
                actions: 'setDirBackward',
              },
              { target: '#quiz.intro', actions: 'setDirBackward' },
            ],
          },
        },
        era: {
          on: {
            NEXT: { target: 'mood', actions: 'setDirForward' },
            BACK: { target: 'favoriteMovie', actions: 'setDirBackward' },
          },
        },
        mood: {
          on: {
            NEXT: { target: 'dislikedMood', actions: 'setDirForward' },
            BACK: { target: 'era', actions: 'setDirBackward' },
          },
        },
        dislikedMood: {
          on: {
            NEXT: { target: 'tone', actions: 'setDirForward' },
            BACK: { target: 'mood', actions: 'setDirBackward' },
          },
        },
        tone: {
          on: {
            NEXT: { target: 'favoriteActor', actions: 'setDirForward' },
            BACK: { target: 'dislikedMood', actions: 'setDirBackward' },
          },
        },
        favoriteActor: {
          on: {
            NEXT: [
              {
                guard: 'isNotLastPerson',
                target: '#quiz.betweenPersons',
                actions: 'setDirForward',
              },
              { target: '#quiz.submitting' },
            ],
            BACK: { target: 'tone', actions: 'setDirBackward' },
          },
        },
      },
      on: {
        UPDATE_PERSON: { actions: 'updatePerson' },
      },
    },
    betweenPersons: {
      on: {
        CONTINUE: { target: 'questions', actions: 'nextPerson' },
        BACK: { target: '#quiz.questions.favoriteActor', actions: 'setDirBackward' },
      },
    },
    submitting: {
      type: 'final',
    },
  },
});
