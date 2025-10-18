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
        <div className="flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium text-foreground">{message}</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
