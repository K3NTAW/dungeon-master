'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, Loader2, FileText, Package, MessageSquare } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
}

export default function OpenRouterChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState('openrouter/horizon-beta');
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState('chat');
  const [characterSheet, setCharacterSheet] = useState('');
  const [inventory, setInventory] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { 
      role: 'user', 
      content: input.trim(),
      id: Date.now().toString()
    };
    const newMessages = [...messages, userMessage];
    
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setError('');

    try {
      console.log('Sending message to OpenRouter:', { model, messageCount: newMessages.length });
      
      const response = await fetch('/api/openrouter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: newMessages,
          model,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('OpenRouter response:', data);
      
      const assistantMessage: Message = { 
        role: 'assistant', 
        content: data.content || 'No response received',
        id: (Date.now() + 1).toString()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      
      const errorMessage: Message = { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.',
        id: (Date.now() + 1).toString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError('');
    textareaRef.current?.focus();
  };

  const clearCharacterSheet = () => {
    setCharacterSheet('');
  };

  const clearInventory = () => {
    setInventory('');
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Dungeon Master</CardTitle>
              <CardDescription>
                AI-powered D&D assistant with character sheets and inventory
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Model (e.g., openrouter/horizon-beta)"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="chat" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="sheet" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Character Sheet
              </TabsTrigger>
              <TabsTrigger value="inventory" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Inventory
              </TabsTrigger>
            </TabsList>

            {/* Chat Tab */}
            <TabsContent value="chat" className="space-y-4 mt-4">
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
              
              <div className="border rounded-lg p-4 h-96 overflow-y-auto space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      Start a conversation with your AI Dungeon Master...
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Press Enter to send, Shift+Enter for new line
                    </p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  ))
                )}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted px-4 py-2 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <p className="text-sm">AI is thinking...</p>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="flex gap-2">
                <Textarea
                  ref={textareaRef}
                  placeholder="Ask your Dungeon Master anything..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1 min-h-[80px] resize-none"
                  disabled={isLoading}
                />
                <div className="flex flex-col gap-2">
                  <Button 
                    onClick={sendMessage} 
                    disabled={isLoading || !input.trim()}
                    className="self-end"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send
                      </>
                    )}
                  </Button>
                  {messages.length > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={clearChat}
                    >
                      Clear Chat
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Character Sheet Tab */}
            <TabsContent value="sheet" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Character Sheet</h3>
                {characterSheet && (
                  <Button variant="outline" size="sm" onClick={clearCharacterSheet}>
                    Clear Sheet
                  </Button>
                )}
              </div>
              <Textarea
                placeholder="Enter your character sheet details here...&#10;&#10;Example:&#10;Name: Gandalf the Grey&#10;Class: Wizard&#10;Level: 5&#10;Race: Human&#10;Background: Sage&#10;&#10;Ability Scores:&#10;STR: 10 (+0)&#10;DEX: 14 (+2)&#10;CON: 12 (+1)&#10;INT: 16 (+3)&#10;WIS: 14 (+2)&#10;CHA: 12 (+1)&#10;&#10;Skills: Arcana, History, Investigation, Religion&#10;Spells: Magic Missile, Fireball, Invisibility&#10;Equipment: Staff, Spellbook, Robes"
                value={characterSheet}
                onChange={(e) => setCharacterSheet(e.target.value)}
                className="min-h-[400px] resize-none"
              />
            </TabsContent>

            {/* Inventory Tab */}
            <TabsContent value="inventory" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Inventory</h3>
                {inventory && (
                  <Button variant="outline" size="sm" onClick={clearInventory}>
                    Clear Inventory
                  </Button>
                )}
              </div>
              <Textarea
                placeholder="Enter your inventory items here...&#10;&#10;Example:&#10;Weapons:&#10;- Longsword (1d8 slashing)&#10;- Shortbow (1d6 piercing)&#10;&#10;Armor:&#10;- Chain Mail (AC 16)&#10;&#10;Equipment:&#10;- Backpack&#10;- Bedroll&#10;- 50 feet of rope&#10;- 10 torches&#10;&#10;Treasure:&#10;- 25 gold pieces&#10;- 3 silver pieces&#10;- Ruby gemstone (50 gp)&#10;&#10;Magic Items:&#10;- Ring of Protection (+1 AC)&#10;- Potion of Healing"
                value={inventory}
                onChange={(e) => setInventory(e.target.value)}
                className="min-h-[400px] resize-none"
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 