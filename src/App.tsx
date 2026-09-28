import { Link, Outlet, RouterProvider, ScrollRestoration, createBrowserRouter, isRouteErrorResponse, useLocation, useRouteError } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import DeckList from '@/pages/DeckList'
import DeckView from '@/pages/DeckView'
import StudySetup from '@/pages/StudySetup'
import StudySession from '@/pages/StudySession'
import NewDeckPage from '@/pages/NewDeckPage'
import GenerateDeckPage from '@/pages/GenerateDeckPage'
import DeckBestTimesPage from '@/pages/DeckBestTimesPage'
import AddCardPage from '@/pages/AddCardPage'
import EditCardPage from '@/pages/EditCardPage'
import EditDeckPage from '@/pages/EditDeckPage'
import AboutPage from '@/pages/AboutPage'
import LibraryPage from '@/pages/LibraryPage'
import { DataProvider, useData } from '@/contexts/DataContext'
import { ToastProvider } from '@/components/Toaster'
import Header from '@/components/Header'
import { Button } from '@/components/ui/button'

/** Study sessions go full-screen (no header) to leave room for the phone keyboard. */
function isFocusRoute(pathname: string) {
  return pathname.startsWith('/study/') && !pathname.endsWith('/setup')
}

function Layout() {
  const { pathname } = useLocation()
  const focus = isFocusRoute(pathname)
  return (
    <div className="felt min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground">
        Skip to content
      </a>
      {!focus && <Header />}
      <StorageWarning />
      <main id="main" key={focus ? 'focus' : pathname} className={focus ? '' : 'mx-auto max-w-5xl px-4 pb-16 pt-6 animate-in fade-in-0 slide-in-from-bottom-1 duration-300 sm:pt-10'}>
        <Outlet />
      </main>
      <ScrollRestoration />
    </div>
  )
}

function StorageWarning() {
  const { storageError } = useData()
  if (!storageError) return null
  return (
    <div role="alert" className="mx-auto mt-3 flex max-w-5xl items-start gap-2 rounded-xl bg-destructive/20 px-4 py-3 text-sm sm:mx-4 lg:mx-auto">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <span>
        {storageError}{' '}
        <Link to="/about" className="font-semibold underline">
          Back up your data
        </Link>
      </span>
    </div>
  )
}

function RouteError() {
  const error = useRouteError()
  const notFound = isRouteErrorResponse(error) && error.status === 404
  if (!notFound) console.error(error)
  return (
    <div className="felt grid min-h-dvh place-items-center px-6 text-center">
      <div className="max-w-md">
        <div className="text-5xl" aria-hidden>
          {notFound ? '🃏' : '♠'}
        </div>
        <h1 className="mt-4 text-3xl font-semibold">{notFound ? 'That card isn’t in the deck' : 'Something went wrong'}</h1>
        <p className="mt-2 text-muted-foreground">
          {notFound ? 'The page you’re looking for doesn’t exist.' : 'Your decks are safe. Reloading usually fixes this.'}
        </p>
        <div className="mt-6 flex justify-center gap-2">
          {!notFound && <Button onClick={() => window.location.reload()}>Reload</Button>}
          <Button variant={notFound ? 'default' : 'secondary'} onClick={() => (window.location.href = '/')}>
            Go home
          </Button>
        </div>
      </div>
    </div>
  )
}

function NotFound() {
  return (
    <div className="py-16 text-center">
      <div className="text-5xl" aria-hidden>
        🃏
      </div>
      <h1 className="mt-4 text-3xl font-semibold">That card isn&rsquo;t in the deck</h1>
      <Button asChild className="mt-6">
        <Link to="/">Back to decks</Link>
      </Button>
    </div>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <DeckList /> },
      { path: 'about', element: <AboutPage /> },
      { path: 'library', element: <LibraryPage /> },
      { path: 'decks/new', element: <NewDeckPage /> },
      { path: 'decks/generate', element: <GenerateDeckPage /> },
      { path: 'decks/:deckId', element: <DeckView /> },
      { path: 'decks/:deckId/edit', element: <EditDeckPage /> },
      { path: 'decks/:deckId/times', element: <DeckBestTimesPage /> },
      { path: 'decks/:deckId/cards/new', element: <AddCardPage /> },
      { path: 'cards/:cardId/edit', element: <EditCardPage /> },
      { path: 'study/card/:cardId/setup', element: <StudySetup /> },
      { path: 'study/deck/:deckId/setup', element: <StudySetup /> },
      { path: 'study/all/setup', element: <StudySetup /> },
      { path: 'study/card/:cardId', element: <StudySession /> },
      { path: 'study/deck/:deckId', element: <StudySession /> },
      { path: 'study/all', element: <StudySession /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

export default function App() {
  return (
    <ToastProvider>
      <DataProvider>
        <RouterProvider router={router} />
      </DataProvider>
    </ToastProvider>
  )
}
