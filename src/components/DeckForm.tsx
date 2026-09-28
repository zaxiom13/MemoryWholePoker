import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export type DeckDraft = { name: string; description: string }

export default function DeckForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: DeckDraft
  submitLabel: string
  onSubmit: (draft: DeckDraft) => void
  onCancel: () => void
}) {
  const id = useId()
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const valid = name.trim().length > 0

  return (
    <form
      className="playing-card grid gap-5 p-5 sm:p-7"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) onSubmit({ name: name.trim(), description: description.trim() })
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor={`${id}-name`} className="text-base font-semibold">
          Name
        </Label>
        <Input
          id={`${id}-name`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Favourite poems"
          className="h-12 bg-card text-base"
          maxLength={80}
          autoFocus
          autoComplete="off"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-desc`} className="text-base font-semibold">
          Description <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id={`${id}-desc`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What's in this deck?"
          className="min-h-24 bg-card text-base"
          maxLength={300}
        />
      </div>
      <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!valid}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
