import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Info } from 'lucide-react'

export default function InfoButton() {
  return (
    <Button
      size="icon"
      variant="ghost"
      className="rounded-full hover:bg-white/10 text-white/90 hover:text-white"
      aria-label="About MemoryWholed"
      title="About MemoryWholed"
      asChild
    >
      <Link to="/about">
        <Info className="h-5 w-5" />
      </Link>
    </Button>
  )
}
