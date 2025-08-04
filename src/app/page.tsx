import OpenRouterChat from '@/components/OpenRouterChat';

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight">Dungeon Master</h1>
          <p className="text-muted-foreground mt-2">
            AI-powered chat interface using OpenRouter
          </p>
        </div>
        <OpenRouterChat />
      </div>
    </main>
  );
}
