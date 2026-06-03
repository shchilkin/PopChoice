import { and, assign, setup } from 'xstate';

import { emptyPerson } from './constants';

import type { PersonAnswers } from './types';

type QuizContext = {
  audience: 'solo' | 'duo' | 'group';
  mode: 'solo' | 'group';
  flow: 'normal' | 'fast';
  people: PersonAnswers[];
  currentPersonIdx: number;
  dir: 1 | -1;
  recommendationId: string | null;
  submitError: string | null;
};

type QuizEvent =
  | { type: 'START_FAST_PICK'; youLabel: string }
  | { type: 'START_NORMAL_MATCH'; youLabel: string }
  | { type: 'START_FAST_SOLO'; youLabel: string }
  | { type: 'START_FAST_DUO' }
  | { type: 'START_FAST_GROUP' }
  | { type: 'START_SOLO'; youLabel: string }
  | { type: 'START_DUO' }
  | { type: 'START_GROUP' }
  | { type: 'START_GROUP_QUESTIONS'; names: string[] }
  | { type: 'NEXT' }
  | { type: 'BACK' }
  | { type: 'UPDATE_PERSON'; updates: Partial<PersonAnswers> }
  | { type: 'CONTINUE' }
  | { type: 'SUBMIT_SUCCESS'; id: string }
  | { type: 'SUBMIT_FAILURE'; message?: string }
  | { type: 'RETRY_SUBMIT' }
  | { type: 'RESET' };

export const quizMachine = setup({
  types: {
    context: {} as QuizContext,
    events: {} as QuizEvent,
  },
  guards: {
    isNotLastPerson: ({ context }) => context.currentPersonIdx < context.people.length - 1,
    isGroupMode: ({ context }) => context.mode === 'group',
    isFastFlow: ({ context }) => context.flow === 'fast',
    isFirstPerson: ({ context }) => context.currentPersonIdx === 0,
    isNotFirstPerson: ({ context }) => context.currentPersonIdx > 0,
  },
  actions: {
    setupFastSolo: assign(({ event }) => {
      if (event.type !== 'START_FAST_SOLO') return {};
      return {
        mode: 'solo' as const,
        audience: 'solo' as const,
        flow: 'fast' as const,
        people: [emptyPerson(event.youLabel)],
        currentPersonIdx: 0,
        dir: 1 as const,
        recommendationId: null,
        submitError: null,
      };
    }),
    setupFastGroup: assign({
      mode: 'group' as const,
      flow: 'fast' as const,
      audience: 'group' as const,
      recommendationId: null,
      submitError: null,
    }),
    setupFastDuo: assign({
      mode: 'group' as const,
      flow: 'fast' as const,
      audience: 'duo' as const,
      recommendationId: null,
      submitError: null,
    }),
    setupSolo: assign(({ event }) => {
      if (event.type !== 'START_SOLO') return {};
      return {
        mode: 'solo' as const,
        audience: 'solo' as const,
        flow: 'normal' as const,
        people: [emptyPerson(event.youLabel)],
        currentPersonIdx: 0,
        dir: 1 as const,
        recommendationId: null,
        submitError: null,
      };
    }),
    setupDuo: assign({
      mode: 'group' as const,
      flow: 'normal' as const,
      audience: 'duo' as const,
      recommendationId: null,
      submitError: null,
    }),
    setupGroup: assign({
      mode: 'group' as const,
      flow: 'normal' as const,
      audience: 'group' as const,
      recommendationId: null,
      submitError: null,
    }),
    setupGroupQuestions: assign(({ context, event }) => {
      if (event.type !== 'START_GROUP_QUESTIONS') return {};
      const valid = event.names.filter((n) => n.trim().length > 0);
      const isDuo = context.audience === 'duo';
      const minPeople = isDuo ? 2 : 3;
      const fallbackNames = Array.from({ length: minPeople }, (_, i) => `Person ${i + 1}`);
      const names = valid.length >= minPeople ? valid.slice(0, isDuo ? 2 : 6) : fallbackNames;
      return {
        people: names.map(emptyPerson),
        currentPersonIdx: 0,
        dir: 1 as const,
        recommendationId: null,
        submitError: null,
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
    resetQuiz: assign({
      mode: 'solo' as const,
      audience: 'solo' as const,
      flow: 'normal' as const,
      people: [],
      currentPersonIdx: 0,
      dir: 1 as const,
      recommendationId: null,
      submitError: null,
    }),
    clearSubmitState: assign({
      recommendationId: null,
      submitError: null,
    }),
    setRecommendationId: assign(({ event }) => {
      if (event.type !== 'SUBMIT_SUCCESS') return {};
      return {
        recommendationId: event.id,
        submitError: null,
      };
    }),
    setSubmitError: assign(({ event }) => {
      if (event.type !== 'SUBMIT_FAILURE') return {};
      return {
        recommendationId: null,
        submitError: event.message ?? null,
      };
    }),
  },
}).createMachine({
  id: 'quiz',
  initial: 'intro',
  context: {
    mode: 'solo',
    audience: 'solo',
    flow: 'normal',
    people: [],
    currentPersonIdx: 0,
    dir: 1,
    recommendationId: null,
    submitError: null,
  },
  states: {
    intro: {
      on: {
        START_FAST_PICK: { target: 'fastAudience' },
        START_NORMAL_MATCH: { target: 'normalAudience' },
      },
    },
    normalAudience: {
      on: {
        START_SOLO: { target: 'questions', actions: 'setupSolo' },
        START_DUO: { target: 'groupSetup', actions: 'setupDuo' },
        START_GROUP: { target: 'groupSetup', actions: 'setupGroup' },
        BACK: { target: 'intro', actions: 'setDirBackward' },
      },
    },
    fastAudience: {
      on: {
        START_FAST_SOLO: { target: 'fastQuestions', actions: 'setupFastSolo' },
        START_FAST_DUO: { target: 'groupSetup', actions: 'setupFastDuo' },
        START_FAST_GROUP: { target: 'groupSetup', actions: 'setupFastGroup' },
        BACK: { target: 'intro', actions: 'setDirBackward' },
      },
    },
    fastQuestions: {
      initial: 'intent',
      states: {
        intent: {
          on: {
            NEXT: { target: 'avoids', actions: 'setDirForward' },
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
              { target: '#quiz.fastAudience', actions: 'setDirBackward' },
            ],
          },
        },
        avoids: {
          on: {
            NEXT: { target: 'discovery', actions: 'setDirForward' },
            BACK: { target: 'intent', actions: 'setDirBackward' },
          },
        },
        discovery: {
          on: {
            NEXT: [
              {
                guard: 'isNotLastPerson',
                target: '#quiz.betweenPersons',
                actions: 'setDirForward',
              },
              { target: '#quiz.submitting', actions: 'clearSubmitState' },
            ],
            BACK: { target: 'avoids', actions: 'setDirBackward' },
          },
        },
      },
      on: {
        UPDATE_PERSON: { actions: 'updatePerson' },
      },
    },
    groupSetup: {
      on: {
        START_GROUP_QUESTIONS: [
          {
            guard: 'isFastFlow',
            target: 'fastQuestions',
            actions: 'setupGroupQuestions',
          },
          { target: 'questions', actions: 'setupGroupQuestions' },
        ],
        BACK: [
          { guard: 'isFastFlow', target: 'fastAudience', actions: 'setDirBackward' },
          { target: 'normalAudience', actions: 'setDirBackward' },
        ],
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
              { target: '#quiz.normalAudience', actions: 'setDirBackward' },
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
            NEXT: { target: 'tone', actions: 'setDirForward' },
            BACK: { target: 'era', actions: 'setDirBackward' },
          },
        },
        tone: {
          on: {
            NEXT: { target: 'avoids', actions: 'setDirForward' },
            BACK: { target: 'mood', actions: 'setDirBackward' },
          },
        },
        avoids: {
          on: {
            NEXT: { target: 'favoriteActor', actions: 'setDirForward' },
            BACK: { target: 'tone', actions: 'setDirBackward' },
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
              { target: '#quiz.submitting', actions: 'clearSubmitState' },
            ],
            BACK: { target: 'avoids', actions: 'setDirBackward' },
          },
        },
      },
      on: {
        UPDATE_PERSON: { actions: 'updatePerson' },
      },
    },
    betweenPersons: {
      on: {
        CONTINUE: [
          { guard: 'isFastFlow', target: 'fastQuestions', actions: 'nextPerson' },
          { target: 'questions', actions: 'nextPerson' },
        ],
        BACK: [
          {
            guard: 'isFastFlow',
            target: '#quiz.fastQuestions.discovery',
            actions: 'setDirBackward',
          },
          { target: '#quiz.questions.favoriteActor', actions: 'setDirBackward' },
        ],
      },
    },
    submitting: {
      on: {
        SUBMIT_SUCCESS: {
          target: 'navigatingToResults',
          actions: 'setRecommendationId',
        },
        SUBMIT_FAILURE: {
          target: 'submitFailed',
          actions: 'setSubmitError',
        },
        RESET: { target: 'intro', actions: 'resetQuiz' },
      },
    },
    navigatingToResults: {
      type: 'final',
    },
    submitFailed: {
      on: {
        RETRY_SUBMIT: { target: 'submitting', actions: 'clearSubmitState' },
        BACK: [
          {
            guard: 'isFastFlow',
            target: '#quiz.fastQuestions.discovery',
            actions: 'setDirBackward',
          },
          { target: '#quiz.questions.favoriteActor', actions: 'setDirBackward' },
        ],
        RESET: { target: 'intro', actions: 'resetQuiz' },
      },
    },
  },
});
