import { Link } from 'react-router-dom'
import { Flame, Info, Volume2, VolumeX } from 'lucide-react'
import { useData } from '@/contexts/DataContext'
import { setPrefs, usePrefs } from '@/lib/prefs'

export default function Header() {
  const { state } = useData()
  const { sound } = usePrefs()
  const { chips, streak } = state.profile

  return (
    <header className="rail">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4 sm:h-16">
        <Link to="/" className="flex min-w-0 items-center gap-2 rounded-lg" aria-label="MemoryWholed home">
          <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-[oklch(0.97_0.01_90)] font-display text-lg leading-none text-[oklch(0.22_0.02_260)] shadow-md">♠</span>
          <span className="brand truncate text-xl sm:text-2xl">MemoryWholed</span>
        </Link>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1.5 text-sm font-semibold tabular-nums" title={`${chips.toLocaleString()} chips won`}>
            <span className="chip-coin text-[0.8rem]" aria-hidden />
            <span>{chips.toLocaleString()}</span>
            <span className="sr-only">chips</span>
          </div>
          {streak > 0 && (
            <div className="hidden items-center gap-1 rounded-full bg-black/25 px-3 py-1.5 text-sm font-semibold tabular-nums min-[380px]:flex" title={`${streak}-day streak`}>
              <Flame className="size-4 text-orange-300" aria-hidden />
              <span>{streak}</span>
              <span className="sr-only">day streak</span>
            </div>
          )}
          <button
            className="grid size-10 place-items-center rounded-full text-white/85 hover:bg-white/10 hover:text-white"
            onClick={() => setPrefs({ sound: !sound })}
            aria-label={sound ? 'Mute sounds' : 'Unmute sounds'}
            aria-pressed={!sound}
            title={sound ? 'Mute sounds' : 'Unmute sounds'}
          >
            {sound ? <Volume2 className="size-5" /> : <VolumeX className="size-5" />}
          </button>
          <Link to="/about" className="grid size-10 place-items-center rounded-full text-white/85 hover:bg-white/10 hover:text-white" aria-label="How to play & settings" title="How to play & settings">
            <Info className="size-5" />
          </Link>
        </div>
      </div>
    </header>
  )
}
