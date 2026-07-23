export interface Movie {
  id: number;
  title: string;
  year: number;
  rating: string;
  duration: string;
  score: number;
  similarity: number;
  genres: string[];
  image: string;
  director: string;
  description: string;
}

export const MAIN_RECOMMENDATION: Movie = {
  id: 1,
  title: 'Interstellar',
  year: 2014,
  rating: 'PG-13',
  duration: '2h 49m',
  score: 8.7,
  similarity: 97,
  genres: ['Sci-Fi', 'Drama', 'Adventure'],
  director: 'Christopher Nolan',
  image:
    'https://images.unsplash.com/photo-1572851899135-e7179288c4c5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzcGFjZSUyMGdhbGF4eSUyMHNjaS1maSUyMGNpbmVtYXRpY3xlbnwxfHx8fDE3NzQ4OTQzNTJ8MA&ixlib=rb-4.1.0&q=80&w=1080',
  description:
    'Based on your passion for immersive, emotionally resonant storytelling and your taste for films that make you think, Interstellar is your perfect match. Nolan weaves together breathtaking cosmic visuals with a deeply human father-daughter story — exactly the kind of epic yet personal experience your answers pointed to. Prepare to feel small and moved at the same time.',
};

export const ADDITIONAL_SUGGESTIONS: Movie[] = [
  {
    id: 2,
    title: 'Blade Runner 2049',
    year: 2017,
    rating: 'R',
    duration: '2h 44m',
    score: 8.0,
    similarity: 94,
    genres: ['Sci-Fi', 'Drama', 'Thriller'],
    director: 'Denis Villeneuve',
    image:
      'https://images.unsplash.com/photo-1762792668677-29c149b70e9b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyYWlueSUyMGNpdHklMjBub2lyJTIwZmlsbSUyMHVyYmFufGVufDF8fHx8MTc3NDg5NDM1Mnww&ixlib=rb-4.1.0&q=80&w=1080',
    description:
      'A hauntingly beautiful neo-noir that rewards patient viewers with layers of philosophical depth. Your preference for serious, atmospheric storytelling makes this Villeneuve masterpiece a near-perfect fit.',
  },
  {
    id: 3,
    title: 'The Revenant',
    year: 2015,
    rating: 'R',
    duration: '2h 36m',
    score: 8.0,
    similarity: 91,
    genres: ['Adventure', 'Drama', 'Thriller'],
    director: 'Alejandro G. Iñárritu',
    image:
      'https://images.unsplash.com/photo-1707736919317-d7872cfb7553?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb3VudGFpbiUyMGFkdmVudHVyZSUyMGVwaWMlMjBsYW5kc2NhcGV8ZW58MXx8fHwxNzc0ODk0MzUzfDA&ixlib=rb-4.1.0&q=80&w=1080',
    description:
      'A raw, visceral survival epic shot entirely in natural light. If you love films that feel like an endurance test and an art piece simultaneously, this DiCaprio-led journey through the wilderness will leave you breathless.',
  },
  {
    id: 4,
    title: 'La La Land',
    year: 2016,
    rating: 'PG-13',
    duration: '2h 8m',
    score: 8.0,
    similarity: 89,
    genres: ['Drama', 'Romance', 'Musical'],
    director: 'Damien Chazelle',
    image:
      'https://images.unsplash.com/photo-1752154424950-6ed25cfa7ee4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3VwbGUlMjByb21hbmNlJTIwc3Vuc2V0JTIwZ29sZGVufGVufDF8fHx8MTc3NDg5NDM1M3ww&ixlib=rb-4.1.0&q=80&w=1080',
    description:
      "A love letter to dreamers and movies alike. Chazelle's vibrant musical captures the bittersweet ache of chasing ambitions while falling in love — a golden, emotionally complex gem that aligns with your taste for meaningful stories.",
  },
  {
    id: 5,
    title: 'Gone Girl',
    year: 2014,
    rating: 'R',
    duration: '2h 29m',
    score: 8.1,
    similarity: 87,
    genres: ['Thriller', 'Drama', 'Mystery'],
    director: 'David Fincher',
    image:
      'https://images.unsplash.com/photo-1647264157150-491bfd016aa1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjcmltZSUyMHRocmlsbGVyJTIwZGFyayUyMG1vb2R5fGVufDF8fHx8MTc3NDg5NDM1NHww&ixlib=rb-4.1.0&q=80&w=1080',
    description:
      "Fincher's psychological tour de force keeps you guessing until the final frame. Sharp, dark, and wickedly clever — if you appreciate films that subvert expectations and trust their audience's intelligence, this is unmissable.",
  },
  {
    id: 6,
    title: 'The Grand Budapest Hotel',
    year: 2014,
    rating: 'R',
    duration: '1h 39m',
    score: 8.1,
    similarity: 84,
    genres: ['Comedy', 'Adventure', 'Drama'],
    director: 'Wes Anderson',
    image:
      'https://images.unsplash.com/photo-1527224857830-43a7acc85260?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb21lZHklMjBsYXVnaGluZyUyMGZyaWVuZHMlMjBjb2xvcmZ1bHxlbnwxfHx8fDE3NzQ4OTQzNTR8MA&ixlib=rb-4.1.0&q=80&w=1080',
    description:
      "Anderson's most exquisitely crafted confection — a pastel-hued comedy of manners with real emotional weight underneath. When you want something visually stunning that also makes you laugh and feel, this delivers on every level.",
  },
];
