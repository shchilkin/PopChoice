import { createBrowserRouter, Outlet } from 'react-router';

import { Layout } from './components/Layout';
import { About } from './pages/About';
import { Landing } from './pages/Landing';
import { Loading } from './pages/Loading';
import { Quiz } from './pages/Quiz';
import { Results } from './pages/Results';
import { StyleGuide } from './pages/StyleGuide';

function RootLayout() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] text-center px-5">
      <div className="text-5xl mb-4">🎬</div>
      <h2
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: '2rem',
          letterSpacing: '0.05em',
          color: '#F8F8FF',
        }}
      >
        Scene not found
      </h2>
      <p style={{ color: '#5A5A78', marginTop: 8 }}>
        This page doesn't exist — but a great movie does.
      </p>
      <a
        href="/"
        className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm"
        style={{
          background: 'linear-gradient(135deg, #F5C518, #FF9F1C)',
          color: '#09090F',
          fontWeight: 700,
        }}
      >
        Go home
      </a>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    children: [
      { index: true, Component: Landing },
      { path: 'quiz', Component: Quiz },
      { path: 'loading', Component: Loading },
      { path: 'results', Component: Results },
      { path: 'about', Component: About },
      { path: 'style-guide', Component: StyleGuide },
      { path: '*', Component: NotFound },
    ],
  },
]);
