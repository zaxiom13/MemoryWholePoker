import { Link } from 'react-router-dom'
// Removed Text component usage
import InfoButton from '@/components/InfoButton'

type HeaderProps = {
  onNavigateHome?: () => void
}

export default function Header(props: HeaderProps) {
  return (
    <header className="table-header animate-in fade-in-0 slide-in-from-top-2 duration-300">
      <div className="container mx-auto flex items-center justify-between px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
        {props.onNavigateHome ? (
          <button className="brand" onClick={props.onNavigateHome}>
            <span>MemoryWholed</span>
          </button>
        ) : (
          <Link to="/" className="brand">
            <span>MemoryWholed</span>
          </Link>
        )}
        <nav className="flex items-center gap-2 flex-shrink-0">
          <InfoButton />
        </nav>
      </div>
    </header>
  )
}
