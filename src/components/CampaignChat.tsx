'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, Loader2, FileText, Package, MessageSquare, Heart, Star } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import InlineDiceRoll from './InlineDiceRoll';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: any;
  created_at: string;
}

interface Character {
  id: string;
  name: string;
  class: string | null;
  level: number;
  race: string | null;
  experience_points: number;
  hit_points: number | null;
  max_hit_points: number | null;
  armor_class: number | null;
  ability_scores: any;
  skills: any;
  spells: any;
  equipment: any;
  inventory: any;
  conditions: any;
}

interface CampaignChatProps {
  campaignId: string;
  characterId?: string;
  sessionId?: string;
  onCharacterUpdate?: (character: Character) => void;
}

export default function CampaignChat({ 
  campaignId, 
  characterId, 
  sessionId, 
  onCharacterUpdate 
}: CampaignChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState('openrouter/horizon-beta');
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState('chat');
  const [character, setCharacter] = useState<Character | null>(null);
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

  // Load character data and messages
  useEffect(() => {
    if (characterId) {
      loadCharacter();
    }
    if (sessionId) {
      loadMessages();
    }
  }, [characterId, sessionId]);

  const loadCharacter = async () => {
    try {
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('id', characterId)
        .single();

      if (error) throw error;
      setCharacter(data);
      
      // Update character sheet and inventory displays
      setCharacterSheet(formatCharacterSheet(data));
      setInventory(formatInventory(data));
    } catch (error) {
      console.error('Error loading character:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Convert database messages to local format
      const localMessages: Message[] = data.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        metadata: msg.metadata,
        created_at: msg.created_at
      }));
      
      setMessages(localMessages);
      console.log('Loaded messages:', localMessages.length);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const formatCharacterSheet = (char: Character) => {
    return `Name: ${char.name}
Class: ${char.class || 'Unknown'}
Level: ${char.level}
Race: ${char.race || 'Unknown'}
Background: ${char.background || 'None'}

Ability Scores:
STR: ${char.ability_scores?.str || 10} (+${Math.floor((char.ability_scores?.str || 10) - 10) / 2})
DEX: ${char.ability_scores?.dex || 10} (+${Math.floor((char.ability_scores?.dex || 10) - 10) / 2})
CON: ${char.ability_scores?.con || 10} (+${Math.floor((char.ability_scores?.con || 10) - 10) / 2})
INT: ${char.ability_scores?.int || 10} (+${Math.floor((char.ability_scores?.int || 10) - 10) / 2})
WIS: ${char.ability_scores?.wis || 10} (+${Math.floor((char.ability_scores?.wis || 10) - 10) / 2})
CHA: ${char.ability_scores?.cha || 10} (+${Math.floor((char.ability_scores?.cha || 10) - 10) / 2})

Combat Stats:
HP: ${char.hit_points || 0}/${char.max_hit_points || 0}
AC: ${char.armor_class || 10}
XP: ${char.experience_points}

Skills: ${Array.isArray(char.skills) ? char.skills.join(', ') : 'None'}
Spells: ${Array.isArray(char.spells) ? char.spells.join(', ') : 'None'}
Equipment: ${Array.isArray(char.equipment) ? char.equipment.join(', ') : 'None'}`;
  };

  const formatInventory = (char: Character) => {
    return `Inventory:
${Array.isArray(char.inventory) ? char.inventory.join('\n') : 'Empty'}

Conditions:
${Array.isArray(char.conditions) ? char.conditions.join('\n') : 'None'}`;
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !sessionId) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);
    setError('');

    try {
      // Create context for AI
      const context = {
        campaignId,
        characterId,
        character: character ? {
          name: character.name,
          class: character.class,
          level: character.level,
          race: character.race,
          experience_points: character.experience_points,
          hit_points: character.hit_points,
          max_hit_points: character.max_hit_points,
          armor_class: character.armor_class,
          ability_scores: character.ability_scores,
          skills: character.skills,
          spells: character.spells,
          equipment: character.equipment,
          inventory: character.inventory,
          conditions: character.conditions
        } : null,
        messages: messages.map(m => ({ role: m.role, content: m.content }))
      };

      console.log('Sending message with context:', context);
      
      const response = await fetch('/api/campaign-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }],
          model,
          context,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Campaign chat response:', data);
      
      // Save user message to database
      const { data: userMessageData, error: userMessageError } = await supabase
        .from('messages')
        .insert([
          {
            session_id: sessionId,
            role: 'user',
            content: userMessage,
          },
        ])
        .select()
        .single();

      if (userMessageError) throw userMessageError;

      // Save assistant message to database
      const { data: assistantMessageData, error: assistantMessageError } = await supabase
        .from('messages')
        .insert([
          {
            session_id: sessionId,
            role: 'assistant',
            content: data.content || 'No response received',
            metadata: data.metadata,
          },
        ])
        .select()
        .single();

      if (assistantMessageError) throw assistantMessageError;

      // Add messages to local state
      setMessages(prev => [...prev, 
        {
          id: userMessageData.id,
          role: 'user',
          content: userMessage,
          created_at: userMessageData.created_at
        },
        {
          id: assistantMessageData.id,
          role: 'assistant',
          content: data.content || 'No response received',
          metadata: data.metadata,
          created_at: assistantMessageData.created_at
        }
      ]);

      // Handle character updates from AI response
      if (data.characterUpdates && characterId) {
        await updateCharacter(data.characterUpdates);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      
      // Save error message to database
      const { data: errorMessageData, error: errorMessageError } = await supabase
        .from('messages')
        .insert([
          {
            session_id: sessionId,
            role: 'assistant',
            content: 'Sorry, I encountered an error. Please try again.',
          },
        ])
        .select()
        .single();

      if (!errorMessageError) {
        setMessages(prev => [...prev, {
          id: errorMessageData.id,
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          created_at: errorMessageData.created_at
        }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updateCharacter = async (updates: any) => {
    try {
      console.log('Updating character with:', updates);
      
      const { data, error } = await supabase
        .from('characters')
        .update(updates)
        .eq('id', characterId)
        .select()
        .single();

      if (error) throw error;

      setCharacter(data);
      setCharacterSheet(formatCharacterSheet(data));
      setInventory(formatInventory(data));
      
      // Notify parent component
      if (onCharacterUpdate) {
        onCharacterUpdate(data);
      }

      // Add system message about the update
      try {
        const { data: updateMessageData, error: updateMessageError } = await supabase
          .from('messages')
          .insert([
            {
              session_id: sessionId,
              role: 'system',
              content: `Character updated: ${Object.keys(updates).join(', ')}`,
              metadata: { type: 'character_update', updates },
            },
          ])
          .select()
          .single();

        if (!updateMessageError) {
          setMessages(prev => [...prev, {
            id: updateMessageData.id,
            role: 'system',
            content: `Character updated: ${Object.keys(updates).join(', ')}`,
            metadata: { type: 'character_update', updates },
            created_at: updateMessageData.created_at
          }]);
        }
      } catch (error) {
        console.error('Error saving character update message:', error);
      }

    } catch (error) {
      console.error('Error updating character:', error);
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

  const handleDiceRoll = async (diceType: string, reason: string, result: number) => {
    if (!sessionId) return;
    
    try {
      // Save the dice roll result
      const { data: diceMessageData, error: diceMessageError } = await supabase
        .from('messages')
        .insert([
          {
            session_id: sessionId,
            role: 'system',
            content: `🎲 ${diceType} (${reason}): ${result}`,
            metadata: { type: 'dice_roll', diceType, reason, result },
          },
        ])
        .select()
        .single();

      if (!diceMessageError) {
        setMessages(prev => [...prev, {
          id: diceMessageData.id,
          role: 'system',
          content: `🎲 ${diceType} (${reason}): ${result}`,
          metadata: { type: 'dice_roll', diceType, reason, result },
          created_at: diceMessageData.created_at
        }]);

        // Send the dice roll result to the AI so it can react
        await sendDiceResultToAI(diceType, reason, result);
      }
    } catch (error) {
      console.error('Error saving dice roll:', error);
    }
  };

  const sendDiceResultToAI = async (diceType: string, reason: string, result: number) => {
    try {
      const response = await fetch('/api/campaign-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, { role: 'system', content: `Dice roll result: ${diceType} (${reason}) = ${result}` }],
          model,
          context: {
            campaignId,
            characterId,
            character: character ? {
              name: character.name,
              class: character.class,
              level: character.level,
              race: character.race,
              experience_points: character.experience_points,
              hit_points: character.hit_points,
              max_hit_points: character.max_hit_points,
              armor_class: character.armor_class,
              ability_scores: character.ability_scores,
              skills: character.skills,
              spells: character.spells,
              equipment: character.equipment,
              inventory: character.inventory,
              conditions: character.conditions
            } : null,
            messages: messages.map(m => ({ role: m.role, content: m.content }))
          },
          diceResult: { diceType, reason, result }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.content) {
        // Save AI response to database
        const { data: aiMessageData, error: aiMessageError } = await supabase
          .from('messages')
          .insert([
            {
              session_id: sessionId,
              role: 'assistant',
              content: data.content,
              metadata: data.metadata,
            },
          ])
          .select()
          .single();

        if (!aiMessageError) {
          setMessages(prev => [...prev, {
            id: aiMessageData.id,
            role: 'assistant',
            content: data.content,
            metadata: data.metadata,
            created_at: aiMessageData.created_at
          }]);
        }

        // Handle character updates from AI response
        if (data.characterUpdates && characterId) {
          await updateCharacter(data.characterUpdates);
        }
      }

    } catch (error) {
      console.error('Error sending dice result to AI:', error);
    }
  };

  const renderMessageContent = (content: string, metadata?: any) => {
    // Check if the message contains dice roll requests
    const diceRollRegex = /\[DICE:([^:]+):([^\]]+)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = diceRollRegex.exec(content)) !== null) {
      // Add text before the dice roll
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }

      // Add the dice roll component
      const diceType = match[1];
      const reason = match[2];
      parts.push(
        <InlineDiceRoll
          key={`dice-${match.index}`}
          diceType={diceType}
          reason={reason}
          onRoll={(result) => handleDiceRoll(diceType, reason, result)}
          className="my-2"
        />
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }

    return parts.length > 0 ? parts : content;
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Dungeon Master</CardTitle>
              <CardDescription>
                AI-powered D&D assistant with real-time character updates
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
                      Start your adventure with the AI Dungeon Master...
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      The AI can update your character stats, inventory, and experience!
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
                            : message.role === 'system'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-muted'
                        }`}
                      >
                        <div className="text-sm whitespace-pre-wrap">
                          {renderMessageContent(message.content, message.metadata)}
                        </div>
                        {message.metadata && (
                          <p className="text-xs opacity-70 mt-1">
                            {message.metadata.type === 'character_update' && '📊 Character Updated'}
                            {message.metadata.type === 'dice_roll' && '🎲 Dice Roll'}
                          </p>
                        )}
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
                  placeholder="Tell the DM what you want to do..."
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
                {character && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Heart className="h-4 w-4" />
                    <span>HP: {character.hit_points || 0}/{character.max_hit_points || 0}</span>
                    <Star className="h-4 w-4" />
                    <span>XP: {character.experience_points}</span>
                  </div>
                )}
              </div>
              <Textarea
                value={characterSheet}
                onChange={(e) => setCharacterSheet(e.target.value)}
                className="min-h-[400px] resize-none font-mono text-sm"
                readOnly
              />
            </TabsContent>

            {/* Inventory Tab */}
            <TabsContent value="inventory" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Inventory & Conditions</h3>
              </div>
              <Textarea
                value={inventory}
                onChange={(e) => setInventory(e.target.value)}
                className="min-h-[400px] resize-none font-mono text-sm"
                readOnly
              />
            </TabsContent>


          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 