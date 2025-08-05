'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Send, Loader2, FileText, Package, MessageSquare, Heart, Star, Dices, Volume2, VolumeX } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { InventoryManager } from '@/lib/inventory';
import { CombatManager } from '@/lib/combat';
import { ElevenLabsManager } from '@/lib/elevenlabs';
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
  partyCharacterIds?: string[];
  onCharacterUpdate?: (character: Character) => void;
}

export default function CampaignChat({ 
  campaignId, 
  characterId, 
  sessionId, 
  partyCharacterIds = [],
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
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('VR6AewLTigWG4xSOukaG'); // Default to Arnold (deep, dramatic)
  const [availableVoices, setAvailableVoices] = useState<any[]>([]);
  const [voiceSettings, setVoiceSettings] = useState({
    stability: 0.3,
    similarity_boost: 0.85,
    style: 0.8,
    use_speaker_boost: true
  });
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

  // Load voices on mount
  useEffect(() => {
    loadVoices();
  }, []);

  // Handle voice synthesis for new AI messages
  useEffect(() => {
    if (isVoiceEnabled && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant' && lastMessage.content) {
        // Clean the content for speech (remove dice roll placeholders)
        const cleanContent = lastMessage.content.replace(/\[DICE:[^\]]+\]/g, '');
        if (cleanContent.trim()) {
          speakText(cleanContent);
        }
      }
    }
  }, [messages, isVoiceEnabled, selectedVoiceId]);

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
        partyCharacterIds,
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

  const speakText = async (text: string) => {
    if (!isVoiceEnabled || !ElevenLabsManager.isAvailable()) return;

    try {
      setIsSpeaking(true);
      await ElevenLabsManager.speakText(text, selectedVoiceId, voiceSettings);
    } catch (error) {
      console.error('Error speaking text:', error);
      setError('Failed to generate speech. Please check your ElevenLabs API key.');
    } finally {
      setIsSpeaking(false);
    }
  };

  const stopSpeaking = () => {
    ElevenLabsManager.stopAudio();
    setIsSpeaking(false);
  };

  const toggleVoice = () => {
    if (isVoiceEnabled) {
      stopSpeaking();
    }
    setIsVoiceEnabled(!isVoiceEnabled);
  };

  const loadVoices = async () => {
    try {
      const voices = await ElevenLabsManager.getVoices();
      setAvailableVoices(voices);
    } catch (error) {
      console.error('Error loading voices:', error);
    }
  };

  const testElevenLabs = async () => {
    try {
      const response = await fetch('/api/elevenlabs-test');
      const data = await response.json();
      console.log('ElevenLabs test result:', data);
      
      if (data.status === 'working') {
        setError('');
        alert(`✅ ElevenLabs is working! Found ${data.voiceCount} voices.`);
      } else {
        setError(`❌ ElevenLabs test failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Error testing ElevenLabs:', error);
      setError('Failed to test ElevenLabs API');
    }
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
            partyCharacterIds,
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
            partyCharacterIds,
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
      
      // Add character context to the dice roll
      const characterContext = character ? ` (${character.name})` : '';
      const enhancedReason = reason + characterContext;
      
      parts.push(
        <InlineDiceRoll
          key={`dice-${match.index}`}
          diceType={diceType}
          reason={enhancedReason}
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
    // Only do this if there are multiple rolls AND we're not already waiting for rolls
    if (foundRolls.length > 1 && !isWaitingForRolls) {
      // Check if these are related rolls (like attack + damage) vs separate options
      const isRelatedRolls = foundRolls.every(roll => 
        roll.reason.toLowerCase().includes('attack') || 
        roll.reason.toLowerCase().includes('damage') ||
        roll.reason.toLowerCase().includes('initiative')
      );
      
      if (isRelatedRolls) {
        setPendingRolls(foundRolls.map(roll => ({ ...roll, result: undefined })));
        setIsWaitingForRolls(true);
      }
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
              <Button
                variant={isVoiceEnabled ? "default" : "outline"}
                size="sm"
                onClick={toggleVoice}
                className="flex items-center gap-2"
                disabled={!ElevenLabsManager.isAvailable()}
                title={!ElevenLabsManager.isAvailable() ? "Audio context not supported" : isVoiceEnabled ? "Disable voice narration" : "Enable voice narration"}
              >
                {isSpeaking ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                ) : isVoiceEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
                {isVoiceEnabled ? "ElevenLabs On" : "ElevenLabs Off"}
              </Button>
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
                Character Sheet{character ? ` of ${character.name}` : ''}
              </TabsTrigger>
              <TabsTrigger value="inventory" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Inventory{character ? ` of ${character.name}` : ''}
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
                
                {isVoiceEnabled && isSpeaking && (
                  <div className="flex justify-start">
                    <div className="bg-green-100 border border-green-200 px-4 py-2 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Volume2 className="h-4 w-4 text-green-600 animate-pulse" />
                        <p className="text-sm font-medium text-green-800">
                          Narrating...
                        </p>
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
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {character && (
                      <>
                        <div className="flex justify-between">
                          <span className="font-medium">Name:</span>
                          <span>{character.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Class:</span>
                          <span>{character.class || 'Unknown'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Level:</span>
                          <span>{character.level}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Race:</span>
                          <span>{character.race || 'Unknown'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Background:</span>
                          <span>{character.background || 'Unknown'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Experience:</span>
                          <span>{character.experience_points} XP</span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Combat Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Combat Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {character && (
                      <>
                        <div className="flex justify-between">
                          <span className="font-medium">Hit Points:</span>
                          <span>{character.hit_points || 0}/{character.max_hit_points || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Armor Class:</span>
                          <span>{character.armor_class || 10}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Initiative:</span>
                          <span>+{Math.floor((character.ability_scores?.dex || 10) - 10) / 2}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Movement:</span>
                          <span>{CombatManager.calculateMovementSpeed(30, character.equipment, character.conditions)} feet</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Melee Attack:</span>
                          <span>+{CombatManager.calculateAttackBonus(character.ability_scores, character.class).melee}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Ranged Attack:</span>
                          <span>+{CombatManager.calculateAttackBonus(character.ability_scores, character.class).ranged}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Spell Attack:</span>
                          <span>+{CombatManager.calculateAttackBonus(character.ability_scores, character.class).spell}</span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Ability Scores */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Ability Scores</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {character && character.ability_scores ? (
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(character.ability_scores).map(([ability, score]) => {
                          const modifier = Math.floor((score as number) - 10) / 2;
                          const modifierStr = modifier >= 0 ? `+${modifier}` : `${modifier}`;
                          return (
                            <div key={ability} className="flex justify-between items-center p-2 bg-muted rounded">
                              <span className="font-medium uppercase">{ability}:</span>
                              <div className="text-right">
                                <div>{String(score)}</div>
                                <div className="text-xs text-muted-foreground">({modifierStr})</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">No ability scores available</p>
                    )}
                  </CardContent>
                </Card>

                {/* Skills */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Skills</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {character && character.skills ? (
                      <div className="space-y-1 text-sm">
                        {Object.entries(character.skills).map(([skill, value]) => (
                          <div key={skill} className="flex justify-between items-center p-1">
                            <span className="capitalize">{skill.replace(/_/g, ' ')}:</span>
                            <span className="font-medium">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">No skills available</p>
                    )}
                  </CardContent>
                </Card>

                {/* Spells */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Spells</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {character && character.spells ? (
                      <div className="space-y-1 text-sm">
                        {Array.isArray(character.spells) ? (
                          character.spells.map((spell, index) => (
                            <div key={index} className="p-1 bg-muted rounded">
                              {typeof spell === 'string' ? spell : JSON.stringify(spell)}
                            </div>
                          ))
                        ) : (
                          Object.entries(character.spells).map(([level, spells]) => (
                            <div key={level}>
                              <div className="font-medium text-xs text-muted-foreground mb-1">
                                Level {level} Spells:
                              </div>
                              {Array.isArray(spells) ? (
                                spells.map((spell, index) => (
                                  <div key={index} className="p-1 bg-muted rounded text-xs ml-2 mb-1">
                                    {typeof spell === 'string' ? spell : JSON.stringify(spell)}
                                  </div>
                                ))
                              ) : (
                                <div className="p-1 bg-muted rounded text-xs ml-2">
                                  {JSON.stringify(spells)}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">No spells available</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Voice Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">ElevenLabs Voice Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Voice Narration</p>
                        <p className="text-xs text-muted-foreground">
                          Have the AI narrate responses using ElevenLabs
                        </p>
                      </div>
                      <Button
                        variant={isVoiceEnabled ? "default" : "outline"}
                        size="sm"
                        onClick={toggleVoice}
                        disabled={!ElevenLabsManager.isAvailable()}
                      >
                        {isVoiceEnabled ? "Enabled" : "Disabled"}
                      </Button>
                    </div>
                    
                    {isVoiceEnabled && availableVoices.length === 0 && (
                      <div className="p-3 bg-red-100 border border-red-200 rounded-md">
                        <p className="text-xs text-red-800">
                          ❌ ElevenLabs API key not configured. Please add ELEVENLABS_API_KEY to your .env.local file.
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={testElevenLabs}
                          className="mt-2"
                        >
                          Test ElevenLabs Connection
                        </Button>
                      </div>
                    )}
                    
                    {!ElevenLabsManager.isAvailable() && (
                      <div className="p-3 bg-yellow-100 border border-yellow-200 rounded-md">
                        <p className="text-xs text-yellow-800">
                          ⚠️ Audio context is not supported in your browser. Voice narration will not be available.
                        </p>
                      </div>
                    )}
                    
                    {isVoiceEnabled && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Select Voice</label>
                          <select
                            value={selectedVoiceId}
                            onChange={(e) => setSelectedVoiceId(e.target.value)}
                            className="w-full p-2 border rounded-md text-sm"
                          >
                            {availableVoices.map((voice) => (
                              <option key={voice.voice_id} value={voice.voice_id}>
                                {voice.name} {voice.description ? `(${voice.description})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium">Emotion (Style)</label>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.1"
                              value={voiceSettings.style}
                              onChange={(e) => setVoiceSettings(prev => ({ ...prev, style: parseFloat(e.target.value) }))}
                              className="w-full"
                            />
                            <p className="text-xs text-muted-foreground">
                              Higher = More dramatic and emotional
                            </p>
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium">Stability</label>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.1"
                              value={voiceSettings.stability}
                              onChange={(e) => setVoiceSettings(prev => ({ ...prev, stability: parseFloat(e.target.value) }))}
                              className="w-full"
                            />
                            <p className="text-xs text-muted-foreground">
                              Lower = More variation and emotion
                            </p>
                          </div>
                          
                          <div>
                            <label className="text-sm font-medium">Voice Similarity</label>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.1"
                              value={voiceSettings.similarity_boost}
                              onChange={(e) => setVoiceSettings(prev => ({ ...prev, similarity_boost: parseFloat(e.target.value) }))}
                              className="w-full"
                            />
                            <p className="text-xs text-muted-foreground">
                              Higher = More consistent character voice
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {isVoiceEnabled && (
                      <div className="p-3 bg-green-100 border border-green-200 rounded-md">
                        <p className="text-xs text-green-800">
                          ✅ ElevenLabs voice narration is active. The AI will read its responses aloud.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Inventory Tab */}
            <TabsContent value="inventory" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Inventory & Equipment</h3>
                {character && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Package className="h-4 w-4" />
                    <span>Items: {Array.isArray(character.inventory) ? character.inventory.length : 0}</span>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Equipment */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <span>⚔️</span>
                      Equipment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {character && character.equipment ? (
                      <div className="space-y-3">
                        {Array.isArray(character.equipment) ? (
                          character.equipment.length > 0 ? (
                            character.equipment.map((item, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-blue-600 text-sm">⚔️</span>
                                  </div>
                                  <div>
                                    <div className="font-medium text-sm">
                                      {typeof item === 'string' ? item : (item as any)?.name || 'Unknown Item'}
                                    </div>
                                    {typeof item === 'object' && (item as any)?.description && (
                                      <div className="text-xs text-muted-foreground">
                                        {(item as any).description}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {typeof item === 'object' && (item as any)?.quantity && (
                                  <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                    x{(item as any).quantity}
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8 text-muted-foreground">
                              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">No equipment equipped</p>
                            </div>
                          )
                        ) : (
                          Object.entries(character.equipment).map(([category, items]) => (
                            <div key={category} className="space-y-2">
                              <div className="font-medium text-sm text-muted-foreground capitalize border-b pb-1">
                                {category.replace(/_/g, ' ')}:
                              </div>
                              {Array.isArray(items) ? (
                                items.map((item, index) => (
                                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded ml-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs">•</span>
                                      <span className="text-sm">
                                        {typeof item === 'string' ? item : (item as any)?.name || 'Unknown Item'}
                                      </span>
                                    </div>
                                    {typeof item === 'object' && (item as any)?.quantity && (
                                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                        x{(item as any).quantity}
                                      </span>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <div className="p-2 bg-muted rounded ml-2 text-sm">
                                  {JSON.stringify(items)}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No equipment available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Inventory */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <span>🎒</span>
                      Inventory
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {character && character.inventory ? (
                      <div className="space-y-2">
                        {Array.isArray(character.inventory) ? (
                          character.inventory.length > 0 ? (
                            character.inventory.map((item, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                    <span className="text-green-600 text-sm">🎒</span>
                                  </div>
                                  <div>
                                    <div className="font-medium text-sm">
                                      {typeof item === 'string' ? item : (item as any)?.name || 'Unknown Item'}
                                    </div>
                                    {typeof item === 'object' && (item as any)?.description && (
                                      <div className="text-xs text-muted-foreground">
                                        {(item as any).description}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {typeof item === 'object' && (item as any)?.quantity && (
                                  <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                    x{(item as any).quantity}
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8 text-muted-foreground">
                              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">Inventory is empty</p>
                            </div>
                          )
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No inventory data</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No inventory available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Conditions & Effects */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <span>⚡</span>
                      Conditions & Effects
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {character && character.conditions ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Array.isArray(character.conditions) ? (
                          character.conditions.length > 0 ? (
                            character.conditions.map((condition, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                                    <span className="text-orange-600 text-sm">⚡</span>
                                  </div>
                                  <div>
                                    <div className="font-medium text-sm">
                                      {typeof condition === 'string' ? condition : (condition as any)?.name || 'Unknown Condition'}
                                    </div>
                                    {typeof condition === 'object' && (condition as any)?.description && (
                                      <div className="text-xs text-muted-foreground">
                                        {(condition as any).description}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {typeof condition === 'object' && (condition as any)?.duration && (
                                  <div className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                                    {(condition as any).duration}
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="col-span-2 text-center py-8 text-muted-foreground">
                              <span className="text-2xl mb-2 block">✨</span>
                              <p className="text-sm">No conditions or effects</p>
                            </div>
                          )
                        ) : (
                          Object.entries(character.conditions).map(([condition, details]: [string, any]) => (
                            <div key={condition} className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                  <span className="text-purple-600 text-sm">⚡</span>
                                </div>
                                <div>
                                  <div className="font-medium text-sm capitalize">
                                    {condition.replace(/_/g, ' ')}
                                  </div>
                                  {details && (
                                    <div className="text-xs text-muted-foreground">
                                      {typeof details === 'string' ? details : JSON.stringify(details as any)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <span className="text-2xl mb-2 block">✨</span>
                        <p className="text-sm">No conditions or effects</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>


          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 