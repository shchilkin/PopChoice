import type { RecommendationStage } from '@/features/recommendation/stages';

export const en = {
  nav: {
    howItWorks: 'How it works',
    availableMovies: 'Movies',
    findAMovie: 'Find a movie',
    signUp: 'Sign Up',
    logIn: 'Log In',
    logOut: 'Log Out',
    toggleTheme: 'Toggle theme',
    switchLanguage: 'Switch language',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    styleGuide: 'Design System',
    techStack: 'Stack',
  },
  footer: {
    builtBy: 'Built by',
    authorName: 'Aleksandr Shchilkin',
    tagline: 'a course project that got out of hand',
  },
  tmdbAttribution: {
    disclaimer: 'PopChoice uses the TMDB API but is not endorsed or certified by TMDB.',
    visitLink: 'Visit The Movie Database',
  },
  hero: {
    badge: 'Taste-Matched by AI',
    descriptionPre: 'Five questions tell us your taste. AI finds your',
    perfectMovie: 'perfect film',
    descriptionPost: 'from 400+ pre-analyzed picks. Solo or group.',
    findMyMovie: 'Find My Movie',
    howItWorks: 'How it works',
    noSignup: 'No sign-up · ~60 seconds · Works on mobile',
  },
  features: {
    headline: 'Not a filter. A match.',
    subheadline: 'Tone, pacing, cinematic style — encoded in 5 questions, searched by AI.',
    aiPowered: {
      title: 'Taste, Not Tags',
      desc: 'Your answers become a taste profile matched against pre-analyzed films by emotional tone, pacing, and style — not genre boxes.',
    },
    fiveQuestions: {
      title: 'Five Questions',
      desc: 'Favorite film, preferred era, mood, tone, an actor. Sixty seconds that build a taste profile worth searching.',
    },
    groupMode: {
      title: 'Group Mode',
      desc: 'Everyone answers on the same device. PopChoice finds where your tastes overlap — no arguing, no coin flip.',
      worksFor: 'Works for 2–6 people',
    },
    instantResults: {
      title: 'Six Curated Picks',
      desc: 'Top match plus five alternatives, each with an AI-written explanation of why it fits your taste specifically.',
    },
  },
  cta: {
    headline: 'The right film is in there. Let AI find it.',
    description:
      '60 seconds, 5 questions. Works whether you are watching alone or settling a group debate.',
    button: 'Find My Movie',
  },
  quiz: {
    intro: {
      title: "Let's find your movie",
      subtitle: 'Are you watching solo or with others?',
      soloTitle: 'Just me',
      soloDesc: 'Personalized picks — just for you',
      groupTitle: 'Group mode 🎉',
      groupDesc: 'Everyone answers on the same device — 2 to 6 people',
      youLabel: 'You',
    },
    groupSetup: {
      title: "Who's watching?",
      subtitle: "Add everyone's name so we can personalize your results",
      personPlaceholder: "Person {n}'s name",
      addPerson: 'Add another person',
      twoNamesHint: 'Add at least two names to start group mode.',
      countLabel: '{count}/6 seats filled',
      orderTitle: 'Turn order',
      orderHint: 'Pass the device this way',
      back: 'Back',
      letsGo: "Let's go!",
    },
    between: {
      progress: '{current} of {total} complete',
      turnDone: "{name}'s turn is done!",
      nowIts: "Now it's {name}'s turn. Hand over the phone!",
      ready: "I'm ready, {name}! →",
    },
    nav: {
      back: 'Back',
      continue: 'Continue',
      nextPerson: 'Next Person',
      handTo: 'Hand to {name}',
      findMyMovie: 'Find My Movie ✨',
      submitting: 'Submitting…',
      ofTotal: '{current} of {total}',
      personTurn: "{name}'s turn",
    },
    labels: ['Favorite film', 'Old or new?', 'Your mood', 'Pick a tone', 'Favorite actor'],
    favoriteMovie: {
      title: "What's your favorite movie?",
      hint: 'This helps us understand your taste. Any film that made an impression on you.',
      placeholder: 'e.g. The Dark Knight, Parasite, Coco…',
      popularPicks: 'POPULAR PICKS',
      why: 'WHY?',
      whyOptional: '(optional)',
      whyPlaceholder: 'Share your thoughts — plot, characters, what made it special…',
    },
    era: {
      title: 'New releases or timeless classics?',
      new: { title: 'New Releases', desc: 'Recent films from the last 5 years' },
      classic: { title: 'Timeless Classics', desc: 'Golden films that stood the test of time' },
      both: {
        title: "I'm open to both",
        desc: "Surprise me — old or new, as long as it's great",
      },
    },
    mood: {
      title: "What's your mood tonight?",
      pickOne: 'Pick one or more',
      selectedSingular: '✓ {n} genre selected',
      selectedPlural: '✓ {n} genres selected',
    },
    tone: {
      title: 'What tone are you after?',
    },
    actor: {
      title: "Who's your favorite actor?",
      hint: 'Optional — adds another dimension to your taste profile.',

      placeholder: 'e.g. Tom Hanks, Meryl Streep, Cillian Murphy…',
      popularPicks: 'POPULAR PICKS',
    },
  },
  genres: {
    action: 'Action',
    comedy: 'Comedy',
    drama: 'Drama',
    scifi: 'Sci-Fi',
    thriller: 'Thriller',
    romance: 'Romance',
    horror: 'Horror',
    adventure: 'Adventure',
    animation: 'Animation',
    documentary: 'Documentary',
  },
  tones: {
    light: { label: 'Light & Fun', desc: 'Easy going, uplifting' },
    balanced: { label: 'Balanced', desc: 'Mix of everything' },
    serious: { label: 'Serious', desc: 'Thought-provoking' },
    dark: { label: 'Dark & Intense', desc: 'Gripping, complex' },
  },
  loading: {
    title: 'Finding your perfect pick',
    errorTitle: 'Oops…',
    submitBridgeEyebrow: 'Answers locked',
    submitBridgeTitle: 'Finding your film',
    submitBridgeBody:
      'We are matching your vibe against the collection and shaping a shortlist worth the wait.',
    groupSubmitBridgeEyebrow: '{count} taste profiles locked',
    groupSubmitBridgeTitle: 'Finding the overlap',
    groupSubmitBridgeBody:
      'We are weighing shared moods, favorite films, and compromise picks for a movie the room can agree on.',
    submitFailedEyebrow: 'Recommendation paused',
    submitFailedTitle: 'Search did not start',
    submitFailedBody:
      'Something interrupted the handoff to recommendations. Your answers are still here, so you can try again or adjust the last step.',
    submitFailedRetry: 'Try again',
    submitFailedBack: 'Back to quiz',
    queuedLabel: 'Warming up the projector',
    realProgressLabel: 'Building your shortlist',
    stages: {
      queued: 'Queued for processing',
      preparing: 'Reading your taste profile',
      embedding: 'Mapping your movie taste',
      'local-search': 'Searching the curated movie library',
      'tmdb-search': 'Expanding the search with TMDB',
      'ai-ranking': 'Choosing the strongest matches',
      posters: 'Fetching poster and title details',
      descriptions: 'Writing personalized explanations',
      complete: 'Finalizing your picks',
      failed: 'Recommendation failed',
    } satisfies Record<RecommendationStage, string>,
    tips: [
      'Decoding your cinematic DNA… 🧠',
      'Scanning 400+ curated films for the perfect match… 🎬',
      'Matching vibes, not just genres… ✨',
      'Filtering out movies your friends already spoiled… 🤫',
      'Calculating the perfect runtime for your evening… ⏱️',
      'Consulting the AI film sommelier… 🍷',
      'Almost there — your perfect pick is loading… 🍿',
    ],
    retryableError: 'Something went wrong. Please try again.',
    moderatedError:
      'Your input was flagged for inappropriate content. Please revise your preferences and try again.',
    fatalError: 'The service is not available right now. Please try again later.',
    savedAnswers:
      "Your answers are saved in your browser — come back and we'll pick up where you left off.",
    tryAgain: 'Try again',
    backToQuiz: 'Back to quiz',
    goHome: 'Go to home',
    funFact: '🍿 Did you know?',
    funFactText:
      'The average person spends {time} deciding what to watch — PopChoice does it in seconds.',
    funFactTime: '18 minutes',
  },
  results: {
    badge: 'Your personalized picks',
    groupBadge: 'Your group pick',
    title: 'We found your perfect film',
    groupTitle: 'We found your group film',
    subtitle: 'Matched from {count} films based on your vibe',
    groupSubtitle: 'Balanced across {people} people from {count} films',
    topPick: 'Top Pick',
    moreSuggestions: 'More suggestions',
    loading: 'Loading your picks…',
    noResultsTitle: 'Nothing matched…',
    noResultsHint: 'Try again with a different vibe.',
    sharedResultBadge: 'Shared result',
    missingResultTitle: 'This pick left the theater',
    missingResultHint:
      'That shared result is no longer available. Start a fresh quiz and PopChoice will find a new film for tonight.',
    failedResultTitle: 'The projector jammed',
    failedResultHint:
      'This recommendation did not finish cleanly. Start again and we will build a fresh pick.',
    tryAgain: 'Try Again',
    tryWithFriends: 'Try with friends',
    startFresh: 'Start a fresh quiz',
    disclaimer: 'AI-picked for you. Results may spark a movie marathon.',
    scrollLeft: 'Scroll left',
    scrollRight: 'Scroll right',
    showDetails: 'Show details for {name}',
    aiPick: 'AI Pick',
    match: 'match',
    minUnit: 'min',
    whyThisFilm: 'Why this film',
    whyThisFilmForYou: 'Why this film for you',
    whyThisFilmForGroup: 'Why this film for your group',
    shareResult: 'Share result',
    shareCopied: 'Link copied',
    shareTitle: 'PopChoice picked {name}',
    shareText: 'PopChoice found {name} for movie night.',
    decisionNoteLabel: 'Why this pick',
    soloDecisionNote:
      '{name} won because it lines up with your mood, tone, era, and favorite actor cue, not just one genre.',
    groupDecisionNote:
      '{name} won as the most watchable overlap for {people} people, balancing shared mood with tone and era.',
    expandedDecisionNote: 'PopChoice widened the search through TMDB to keep the match strong.',
    groupBriefTitle: 'How we balanced the room',
    groupBriefTakeaway:
      'Shared moods set the direction first. Tone, era, and actor cues then break ties so nobody gets flattened into an average.',
    groupBriefPeople: 'Watching crew',
    groupBriefPeopleValue: '{count} people: {names}',
    groupBriefSharedMood: 'Shared mood',
    groupBriefNoSharedMoods: 'No exact genre overlap, so this pick plays mediator.',
    groupBriefTone: 'Tone spread',
    groupBriefEra: 'Era comfort zone',
    groupBriefActors: 'Cast signal: {actors}',
    groupBriefMixedSignals: 'Mixed signals, handled as a compromise.',
    groupBriefParticipantSignals: 'What each person brought in',
    groupBriefFavorite: 'Favorite:',
    groupBriefMoodSignal: 'Mood:',
    groupBriefToneSignal: 'Tone:',
    groupBriefEraSignal: 'Era:',
    groupBriefMissingSignal: 'Not specified',
    broaderSearch: 'Expanded search — including results from TMDB',
    foundInDb: 'Found in our library',
    foundOnTmdb: 'Found on TMDB',
    morePicksButton: 'Get more picks from TMDB',
    morePicksLoading: 'Fetching more picks…',
    morePicksEmpty: 'No more picks available right now.',
    morePicksStalled: 'Taking too long — try again later.',
  },
  about: {
    title: 'AI that gets your taste',
    originDescription:
      'Started as a Scrimba AI engineering course project. After finishing the course I kept building — turning it into a real full-stack system to learn the parts that tutorials skip: vector databases, background job pipelines, monorepo tooling, and containerized deployments. The movie recommendations are real.',
    sourceCode: "This project's source code is available",
    sourceCodeLink: 'here',
    whatItDoesLabel: 'What it does',
    whatItDoesDescription:
      "PopChoice takes a 5-question taste quiz — favorite film, preferred era, current mood, tone, and a favorite actor — and transforms your answers into a vector embedding using the OpenAI API. That embedding is compared against a curated library of 400+ pre-analyzed films stored in PostgreSQL with the pgvector extension. If the local collection doesn't yield a high-quality match, the system automatically falls back to a broader search across the TMDb database. The closest matches surface as recommendations, each with a GPT-generated explanation of why it fits your specific taste profile. Genre is just one dimension; the system captures cinematographic style, narrative complexity, and emotional tone.",
    backgroundNote:
      'All of this runs in the background. What you see: a 60-second quiz and a film worth watching.',
    ctaTitle: "Ready to find tonight's film?",
    ctaSubtitle: '60 seconds. 5 questions. The perfect movie.',
    ctaButton: 'Start the Quiz',
    howItWorks: {
      title: 'The process',
      steps: [
        {
          title: 'You answer 5 quick questions',
          desc: "Tell us your favorite film (and optionally why you love it), whether you prefer classics or new releases, your current mood (pick multiple genres!), the tone you're after, and your favorite actor. It takes about 60 seconds.",
        },
        {
          title: 'We build your taste profile',
          desc: 'Your answers are transformed into a rich taste profile that captures nuances beyond genres: cinematographic style, narrative complexity, and emotional tone.',
        },
        {
          title: 'AI searches our film database',
          desc: 'Using AI, we find the films in our database closest to your taste profile. Every film has been pre-analyzed for tone, pacing, themes, and emotional resonance.',
        },
        {
          title: 'You get curated results',
          desc: 'We surface your top match plus 5 additional great options, each with a personalized AI-written explanation of why it fits your taste.',
        },
      ],
    },
    techStack: {
      title: 'Under the hood',
      linkText: 'Full stack breakdown →',
      groups: [
        {
          label: 'Frontend',
          items: [
            {
              name: 'Next.js 16',
              why: 'App Router and server components for streaming renders and full-stack TypeScript',
            },
            {
              name: 'React 19',
              why: 'Concurrent rendering and Actions for a highly responsive quiz experience',
            },
            {
              name: 'XState',
              why: 'Quiz logic modeled as a formal state machine — predictable flow, zero if-spaghetti',
            },
            {
              name: 'Tailwind CSS 4',
              why: 'Utility-first styling driven by CSS custom property design tokens',
            },
          ],
        },
        {
          label: 'AI + Data',
          items: [
            {
              name: 'OpenAI text-embedding-3-large',
              why: 'Taste profile encoding into 3072-dimensional vectors for high-signal semantic search',
            },
            {
              name: 'gpt-5.4-mini',
              why: 'Fast, cost-effective generation of personalized recommendation explanations',
            },
            {
              name: 'PostgreSQL',
              why: 'Primary database for 400+ curated films, metadata, and vectors',
            },
            {
              name: 'pgvector',
              why: 'Self-hosted vector similarity search with automatic fallback to TMDb for broader discovery',
            },
          ],
        },
        {
          label: 'Infrastructure',
          items: [
            {
              name: 'Redis',
              why: 'High-performance coordination layer for job queues and API rate limiting',
            },
            {
              name: 'BullMQ',
              why: 'Background job processing for the movie data backfill and discovery pipeline',
            },
            {
              name: 'Coolify',
              why: 'Self-hosted deployment platform for the containerized web app, worker services, and databases',
            },
            {
              name: 'Turborepo',
              why: 'Monorepo build system with high-performance caching and task orchestration',
            },
            {
              name: 'Docker',
              why: 'Containerized deployment for consistent environments across all services',
            },
          ],
        },
      ],
    },
    faq: {
      title: 'FAQ',
      items: [
        {
          q: 'Does PopChoice require an account?',
          a: 'No sign-up needed to use PopChoice — just answer the quiz and get your picks. You can optionally create a free account to save your results.',
        },
        {
          q: 'How does group mode work?',
          a: "Each person answers the 5 questions on the same device. Just pass it around. PopChoice then finds films that score well across everyone's taste profiles.",
        },
        {
          q: 'How accurate are the recommendations?',
          a: 'The AI analyzes multiple film attributes (not just genre), which leads to surprisingly accurate taste matching. Movie taste is subjective, so we give you 6 options.',
        },
        {
          q: 'Where does the film data come from?',
          a: 'Our film database is curated from public film metadata, including ratings, runtime, director, genre tags, and thematic analysis performed by our AI pipeline.',
        },
      ],
    },
  },
  techStackPage: {
    breadcrumbAbout: 'About',
    breadcrumbStack: 'Stack',
    title: 'Under the Hood',
    intro:
      'Every choice here was made to learn the parts that course projects skip: self-hosted vector search, background job pipelines, monorepo tooling, and containerized multi-service deployments. The decisions below explain the reasoning, not just the result.',
    backToAbout: '← Back to About',
    tryQuiz: 'Try the quiz →',
    groups: [
      {
        label: 'Frontend',
        items: [
          {
            name: 'Next.js 16',
            role: 'Full-stack framework',
            rationale:
              'Next.js 16 and the App Router provide the backbone of the application. Server components allow for streaming renders and layout-level data fetching, while full-stack TypeScript eliminates API contract drift.',
            detail:
              'The results page uses server components to fetch and stream movie data without client-side waterfalls — the UI renders progressively as recommendations arrive.',
          },
          {
            name: 'React 19',
            role: 'UI Library',
            rationale:
              'React 19 concurrent features keep the quiz UI responsive during heavy async operations. The use of Actions simplifies form handling and state transitions throughout the application.',
            detail: null,
          },
          {
            name: 'XState',
            role: 'State Management',
            rationale:
              'The 5-question quiz is modeled as a formal state machine. This prevents illegal state transitions and provides a clear, predictable flow for the complex branching logic.',
            detail:
              'Using @xstate/react allows the UI to react to machine state changes, handling loading states and transitions with zero "if (loading)" spaghetti code.',
          },
          {
            name: 'Tailwind CSS 4',
            role: 'Styling layer',
            rationale:
              'Utility-first styling with CSS custom property design tokens as the source of truth. Tailwind 4 generates classes dynamically, while tokens carry the semantic meaning for themes.',
            detail:
              'All theme-adaptive colors (light/dark mode) live in CSS custom properties. This means a single className can respond to the theme without JavaScript.',
          },
          {
            name: 'Motion',
            role: 'Animations',
            rationale:
              'Formerly Framer Motion, this library handles all spring-based transitions and entrance animations, ensuring the UI feels "alive" and responsive to user input.',
            detail: null,
          },
          {
            name: 'Lucide React',
            role: 'Icon Set',
            rationale:
              'A clean, consistent icon library that is fully tree-shakeable and optimized for modern React environments.',
            detail: null,
          },
        ],
      },
      {
        label: 'AI + Data',
        items: [
          {
            name: 'OpenAI text-embedding-3-large',
            role: 'Taste encoding',
            rationale:
              'Quiz answers are assembled into structured prompts and encoded into 3072-dimension vectors. This captures deep semantic meaning: "family dynamics" and "moral complexity" land near each other in embedding space.',
            detail:
              'The embedding request is the only AI call that blocks the user. Everything else runs asynchronously in background workers.',
          },
          {
            name: 'gpt-5.4-mini',
            role: 'Explanation generation',
            rationale:
              'Generates personalized explanations for each recommendation. gpt-5.4-mini provides an exceptional balance of speed and reasoning quality for real-time applications.',
            detail:
              'At 6 explanations per quiz submission, using the full gpt-5.4 model would increase latency. The "mini" variant provides near-instant results.',
          },
          {
            name: 'PostgreSQL',
            role: 'Primary Movie Database',
            rationale:
              'Serves as the central repository for 400+ curated films, metadata, and vectors. Storing everything in a single relational database simplifies data integrity and cross-referencing.',
            detail: null,
          },
          {
            name: 'pgvector',
            role: 'Vector Search',
            rationale:
              'A PostgreSQL extension that enables vector similarity search directly in our database. This avoids the overhead of managing a separate vector database like Pinecone or Weaviate.',
            detail:
              "Cosine similarity search finds the nearest neighbors to the user's taste vector with sub-100ms performance at scale.",
          },
        ],
      },
      {
        label: 'Infrastructure',
        items: [
          {
            name: 'Redis',
            role: 'Data Store',
            rationale:
              'Acts as the job store for our background tasks and the coordination layer for global rate limiting across our AI pipeline.',
            detail:
              'Redis ensures that even with multiple worker instances, we never exceed our OpenAI API token-per-minute or request-per-minute quotas.',
          },
          {
            name: 'BullMQ',
            role: 'Job Queue',
            rationale:
              'Handles the heavy lifting of background job scheduling, retries, and failure recovery for the movie data backfill and discovery pipeline.',
            detail: null,
          },
          {
            name: 'Coolify',
            role: 'Deployment Platform',
            rationale:
              'Runs the production environment for our multi-service architecture on a VPS, orchestrating the Next.js app, worker services, PostgreSQL, and Redis through Docker Compose.',
            detail:
              'The repository is connected through Coolify, which deploys the monorepo to the VPS whenever production changes are shipped.',
          },
          {
            name: 'Turborepo',
            role: 'Build System',
            rationale:
              'Manages monorepo builds with high-performance caching. It ensures that shared packages are built correctly before the apps that consume them.',
            detail: null,
          },
          {
            name: 'Docker',
            role: 'Containerization',
            rationale:
              'Ensures consistent environments from local development to production. Multi-stage Dockerfiles keep the final production images lean and secure.',
            detail: null,
          },
        ],
      },
      {
        label: 'Quality',
        items: [
          {
            name: 'Vitest',
            role: 'Testing Framework',
            rationale:
              'A Vite-native testing framework that provides near-instant feedback during development. It handles unit and integration tests across the entire monorepo.',
            detail: null,
          },
          {
            name: 'Playwright',
            role: 'E2E Testing',
            rationale:
              'Ensures the critical path from quiz submission to movie recommendations works flawlessly across all modern browser engines.',
            detail: null,
          },
          {
            name: 'Storybook',
            role: 'Component Lab',
            rationale:
              'Allows for isolated development and testing of UI components, ensuring visual consistency and accessibility before they are integrated into the app.',
            detail: null,
          },
          {
            name: 'MSW',
            role: 'API Mocking',
            rationale:
              'Mock Service Worker intercepts network requests at the browser level, allowing the UI to be developed against realistic API responses without a live backend.',
            detail: null,
          },
        ],
      },
    ],
  },
  moviesPage: {
    title: 'Available Movies',
    loading: 'Loading movies…',
    tryAgain: 'Try Again',
    showing: 'Showing {start}–{end} of {total} movies',
    noMoviesFound: 'No movies found',
    prev: 'Prev',
    next: 'Next',
    pageOf: 'Page {current} of {total}',
    columns: {
      name: 'Name',
      ageRating: 'Age Rating',
      duration: 'Duration',
      score: 'Score',
    },
  },
  styleGuide: {
    title: 'Design System',
    description:
      'The visual language for a cinema-grade recommendation engine. Gold as signal, Oswald for authority, Manrope for warmth. Two equal themes. One rule: flat at rest, depth by state.',
    componentsTitle: 'Components',
    componentsDescription: 'All reusable UI components with their props and states.',
    footerTokens: 'PopChoice Design System: design tokens and components',
    footerComponents: 'PopChoice Design System: interactive component library',
    backLink: '← Design System',
    forwardLink: 'Components →',
    nav: {
      brandPalette: 'Brand Palette',
      typography: 'Typography',
      buttons: 'Buttons',
      progressDots: 'Progress Dots',
      components: 'Components',
    },
    sections: {
      brandVoice: 'Brand Voice',
      mascot: 'Mascot',
      brandPalette: 'Brand Palette',
      backgrounds: 'Backgrounds',
      textColors: 'Text Colors',
      brandColors: 'Brand Colors',
      gradients: 'Gradients',
      typography: 'Typography',
      buttons: 'Buttons',
      ageRatingChips: 'Age Rating Chips',
      progressDots: 'Progress Dots',
      borders: 'Borders',
      shadows: 'Shadows',
      goldAccentStates: 'Gold Accent States',
      spacingScale: 'Spacing Scale',
      borderRadius: 'Border Radius',
      headerControls: 'Header Controls',
      breadcrumbs: 'Breadcrumbs',
      tmdbAttribution: 'TMDB Attribution',
      similarityBadge: 'Similarity Badge',
      starRating: 'Star Rating',
      ageRatingPill: 'Age Rating Pill',
      movieCards: 'Movie Cards',
      skeletonLoading: 'Skeleton / Loading States',
      aiContentBlock: 'AI Content Block',
      alertBanners: 'Alert Banners',
      featureCards: 'Feature Cards',
      genreSelector: 'Genre Selector',
      toneSelector: 'Tone Selector',
      eraSelector: 'Era Selector',
      textInputs: 'Text Inputs',
      numberBadge: 'Number Badge',
      quizNavigation: 'Quiz Navigation',
      stepHeaderPattern: 'Step Header Pattern',
    },
    voice: {
      cinematic: {
        word: 'Cinematic',
        desc: 'Evokes the feeling of a real cinema without copying its aesthetics. The typography is a film title; the palette is a marquee at night. Not streaming service dark blue. Not film-festival pretension.',
      },
      confident: {
        word: 'Confident',
        desc: 'The product has opinions. Copy says "The right film is in there" not "We think you might enjoy." Oswald announces; it does not hedge. One CTA, clearly gold, on a surface that does not compete.',
      },
      playful: {
        word: 'Playful',
        desc: 'Delight lives in details: the confetti burst, the morphing progress dots, the loading tips. Personality is earned through specificity, not loud decoration or emoji at scale.',
      },
    },
    principles: {
      p01: {
        title: 'Gold as Signal',
        body: 'Gold appears on 10% or less of any screen: CTAs, active states, the logo wordmark. Its rarity is what makes it read as intent. When gold appears, something matters.',
      },
      p02: {
        title: 'Oswald Announces, Manrope Converses',
        body: 'Condensed uppercase authority for headlines, warm humanist readability for everything conversational. The pairing is the Cinematic Concierge in typographic form: confident heading, warm voice.',
      },
      p03: {
        title: 'Two Equal Themes',
        body: 'Warm parchment and cool midnight: both intentional, both given equal visual care. Neither is a dark-mode toggle bolted on after the fact.',
      },
      p04: {
        title: 'Flat at Rest, Depth by State',
        body: 'Surfaces are flat. The card shadow is a quiet hint. Only the CTA carries an expressive gold glow. No decorative depth. Only depth that earns its place.',
      },
    },
    tokens: {
      pageBackground: 'Page background',
      cardSurface: 'Card / surface',
      hoveredSurface: 'Hovered surface',
      deepSurface: 'Deep / nested surface',
      subtleInteractive: 'Subtle interactive fill',
      primaryText: 'Primary text',
      secondaryText: 'Secondary text',
      tertiaryText: 'Tertiary text',
      mutedText: 'Muted text',
      goldText: 'Gold text (accessible)',
      amberText: 'Amber text (accessible)',
      ctaGradient: 'CTA',
      ctaHorizontal: 'CTA Horizontal',
      progressGradient: 'Progress',
      subtleBorder: 'bd1 — subtle',
      defaultBorder: 'bd2 — default',
      mediumBorder: 'bd3 — medium',
      strongBorder: 'bd4 — strong',
      cardShadow: 'Card Shadow',
      ctaShadow: 'CTA Shadow',
      ctaShadowHover: 'CTA Shadow Hover',
    },
    typo: {
      oswaldLabel: 'Oswald — Display / Headings',
      manropeLabel: 'Manrope — Body / UI',
      sizes: 'Sizes',
      allRatings: 'All Ratings',
    },
    btns: {
      ctaButton: 'CTA Button',
      defaultButton: 'Default Button',
      ghostButton: 'Ghost Button',
      ctaDisabled: 'CTA Disabled',
      defaultDisabled: 'Default Disabled',
      ghostDisabled: 'Ghost Disabled',
    },
    ageChip: {
      note: 'AgeRatingChip — semantic color per rating band (G=green, PG=teal, R=red, etc.). Used in the MoviesTable and movie detail views where the rating carries meaning. For a neutral, unstyled pill use AgeRatingPill (see Components page).',
      sizes: 'Sizes',
      allRatings: 'All Ratings',
    },
    progress: {
      step1: 'Step 1 of 5',
      step3: 'Step 3 of 5',
      step5: 'Step 5 of 5',
    },
    mascotSection: {
      name: 'The Popcorn',
      desc: 'A striped cinema bucket, instantly recognizable and genuinely enthusiastic. Not a logo. A character. The Cinematic Concierge made physical: confident shape, warm gold kernels, stripe pattern borrowed from the classic movie-house bucket.',
      clickIt: 'Click it.',
      stripeColorsLabel: 'Stripe colors',
      stripeColorsValue: 'Red #f20000 and white — the classic cinema bucket, no second-guessing.',
      kernelFillLabel: 'Kernel fill',
      kernelFillValue: 'Gold #F7B017 — directly mapped to the brand accent. Same hue, same signal.',
      interactionLabel: 'Interaction',
      interactionValue:
        'Click fires a burst of gold confetti. Delight that is earned, not decorative — it only fires when you choose it.',
      usageLabel: 'Usage',
      usageValue: 'Hero, CTA section, loading state, empty states. Always at rest until invited.',
    },
    comp: {
      mascotNote: 'Click the mascot to trigger confetti. Accepts width and height props.',
      breadcrumbsNote:
        'Uses Oswald condensed uppercase at text-xs / tracking-[0.12em]. Last item is aria-current="page", non-linked.',
      ageRatingPillNote:
        'AgeRatingPill — neutral, no color semantics. Used in SmallSuggestionCard where space is tight and color would compete with similarity badges. AgeRatingChip — semantic color per band. Used in MoviesTable and detail views where the rating is the primary data point (see Design System).',
      movieCardsNote:
        'Click to toggle active state. SmallSuggestionCard is used in the results scroll row.',
      movieCardsLabel: 'SmallSuggestionCard — active / inactive states',
      stateLabel: 'State:',
      loading: 'Loading',
      loaded: 'Loaded',
      aiBlockContent:
        "Christopher Nolan's mind-bending thriller follows a skilled thief who steals secrets from dreams. A perfect match for fans of cerebral sci-fi with breathtaking visuals.",
      aiBlockLabel: 'var(--pc-ai-bg) / var(--pc-ai-bd) — used for AI-generated descriptions',
      aiPickLabel: 'AI Pick',
      alertInfo: 'Movie database is loading — showing cached results.',
      alertWarning: "Some poster images couldn't be loaded from TMDB.",
      alertError: 'Recommendation service unavailable. Please try again.',
      featureCardsNote:
        'Used in FeaturesSection on the landing page. Props: icon: LucideIcon, title: string, desc: string, color: string (brand hex from palette). Icon tint and background are derived from color with alpha suffix.',
      featureCardsLabel:
        'FeatureCard — flat at rest, icon tinted to color, surface var(--pc-surface)',
      featureAiTitle: 'AI Powered',
      featureAiDesc: 'Uses OpenAI embeddings for smart recommendations',
      featureQuestionsTitle: '5 Questions',
      featureQuestionsDesc: 'Answer a short quiz to get personalized picks',
      featureGroupTitle: 'Group Mode',
      featureGroupDesc: 'Find a movie everyone in your group will enjoy',
      featureInstantTitle: 'Instant Results',
      featureInstantDesc: 'Get recommendations in seconds, not minutes',
      genreSelectorNote: 'Multi-select. Click to toggle genres. Used in MoodStep.',
      toneSelectorNote: 'Single-select. Click to choose a tone. Used in ToneStep.',
      eraSelectorNote: 'Single-select. Click to pick a film era. Used in EraStep.',
      inputFavouriteMovie: 'Favourite Movie',
      inputFavouriteActor: 'Favourite Actor',
      inputWithNumberBadge: 'With number badge',
      inputsLabel: 'Default · focus: gold border + ring · used in quiz steps',
      numberBadgeNote: 'Used in GroupSetup to label participants.',
      quizNavCanProceed: 'Can proceed · mid-quiz',
      quizNavCannotProceed: 'Cannot proceed',
      quizNavLastStep: 'Last step · submitting',
      stepHeaderNote: 'Icon badge + Oswald heading used across all quiz step headers.',
      similarity95: '95%+ — Teal',
      similarity90: '90–94% — Gold',
      similarity85: '85–89% — Amber',
      similarityLow: '< 85% — Purple',
      breadcrumbHome: 'Home',
      breadcrumbQuiz: 'Quiz',
      breadcrumbResults: 'Results',
      breadcrumbStyleGuide: 'Design System',
      skeletonMoviesNote: 'MoviesTableSkeleton / MoviesTable',
      skeletonCardNote: 'SkeletonCard / SmallSuggestionCard',
    },
  },
  register: {
    title: 'Create an account',
    subtitle: 'Save your picks and discover more',
    emailLabel: 'Email address',
    emailPlaceholder: 'you@example.com',
    passwordLabel: 'Password',
    passwordPlaceholder: 'At least 8 characters',
    confirmPasswordLabel: 'Confirm password',
    confirmPasswordPlaceholder: 'Repeat your password',
    submitButton: 'Create account',
    submitting: 'Creating account…',
    successTitle: 'Account created!',
    successMessage: 'You can now sign in to PopChoice.',
    backToHome: 'Back to home',
    alreadyHaveAccount: 'Already have an account?',
    logIn: 'Log in',
    errors: {
      emailRequired: 'Email is required.',
      emailInvalid: 'Please enter a valid email address.',
      passwordRequired: 'Password is required.',
      passwordTooShort: 'Password must be at least 8 characters.',
      confirmPasswordRequired: 'Please confirm your password.',
      passwordMismatch: 'Passwords do not match.',
      emailTaken: 'This email is already registered.',
      generic: 'Something went wrong. Please try again.',
    },
  },
  login: {
    title: 'Welcome back',
    subtitle: 'Sign in to your PopChoice account',
    emailLabel: 'Email address',
    emailPlaceholder: 'you@example.com',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Your password',
    submitButton: 'Sign in',
    submitting: 'Signing in…',
    successTitle: 'Signed in!',
    successMessage: 'You are now signed in to PopChoice.',
    backToHome: 'Back to home',
    noAccount: "Don't have an account?",
    signUp: 'Sign up',
    errors: {
      emailRequired: 'Email is required.',
      emailInvalid: 'Please enter a valid email address.',
      passwordRequired: 'Password is required.',
      invalidCredentials: 'Invalid email or password.',
      generic: 'Something went wrong. Please try again.',
    },
  },
  deleteAccount: {
    title: 'Delete account',
    subtitle: 'This action is permanent and cannot be undone.',
    emailLabel: 'Email address',
    emailPlaceholder: 'you@example.com',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Your current password',
    submitButton: 'Delete my account',
    submitting: 'Deleting account…',
    successTitle: 'Account deleted',
    successMessage: 'Your account and all associated data have been permanently deleted.',
    backToHome: 'Back to home',
    errors: {
      emailRequired: 'Email is required.',
      emailInvalid: 'Please enter a valid email address.',
      passwordRequired: 'Password is required.',
      invalidCredentials: 'Invalid email or password.',
      generic: 'Something went wrong. Please try again.',
    },
  },
};

export type Translations = typeof en;
