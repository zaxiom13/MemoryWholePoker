import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Info } from 'lucide-react'

export default function InfoButton() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="rounded-full hover:bg-white/10 text-white/90 hover:text-white"
          aria-label="About MemoryWholed"
          title="About MemoryWholed"
        >
          <Info className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>About MemoryWholed</DialogTitle>
          <DialogDescription>
            A lightweight app for memorizing poems, speeches, and other prose using typed recall.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm text-black/80">
          <section>
            <div className="font-medium text-black">What it is</div>
            <p>
              MemoryWholed helps you practice verbatim recall. Create decks, add cards
              with text you want to memorize, and run timed typing sessions that accept
              only correct characters.
            </p>
          </section>

          <section>
            <div className="font-medium text-black">How to use</div>
            <ul className="list-disc list-inside space-y-1">
              <li>On Decks, click <span className="font-medium">New Deck</span> to create a deck.</li>
              <li>Inside a deck, use <span className="font-medium">Add Card</span> to add title + content.</li>
              <li>
                Optional: <span className="font-medium">Generate with AI</span> to create cards from a prompt
                (set <code>VITE_GEMINI_API_KEY</code> in your environment, e.g., in Netlify).
              </li>
              <li>
                Start a session with <span className="font-medium">Study Deck</span> (all cards) or a card’s
                <span className="font-medium"> Study</span> button.
              </li>
            </ul>
          </section>

          <section>
            <div className="font-medium text-black">Study options</div>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <span className="font-medium">Ghost Text</span>: faintly shows the next few characters if you pause.
              </li>
              <li>
                <span className="font-medium">See Full Text</span>: displays the full target text above the input.
              </li>
              <li>
                <span className="font-medium">Autocorrect</span>: ignores case mismatches and auto-inserts punctuation.
              </li>
            </ul>
            <p className="mt-1 text-black/70">
              Options apply only to the current session. Timer starts on your first keystroke.
            </p>
          </section>

          <section>
            <div className="font-medium text-black">During study</div>
            <ul className="list-disc list-inside space-y-1">
              <li>Only correct characters are accepted; backspace is disabled.</li>
              <li>For multi-card sessions, progress and elapsed time show in the header.</li>
              <li>Completion records a time for each card and the whole deck.</li>
            </ul>
          </section>

          <section>
            <div className="font-medium text-black">Tracking & best times</div>
            <ul className="list-disc list-inside space-y-1">
              <li>Best times are saved locally and shown via the trophy icon on decks.</li>
              <li>Editing a deck’s cards resets that deck’s best times.</li>
            </ul>
          </section>

          <section>
            <div className="font-medium text-black">Tips</div>
            <ul className="list-disc list-inside space-y-1">
              <li>Use <span className="font-medium">Load Default Decks</span> on the Decks page to try samples.</li>
              <li>Content is stored in your browser locally; no account required.</li>
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}

