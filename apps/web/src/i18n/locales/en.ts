export const en = {
  nav: {
    howItWorks: 'How it works',
    availableMovies: 'Movies',
    findAMovie: 'Find a movie',
    toggleTheme: 'Toggle theme',
    switchLanguage: 'Switch language',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    styleGuide: 'Style Guide',
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
    badge: 'AI-Powered Movie Finder',
    descriptionPre: 'Stop endlessly scrolling. Answer 5 quick questions and let AI find the',
    perfectMovie: 'perfect movie',
    descriptionPost: 'for your mood, your night, your vibe.',
    findMyMovie: 'Find My Movie',
    howItWorks: 'How it works',
    noSignup: '✨ No sign-up required · Takes ~60 seconds · Works on mobile',
  },
  features: {
    headline: 'Movie night, sorted.',
    subheadline: 'No endless scrolling, no guesswork — just picks that fit.',
    aiPowered: {
      title: 'AI-Powered',
      desc: 'Finds films that truly match your vibe',
    },
    fiveQuestions: {
      title: '5 Quick Questions',
      desc: 'No endless forms — just a 60-second taste quiz',
    },
    groupMode: {
      title: 'Group Mode',
      desc: 'A pick everyone in the room will actually agree on. No arguing required.',
    },
    instantResults: {
      title: 'Instant Results',
      desc: 'Get 6 curated recommendations in seconds',
    },
  },
  cta: {
    headline: 'Your next favorite film is one quiz away',
    description:
      "Whether it's a solo night in or movie night with friends, PopChoice finds a film that fits the mood — every time.",
    button: 'Start the Quiz',
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
      back: 'Back',
      letsGo: "Let's go!",
    },
    between: {
      turnDone: "{name}'s turn is done!",
      nowIts: "Now it's {name}'s turn. Hand over the phone!",
      ready: "I'm ready, {name}! →",
    },
    nav: {
      back: 'Back',
      continue: 'Continue',
      nextPerson: 'Next Person',
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
    title: 'We found your perfect film',
    subtitle: 'Matched from {count} films based on your vibe',
    topPick: 'Top Pick',
    moreSuggestions: 'More suggestions',
    loading: 'Loading your picks…',
    noResultsTitle: 'Nothing matched…',
    noResultsHint: 'Try again with a different vibe.',
    tryAgain: 'Try Again',
    tryWithFriends: 'Try with friends',
    disclaimer: 'AI-picked for you. Results may spark a movie marathon.',
    scrollLeft: 'Scroll left',
    scrollRight: 'Scroll right',
    showDetails: 'Show details for {name}',
    aiPick: 'AI Pick',
    match: 'match',
    minUnit: 'min',
    whyThisFilm: 'Why this film',
    whyThisFilmForYou: 'Why this film for you',
    broaderSearch: 'Expanded search — including results from TMDB',
    foundInDb: 'Found in our library',
    foundOnTmdb: 'Found on TMDB',
    morePicksButton: 'Get more picks from TMDB',
    morePicksLoading: 'Fetching more picks…',
    morePicksEmpty: 'No more picks available right now.',
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
              why: 'App Router and server components for streaming renders and full-stack TypeScript',
            },
            { why: 'Concurrent rendering and Actions for a highly responsive quiz experience' },
            {
              why: 'Quiz logic modeled as a formal state machine — predictable flow, zero if-spaghetti',
            },
            { why: 'Utility-first styling driven by CSS custom property design tokens' },
          ],
        },
        {
          label: 'AI + Data',
          items: [
            {
              why: 'Taste profile encoding into 3072-dimensional vectors for high-signal semantic search',
            },
            { why: 'Fast, cost-effective generation of personalized recommendation explanations' },
            { why: 'Primary database for 400+ curated films, metadata, and vectors' },
            {
              why: 'Self-hosted vector similarity search with automatic fallback to TMDb for broader discovery',
            },
          ],
        },
        {
          label: 'Infrastructure',
          items: [
            { why: 'High-performance coordination layer for job queues and API rate limiting' },
            { why: 'Background job processing for the movie data backfill and discovery pipeline' },
            { why: 'Cloud platform hosting containerized web app, worker services, and databases' },
            { why: 'Monorepo build system with high-performance caching and task orchestration' },
            { why: 'Containerized deployment for consistent environments across all services' },
          ],
        },
      ],
    },
    faq: {
      title: 'FAQ',
      items: [
        {
          q: 'Does PopChoice require an account?',
          a: 'Nope! PopChoice is completely anonymous and requires no sign-up. Just answer the quiz and get your picks.',
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
            role: 'Full-stack framework',
            rationale:
              'Next.js 16 and the App Router provide the backbone of the application. Server components allow for streaming renders and layout-level data fetching, while full-stack TypeScript eliminates API contract drift.',
            detail:
              'The results page uses server components to fetch and stream movie data without client-side waterfalls — the UI renders progressively as recommendations arrive.',
          },
          {
            role: 'UI Library',
            rationale:
              'React 19 concurrent features keep the quiz UI responsive during heavy async operations. The use of Actions simplifies form handling and state transitions throughout the application.',
            detail: null,
          },
          {
            role: 'State Management',
            rationale:
              'The 5-question quiz is modeled as a formal state machine. This prevents illegal state transitions and provides a clear, predictable flow for the complex branching logic.',
            detail:
              'Using @xstate/react allows the UI to react to machine state changes, handling loading states and transitions with zero "if (loading)" spaghetti code.',
          },
          {
            role: 'Styling layer',
            rationale:
              'Utility-first styling with CSS custom property design tokens as the source of truth. Tailwind 4 generates classes dynamically, while tokens carry the semantic meaning for themes.',
            detail:
              'All theme-adaptive colors (light/dark mode) live in CSS custom properties. This means a single className can respond to the theme without JavaScript.',
          },
          {
            role: 'Animations',
            rationale:
              'Formerly Framer Motion, this library handles all spring-based transitions and entrance animations, ensuring the UI feels "alive" and responsive to user input.',
            detail: null,
          },
          {
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
            role: 'Taste encoding',
            rationale:
              'Quiz answers are assembled into structured prompts and encoded into 3072-dimension vectors. This captures deep semantic meaning: "family dynamics" and "moral complexity" land near each other in embedding space.',
            detail:
              'The embedding request is the only AI call that blocks the user. Everything else runs asynchronously in background workers.',
          },
          {
            role: 'Explanation generation',
            rationale:
              'Generates personalized explanations for each recommendation. gpt-5.4-mini provides an exceptional balance of speed and reasoning quality for real-time applications.',
            detail:
              'At 6 explanations per quiz submission, using the full gpt-5.4 model would increase latency. The "mini" variant provides near-instant results.',
          },
          {
            role: 'Primary Movie Database',
            rationale:
              'Serves as the central repository for 400+ curated films, metadata, and vectors. Storing everything in a single relational database simplifies data integrity and cross-referencing.',
            detail: null,
          },
          {
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
            role: 'Data Store',
            rationale:
              'Acts as the job store for our background tasks and the coordination layer for global rate limiting across our AI pipeline.',
            detail:
              'Redis ensures that even with multiple worker instances, we never exceed our OpenAI API token-per-minute or request-per-minute quotas.',
          },
          {
            role: 'Job Queue',
            rationale:
              'Handles the heavy lifting of background job scheduling, retries, and failure recovery for the movie data backfill and discovery pipeline.',
            detail: null,
          },
          {
            role: 'Deployment Platform',
            rationale:
              'The production environment for our multi-service architecture. Railway orchestrates the Next.js app, worker services, PostgreSQL, and Redis in a unified pipeline.',
            detail:
              "The repository is connected via Railway's GitHub integration, which automatically deploys the monorepo whenever changes are pushed to main.",
          },
          {
            role: 'Build System',
            rationale:
              'Manages monorepo builds with high-performance caching. It ensures that shared packages are built correctly before the apps that consume them.',
            detail: null,
          },
          {
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
            role: 'Testing Framework',
            rationale:
              'A Vite-native testing framework that provides near-instant feedback during development. It handles unit and integration tests across the entire monorepo.',
            detail: null,
          },
          {
            role: 'E2E Testing',
            rationale:
              'Ensures the critical path from quiz submission to movie recommendations works flawlessly across all modern browser engines.',
            detail: null,
          },
          {
            role: 'Component Lab',
            rationale:
              'Allows for isolated development and testing of UI components, ensuring visual consistency and accessibility before they are integrated into the app.',
            detail: null,
          },
          {
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
};

export type Translations = typeof en;
