import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Wifi } from 'lucide-react'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 text-center px-4">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
        <Wifi className="h-10 w-10 text-muted-foreground" />
      </div>

      <div className="space-y-2">
        <h1 className="text-7xl font-bold tracking-tighter">404</h1>
        <h2 className="text-xl font-semibold">Halaman tidak ditemukan</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          Halaman yang kamu cari tidak ada atau telah dipindahkan.
        </p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali
        </Button>
        <Button onClick={() => navigate('/dashboard')}>
          Ke Dashboard
        </Button>
      </div>
    </div>
  )
}
