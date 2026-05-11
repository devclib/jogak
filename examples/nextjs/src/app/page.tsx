import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

export default function Home() {
  return (
    <main className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Jogak × Next.js Example</h1>
      <p className="text-sm text-muted-foreground">
        Server Component(Badge)와 Client Component(Button)를 함께 쇼케이스합니다.
      </p>
      <div className="flex gap-2">
        <Badge>New</Badge>
        <Button>Save</Button>
      </div>
    </main>
  )
}
