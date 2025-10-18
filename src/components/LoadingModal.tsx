import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'

interface LoadingModalProps {
  open: boolean
  message?: string
}

export default function LoadingModal({ open, message = 'Generating with AI...' }: LoadingModalProps) {
  return (
    <Dialog open={open}>
      <DialogContent className="border-0 bg-transparent shadow-none flex items-center justify-center">
        <div
          className="flex flex-col items-center gap-4 sm:gap-5 p-6 sm:p-8 rounded-2xl border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-2xl ring-1 ring-border max-w-sm w-full text-center"
          role="status"
          aria-busy="true"
        >
          <div className="h-14 w-14 rounded-full grid place-items-center bg-primary/10 ring-1 ring-primary/20">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
          <p className="text-base sm:text-lg font-medium text-foreground">{message}</p>
          <p className="text-sm text-muted-foreground">This can take a few seconds.</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
