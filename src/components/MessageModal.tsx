import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface MessageModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  message: string
  buttonLabel?: string
}

export default function MessageModal({
  open,
  onOpenChange,
  title,
  message,
  buttonLabel = 'OK',
}: MessageModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>{buttonLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
