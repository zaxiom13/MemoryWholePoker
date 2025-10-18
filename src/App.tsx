import { createBrowserRouter, Link, Outlet, RouterProvider } from 'react-router-dom'
import DeckList from '@/pages/DeckList'
import DeckView from '@/pages/DeckView'
import StudySetup from '@/pages/StudySetup'
import StudySession from '@/pages/StudySession'
import { DataProvider } from '@/contexts/DataContext'
import Header from '@/components/Header'
import BackgroundGraph from '@/components/BackgroundGraph'
import PageTransition from '@/components/PageTransition'
import { Button } from '@/components/ui/button'

function Layout() {
  return (
    <div className="relative min-h-screen font-sans poker-room">
      <div className="relative z-10">
        <Header />
        <div className="poker-table mx-auto">
          <div className="wood-rim">
            <div className="felt">
              <BackgroundGraph
                scope="container"
                intensity={1.6}
                className="bg-network--debug z-[1]"
                lineColor="oklch(0.68 0.22 240)"
                dotColor="oklch(0.74 0.21 240)"
              />
              <main className="table-content">
                <PageTransition>
                  <Outlet />
                </PageTransition>
              </main>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <DeckList /> },
      { path: 'decks/:deckId', element: <DeckView /> },
      { path: 'study/card/:cardId/setup', element: <StudySetup /> },
      { path: 'study/deck/:deckId/setup', element: <StudySetup /> },
      { path: 'study/card/:cardId', element: <StudySession /> },
      { path: 'study/deck/:deckId', element: <StudySession /> },
      { path: 'done', element: <Done /> },
    ],
  },
])

  function Done() {
    const { state } = (window as any).history
  // react-router puts navigation state at history.state.usr
  const usr = state?.usr || {}
  const elapsed = typeof usr.elapsed === 'number' ? usr.elapsed : undefined
  const mode = usr.mode as 'card' | 'deck' | undefined
  const title = usr.title as string | undefined
  const assistance = usr.assistance as { ghostText: boolean; fullText: boolean; autocorrect: boolean } | undefined
  const flags = assistance ? ['ghostText', 'fullText', 'autocorrect'].filter((k) => (assistance as any)[k]).join(', ') : undefined
  return (
    <div className="max-w-xl mx-auto text-center space-y-5 sm:space-y-6 px-3 sm:px-4 py-10 sm:py-12">
      <h1 className="text-3xl sm:text-4xl font-bold">Great job!</h1>
      {elapsed != null && (
        <p className="text-lg sm:text-xl leading-relaxed">
          Completed {mode === 'deck' ? 'deck' : 'card'} {title ? `"${title}" ` : ''}in <strong>{format(elapsed)}</strong>{flags ? ` (assistance: ${flags})` : ''}.
        </p>
      )}
      <div className="flex items-center justify-center gap-3 pt-6">
        <Button asChild className="w-full sm:w-auto min-h-[44px] text-base">
          <Link to="/"><span>Back to Decks</span></Link>
        </Button>
      </div>
    </div>
  )
}

function format(ms: number) {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function App() {
  return (
    <DataProvider>
      <RouterProvider router={router} />
    </DataProvider>
  )
}
