import { Chatbot } from '@/components/chatbot';

export default function Home() {
  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <div className="w-full max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            💬 Dcastalia Chatbot
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            A powerful chatbot powered by LangChain + Next.js, built using live data from{' '}
            <a
              href="https://dcastalia.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-medium"
            >
              dcastalia.com
            </a>
          </p>
        </div>
        
        <Chatbot />
        
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            Developed By Dcastalia
          </p>
        </div>
      </div>
    </div>
  );
}