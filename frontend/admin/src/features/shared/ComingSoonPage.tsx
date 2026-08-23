import { Construction } from 'lucide-react'

interface ComingSoonPageProps {
  title: string
  description?: string
}

export default function ComingSoonPage({ title, description }: ComingSoonPageProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">{title}</h2>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>
      <div className="rounded-lg border bg-muted/30 p-16 text-center">
        <Construction className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
        <p className="text-sm font-medium text-muted-foreground">Halaman ini sedang dalam pengembangan</p>
        <p className="text-xs text-muted-foreground mt-1">Akan segera tersedia</p>
      </div>
    </div>
  )
}
