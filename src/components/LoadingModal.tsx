import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'

interface LoadingModalProps {
  open: boolean
  message?: string
}

export default function LoadingModal({ open, message = 'Generating with AI...' }: LoadingModalProps) {
  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        className="max-w-sm p-0 overflow-hidden border-border/60 bg-background shadow-2xl"
      >
        <div
          className="flex flex-col items-center gap-4 sm:gap-5 p-7 sm:p-8 text-center bg-gradient-to-b from-background to-muted/40"
          role="status"
          aria-busy="true"
        >
          <div className="h-14 w-14 rounded-full grid place-items-center bg-primary/10 ring-1 ring-primary/25 shadow-sm">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
          <p className="text-base sm:text-lg font-medium text-foreground">{message}</p>
          <p className="text-sm text-muted-foreground">This can take a few seconds.</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
