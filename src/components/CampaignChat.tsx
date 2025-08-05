'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Send, Loader2, FileText, Package, MessageSquare, Heart, Star, Dices } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { InventoryManager } from '@/lib/inventory';
import { CombatManager } from '@/lib/combat';
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
  background: string | null;
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
  const [pendingRolls, setPendingRolls] = useState<Array<{diceType: string, reason: string, result?: number}>>([]);
  const [isWaitingForRolls, setIsWaitingForRolls] = useState(false);
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
    // Calculate combat stats
    const dexMod = Math.floor((char.ability_scores?.dex || 10) - 10) / 2;
    const attackBonus = CombatManager.calculateAttackBonus(char.ability_scores, char.class);
    const movementSpeed = CombatManager.calculateMovementSpeed(30, char.equipment, char.conditions);
    const availableActions = CombatManager.getAvailableActions(char.equipment, char.inventory, char.ability_scores);

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
Initiative: +${dexMod}
Movement: ${movementSpeed} feet
Attack Bonus: Melee +${attackBonus.melee}, Ranged +${attackBonus.ranged}, Spell +${attackBonus.spell}
XP: ${char.experience_points}

Available Combat Actions:
${availableActions.join(', ')}

Skills: ${Array.isArray(char.skills) ? char.skills.join(', ') : 'None'}
Spells: ${Array.isArray(char.spells) ? char.spells.join(', ') : 'None'}
Equipment: ${Array.isArray(char.equipment) ? char.equipment.join(', ') : 'None'}`;
  };

  const formatInventory = (char: Character) => {
    return `Inventory:
${InventoryManager.formatInventory(char.inventory)}

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
      
      // Handle smart inventory updates
      let processedUpdates = { ...updates };
      
      if (updates.inventory_add || updates.inventory_remove) {
        // Get current character data to work with existing inventory
        const { data: currentCharacter, error: fetchError } = await supabase
          .from('characters')
          .select('inventory')
          .eq('id', characterId)
          .single();

        if (fetchError) throw fetchError;

        // Use InventoryManager to process updates
        const updatedInventory = InventoryManager.processInventoryUpdates(
          currentCharacter.inventory || [],
          updates
        );
        
        // Create new object with processed inventory
        processedUpdates = {
          ...processedUpdates,
          inventory: updatedInventory
        };
        delete processedUpdates.inventory_add;
        delete processedUpdates.inventory_remove;
        
        console.log('Smart inventory update:', {
          original: currentCharacter.inventory,
          added: updates.inventory_add,
          removed: updates.inventory_remove,
          final: updatedInventory
        });
      }
      
      const { data, error } = await supabase
        .from('characters')
        .update(processedUpdates)
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
        const updateDescription = [];
        if (updates.inventory_add) updateDescription.push(`Added: ${updates.inventory_add.join(', ')}`);
        if (updates.inventory_remove) updateDescription.push(`Removed: ${updates.inventory_remove.join(', ')}`);
        if (updates.experience_points) updateDescription.push(`XP: ${updates.experience_points > 0 ? '+' : ''}${updates.experience_points}`);
        if (updates.hit_points) updateDescription.push(`HP: ${updates.hit_points > 0 ? '+' : ''}${updates.hit_points}`);
        if (updates.conditions) updateDescription.push(`Conditions: ${updates.conditions.join(', ')}`);
        
        const updateMessage = updateDescription.length > 0 ? updateDescription.join(', ') : Object.keys(processedUpdates).join(', ');
        
        const { data: updateMessageData, error: updateMessageError } = await supabase
          .from('messages')
          .insert([
            {
              session_id: sessionId,
              role: 'system',
              content: `Character updated: ${updateMessage}`,
              metadata: { type: 'character_update', updates: processedUpdates },
            },
          ])
          .select()
          .single();

        if (!updateMessageError) {
          setMessages(prev => [...prev, {
            id: updateMessageData.id,
            role: 'system',
            content: `Character updated: ${updateMessage}`,
            metadata: { type: 'character_update', updates: processedUpdates },
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

        // Check if we're in a multi-roll sequence
        if (isWaitingForRolls && pendingRolls.length > 0) {
          // Update the pending roll with the result
          const updatedPendingRolls = pendingRolls.map(roll => 
            roll.diceType === diceType && roll.reason === reason 
              ? { ...roll, result } 
              : roll
          );
          
          setPendingRolls(updatedPendingRolls);
          
          // Check if all rolls are complete
          const allRollsComplete = updatedPendingRolls.every(roll => roll.result !== undefined);
          
          if (allRollsComplete) {
            // Send all roll results to AI (filter out undefined results)
            const completedRolls = updatedPendingRolls.filter(roll => roll.result !== undefined) as Array<{diceType: string, reason: string, result: number}>;
            await sendMultiRollResultsToAI(completedRolls);
            
            // Reset pending rolls
            setPendingRolls([]);
            setIsWaitingForRolls(false);
          }
        } else {
          // Single roll - send immediately
          await sendDiceResultToAI(diceType, reason, result);
        }
      }
    } catch (error) {
      console.error('Error saving dice roll:', error);
    }
  };

  const sendMultiRollResultsToAI = async (rolls: Array<{diceType: string, reason: string, result: number}>) => {
    try {
      const rollResultsText = rolls.map(roll => `${roll.diceType} (${roll.reason}) = ${roll.result}`).join(', ');
      
      const response = await fetch('/api/campaign-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, { role: 'system', content: `Multi-roll results: ${rollResultsText}` }],
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
          multiRollResults: rolls
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

          // Handle character updates
          if (data.characterUpdates && characterId) {
            await updateCharacter(data.characterUpdates);
          }
        }
      }
    } catch (error) {
      console.error('Error sending multi-roll results to AI:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
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

  const renderMessageContent = (content: string, _metadata?: any) => {
    // Check if the message contains dice roll requests
    const diceRollRegex = /\[DICE:([^:]+):([^\]]+)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    const foundRolls: Array<{diceType: string, reason: string}> = [];

    while ((match = diceRollRegex.exec(content)) !== null) {
      // Add text before the dice roll
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }

      // Add the dice roll component
      const diceType = match[1];
      const reason = match[2];
      foundRolls.push({ diceType, reason });
      
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

    // Set up multi-roll sequence if multiple rolls are found
    if (foundRolls.length > 1 && !isWaitingForRolls) {
      setPendingRolls(foundRolls.map(roll => ({ ...roll, result: undefined })));
      setIsWaitingForRolls(true);
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
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="chat" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="sheet" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Character Sheet
              </TabsTrigger>
              <TabsTrigger value="combat" className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                Combat
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
                
                {isWaitingForRolls && pendingRolls.length > 0 && (
                  <div className="flex justify-start">
                    <div className="bg-blue-100 border border-blue-200 px-4 py-2 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Dices className="h-4 w-4 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium text-blue-800">
                            Waiting for {pendingRolls.filter(roll => roll.result === undefined).length} more roll{pendingRolls.filter(roll => roll.result === undefined).length !== 1 ? 's' : ''}...
                          </p>
                          <p className="text-xs text-blue-600">
                            {pendingRolls.map(roll => 
                              roll.result !== undefined 
                                ? `✅ ${roll.diceType} (${roll.reason}): ${roll.result}`
                                : `⏳ ${roll.diceType} (${roll.reason})`
                            ).join(', ')}
                          </p>
                        </div>
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

            {/* Combat Tab */}
            <TabsContent value="combat" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Combat Information</h3>
                {character && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Heart className="h-4 w-4" />
                    <span>HP: {character.hit_points || 0}/{character.max_hit_points || 0}</span>
                    <span>AC: {character.armor_class || 10}</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Combat Stats</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {character && (
                      <>
                        <div className="flex justify-between">
                          <span>Initiative:</span>
                          <span>+{Math.floor((character.ability_scores?.dex || 10) - 10) / 2}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Movement:</span>
                          <span>{CombatManager.calculateMovementSpeed(30, character.equipment, character.conditions)} feet</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Melee Attack:</span>
                          <span>+{CombatManager.calculateAttackBonus(character.ability_scores, character.class).melee}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Ranged Attack:</span>
                          <span>+{CombatManager.calculateAttackBonus(character.ability_scores, character.class).ranged}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Spell Attack:</span>
                          <span>+{CombatManager.calculateAttackBonus(character.ability_scores, character.class).spell}</span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Available Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {character ? (
                      <div className="space-y-1 text-sm">
                        {CombatManager.getAvailableActions(character.equipment, character.inventory, character.ability_scores).map((action, index) => (
                          <div key={index} className="px-2 py-1 bg-muted rounded text-xs">
                            {action}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">No character loaded</p>
                    )}
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Equipment Validation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p className="text-muted-foreground">
                      The AI will check your equipment before allowing actions. You cannot:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Use shield bash without a shield</li>
                      <li>Two-weapon fight without two weapons</li>
                      <li>Cast spells without components</li>
                      <li>Use ranged weapons without ammunition</li>
                      <li>Wear heavy armor without sufficient Strength</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
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