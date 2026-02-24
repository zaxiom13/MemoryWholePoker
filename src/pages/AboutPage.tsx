import BackBar from '@/components/BackBar'

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-4 px-3 sm:px-4 md:px-0">
      <BackBar to="/" title="About MemoryWholed" />
      <div className="playing-card p-4 sm:p-5 space-y-4 text-sm sm:text-base text-black/80">
        <section>
          <div className="font-medium text-black">What it is</div>
          <p>
            MemoryWholed helps you practice verbatim recall. Create decks, add cards
            with text you want to memorize, and run timed typing sessions.
          </p>
        </section>
        <section>
          <div className="font-medium text-black">Study options</div>
          <ul className="list-disc list-inside space-y-1">
            <li>Ghost Text: faintly shows the next few characters if you pause.</li>
            <li>See Full Text: displays the full target text above the input.</li>
            <li>Autocorrect: ignores case mismatches and auto-inserts punctuation.</li>
          </ul>
        </section>
        <section>
          <div className="font-medium text-black">Tracking</div>
          <p>Best times are saved locally in your browser.</p>
        </section>
      </div>
    </div>
  )
}
