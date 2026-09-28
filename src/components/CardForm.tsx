import { useId, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { countWords } from '@/lib/studyInput'

export type CardDraft = { title: string; content: string }

export default function CardForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  onSubmitAnother,
}: {
  initial?: CardDraft
  submitLabel: string
  onSubmit: (draft: CardDraft) => void
  onCancel: () => void
  /** When provided, shows "Save & add another" which clears the form after saving. */
  onSubmitAnother?: (draft: CardDraft) => void
}) {
  const id = useId()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [content, setContent] = useState(initial?.content ?? '')
  const [touched, setTouched] = useState(false)
  const titleRef = useRef<HTMLInputElement | null>(null)
  const valid = content.trim().length > 0
  const words = countWords(content)

  function draft(): CardDraft {
    return { title: title.trim(), content: content.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '').trim() }
  }

  function submit(another: boolean) {
    setTouched(true)
    if (!valid) return
    if (another && onSubmitAnother) {
      onSubmitAnother(draft())
      setTitle('')
      setContent('')
      setTouched(false)
      titleRef.current?.focus()
    } else {
      onSubmit(draft())
    }
  }

  return (
    <form
      className="playing-card grid gap-5 p-5 sm:p-7"
      onSubmit={(e) => {
        e.preventDefault()
        submit(false)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault()
          submit(false)
        }
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor={`${id}-title`} className="text-base font-semibold">
          Prompt
        </Label>
        <Input
          ref={titleRef}
          id={`${id}-title`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Hamlet's soliloquy, opening"
          className="h-12 bg-card text-base"
          maxLength={160}
          autoComplete="off"
          enterKeyHint="next"
        />
        <p className="text-sm text-muted-foreground">Shown while you type. A title, a question, or a cue.</p>
      </div>
      <div className="grid gap-2">
        <div className="flex items-end justify-between gap-2">
          <Label htmlFor={`${id}-content`} className="text-base font-semibold">
            Text to memorize
          </Label>
          <span className="text-xs text-muted-foreground tabular-nums">
            {words} word{words === 1 ? '' : 's'} · {content.length} chars
          </span>
        </div>
        <Textarea
          id={`${id}-content`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type or paste the exact text. Line breaks are kept."
          className="min-h-44 bg-card font-read text-lg leading-relaxed"
          aria-invalid={touched && !valid}
          maxLength={20000}
        />
        {touched && !valid && <p className="text-sm font-medium text-destructive">Add some text to memorize.</p>}
      </div>
      <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancel
        </Button>
        {onSubmitAnother && (
          <Button variant="outline" type="button" onClick={() => submit(true)}>
            Save &amp; add another
          </Button>
        )}
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  )
}
