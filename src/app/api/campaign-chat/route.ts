/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { messages, model = 'openrouter/horizon-beta', context, diceResult, multiRollResults } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'OpenRouter API key not configured' }, { status: 500 });
    }

    const { characterId, character, partyCharacterIds = [], messages: messageHistory } = context || {};

    // Load party characters if we have party IDs
    let partyCharacters = [];
    if (partyCharacterIds.length > 0) {
      const { data: partyData, error: partyError } = await supabase
        .from('characters')
        .select('*')
        .in('id', partyCharacterIds);

      if (!partyError && partyData) {
        partyCharacters = partyData;
      }
    }

    // Build comprehensive system prompt
    const systemPrompt = `You are an expert Dungeon Master running a D&D 5e campaign. You create immersive, engaging adventures with rich storytelling, dynamic combat, and meaningful character development.

CURRENT CHARACTER:
${character ? `
Name: ${character.name}
Class: ${character.class || 'Unknown'}
Level: ${character.level}
Race: ${character.race || 'Unknown'}
Experience Points: ${character.experience_points}
Hit Points: ${character.hit_points || 0}/${character.max_hit_points || 0}
Armor Class: ${character.armor_class || 10}
Ability Scores: ${JSON.stringify(character.ability_scores || {})}
Skills: ${JSON.stringify(character.skills || {})}
Spells: ${JSON.stringify(character.spells || {})}
Equipment: ${JSON.stringify(character.equipment || {})}
Inventory: ${JSON.stringify(character.inventory || {})}
Conditions: ${JSON.stringify(character.conditions || {})}
` : 'No character data available'}

${partyCharacters.length > 0 ? `
PARTY MEMBERS:
${partyCharacters.map(char => `
- ${char.name} (Level ${char.level} ${char.race || ''} ${char.class || ''})
  HP: ${char.hit_points || 0}/${char.max_hit_points || 0}, AC: ${char.armor_class || 10}
  XP: ${char.experience_points}
`).join('')}
` : ''}

GAME RULES:
- Use D&D 5e rules and mechanics
- Create immersive, descriptive scenarios
- React to player actions and decisions
- Update character stats, inventory, and conditions based on story events
- Use [DICE:diceType:reason] format to request dice rolls (without showing DC)
- Include characterUpdates JSON object for real-time stat changes
- Use inventory_add and inventory_remove for smart inventory management

DICE ROLLING:
- Request rolls using [DICE:diceType:reason] format
- d20 for all checks (attack, saving throws, skills, perception, investigation, insight)
- Other dice for damage, healing, or special effects
- DC is internal and never shown to player
- Show SUCCESS/FAILURE based on roll vs internal DC
- For perception-like skills, use spectrum: higher = more information

INVENTORY MANAGEMENT RULES:
- Never give items for free without justification
- Items must be acquired through: combat loot, purchasing, finding, quest rewards, trading
- Use inventory_add for new items, inventory_remove for consumed/lost items
- Existing items are never deleted when adding new ones

D&D 5E COMBAT RULES:
- Initiative & Turn Order: Dexterity modifier + d20
- Movement & Positioning: Consider character speed and terrain
- Attack Actions: Melee (Strength), Ranged (Dexterity), Spell (casting modifier)
- Equipment Requirements: Validate equipment before allowing actions
- Special Actions: Grapple, shove, dodge, disengage, dash, help
- Damage & Healing: Track HP changes and apply conditions

EQUIPMENT VALIDATION RULES:
- Check character's equipment/inventory before allowing actions
- Shield bash requires shield, two-weapon fighting requires two weapons
- Spellcasting requires components or focus
- Ranged attacks require ammunition
- Heavy armor requires Strength 13+

COMBAT EXAMPLES:
- [DICE:d20:Melee Attack] [DICE:1d8:Damage]
- [DICE:d20:Initiative]
- [DICE:d20:Saving Throw:Constitution]
- [DICE:d20:Perception Check]
- [DICE:d20:Stealth Check]

MULTI-ROLL RESULTS:
When multiple rolls are provided, continue the story considering all results together.
Example: Attack roll + damage roll = complete combat action with appropriate narrative.

CHARACTER UPDATES:
Include characterUpdates JSON object for real-time changes:
{
  "hit_points": 15,
  "experience_points": 150,
  "inventory_add": ["Healing Potion", "Gold Coins"],
  "inventory_remove": ["Arrows"],
  "conditions": ["Blessed", "Poisoned"]
}

STORYTELLING:
- Create vivid, atmospheric descriptions
- React dynamically to player choices
- Include environmental details and NPC interactions
- Balance combat, exploration, and social encounters
- Maintain campaign continuity and character development

${diceResult ? `DICE RESULT: ${diceResult.diceType} (${diceResult.reason}) = ${diceResult.result}` : ''}
${multiRollResults ? `MULTI-ROLL RESULTS: ${JSON.stringify(multiRollResults)}` : ''}

Previous messages for context:
${messageHistory ? messageHistory.map((m: any) => `${m.role}: ${m.content}`).join('\n') : 'No previous messages'}

Respond as the Dungeon Master, continuing the adventure based on the current situation and any dice results provided.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://dungeon-master.vercel.app',
        'X-Title': 'Dungeon Master AI'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        temperature: 0.8,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    // Extract character updates from the response
    let characterUpdates = null;
    try {
      const updateMatch = aiResponse.match(/characterUpdates\s*:\s*({[\s\S]*?})/);
      if (updateMatch) {
        characterUpdates = JSON.parse(updateMatch[1]);
      }
    } catch (error) {
      console.error('Error parsing character updates:', error);
    }

    // Clean the response by removing the characterUpdates section
    const cleanResponse = aiResponse.replace(/characterUpdates\s*:\s*{[\s\S]*?}/, '').trim();

    return NextResponse.json({
      content: cleanResponse,
      characterUpdates,
      metadata: {
        type: 'ai_response',
        characterId,
        partyCharacterIds
      }
    });

  } catch (error) {
    console.error('Campaign chat error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 