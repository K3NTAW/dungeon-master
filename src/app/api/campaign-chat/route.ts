/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Helper function to calculate ability modifiers
function calculateModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

// Helper function to format character abilities with modifiers
function formatCharacterAbilities(character: any): string {
  const abilities = character.ability_scores || {};
  const modifiers = {
    str: calculateModifier(abilities.str || 10),
    dex: calculateModifier(abilities.dex || 10),
    con: calculateModifier(abilities.con || 10),
    int: calculateModifier(abilities.int || 10),
    wis: calculateModifier(abilities.wis || 10),
    cha: calculateModifier(abilities.cha || 10)
  };

  return `
STR: ${abilities.str || 10} (${modifiers.str >= 0 ? '+' : ''}${modifiers.str})
DEX: ${abilities.dex || 10} (${modifiers.dex >= 0 ? '+' : ''}${modifiers.dex})
CON: ${abilities.con || 10} (${modifiers.con >= 0 ? '+' : ''}${modifiers.con})
INT: ${abilities.int || 10} (${modifiers.int >= 0 ? '+' : ''}${modifiers.int})
WIS: ${abilities.wis || 10} (${modifiers.wis >= 0 ? '+' : ''}${modifiers.wis})
CHA: ${abilities.cha || 10} (${modifiers.cha >= 0 ? '+' : ''}${modifiers.cha})`;
}

// Helper function to get character's best skill for a given ability
function getBestSkillForAbility(character: any, ability: string): string {
  const skills = character.skills || {};
  const abilityMod = calculateModifier(character.ability_scores?.[ability] || 10);
  
  // Map ability to relevant skills
  const skillMap: { [key: string]: string[] } = {
    str: ['Athletics'],
    dex: ['Acrobatics', 'Sleight of Hand', 'Stealth'],
    con: [],
    int: ['Arcana', 'History', 'Investigation', 'Nature', 'Religion'],
    wis: ['Animal Handling', 'Insight', 'Medicine', 'Perception', 'Survival'],
    cha: ['Deception', 'Intimidation', 'Performance', 'Persuasion']
  };

  const relevantSkills = skillMap[ability] || [];
  let bestSkill = '';
  let bestBonus = abilityMod;

  for (const skill of relevantSkills) {
    if (skills[skill]) {
      const skillBonus = abilityMod + (skills[skill] || 0);
      if (skillBonus > bestBonus) {
        bestBonus = skillBonus;
        bestSkill = skill;
      }
    }
  }

  return bestSkill || ability;
}

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

CURRENT SPEAKING CHARACTER:
${character ? `
Name: ${character.name}
Class: ${character.class || 'Unknown'}
Level: ${character.level}
Race: ${character.race || 'Unknown'}
Experience Points: ${character.experience_points}
Hit Points: ${character.hit_points || 0}/${character.max_hit_points || 0}
Armor Class: ${character.armor_class || 10}
Ability Scores & Modifiers:${formatCharacterAbilities(character)}
Skills: ${JSON.stringify(character.skills || {})}
Spells: ${JSON.stringify(character.spells || {})}
Equipment: ${JSON.stringify(character.equipment || {})}
Inventory: ${JSON.stringify(character.inventory || {})}
Conditions: ${JSON.stringify(character.conditions || {})}
` : 'No character data available'}

${partyCharacters.length > 0 ? `
FULL PARTY DETAILS:
${partyCharacters.map(char => {
  const abilities = char.ability_scores || {};
  const modifiers = {
    str: calculateModifier(abilities.str || 10),
    dex: calculateModifier(abilities.dex || 10),
    con: calculateModifier(abilities.con || 10),
    int: calculateModifier(abilities.int || 10),
    wis: calculateModifier(abilities.wis || 10),
    cha: calculateModifier(abilities.cha || 10)
  };
  
  return `
- ${char.name} (Level ${char.level} ${char.race || ''} ${char.class || ''})
  HP: ${char.hit_points || 0}/${char.max_hit_points || 0}, AC: ${char.armor_class || 10}
  XP: ${char.experience_points}
  Abilities: STR ${abilities.str || 10}(${modifiers.str >= 0 ? '+' : ''}${modifiers.str}), DEX ${abilities.dex || 10}(${modifiers.dex >= 0 ? '+' : ''}${modifiers.dex}), CON ${abilities.con || 10}(${modifiers.con >= 0 ? '+' : ''}${modifiers.con}), INT ${abilities.int || 10}(${modifiers.int >= 0 ? '+' : ''}${modifiers.int}), WIS ${abilities.wis || 10}(${modifiers.wis >= 0 ? '+' : ''}${modifiers.wis}), CHA ${abilities.cha || 10}(${modifiers.cha >= 0 ? '+' : ''}${modifiers.cha})
  Skills: ${JSON.stringify(char.skills || {})}
  Equipment: ${JSON.stringify(char.equipment || {})}
  Spells: ${JSON.stringify(char.spells || {})}
  Best Skills: Athletics(${modifiers.str >= 0 ? '+' : ''}${modifiers.str}), Stealth(${modifiers.dex >= 0 ? '+' : ''}${modifiers.dex}), Perception(${modifiers.wis >= 0 ? '+' : ''}${modifiers.wis}), Persuasion(${modifiers.cha >= 0 ? '+' : ''}${modifiers.cha}), Investigation(${modifiers.int >= 0 ? '+' : ''}${modifiers.int})`;
}).join('')}
` : ''}

PARTY-BASED GAMEPLAY RULES:
- Create challenges that require specific character abilities or skills
- Some tasks can only be performed by characters with certain abilities (e.g., heavy lifting requires STR 13+, magic requires spellcasting ability)
- For general tasks, let the player choose which character attempts it
- Consider party composition when designing encounters and puzzles
- Use character-specific dialogue and reactions based on their class, race, and abilities
- Some NPCs may respond differently to different party members

CHARACTER-SPECIFIC CHALLENGES:
- STR-based: Heavy lifting, breaking doors, climbing, swimming against currents
- DEX-based: Picking locks, sneaking, acrobatics, disarming traps
- CON-based: Endurance challenges, resisting poison, holding breath
- INT-based: Solving puzzles, deciphering ancient texts, understanding magic
- WIS-based: Reading people, tracking, survival, noticing hidden things
- CHA-based: Negotiation, intimidation, performance, deception

CLASS-SPECIFIC OPPORTUNITIES:
- Fighters: Combat tactics, weapon expertise, physical challenges
- Rogues: Stealth missions, lockpicking, trap disarming, information gathering
- Wizards: Magic puzzles, spell research, arcane knowledge
- Clerics: Religious ceremonies, healing, divine intervention
- Rangers: Tracking, survival, nature knowledge
- Bards: Social encounters, performance, information gathering

GAME RULES:
- Use D&D 5e rules and mechanics
- Create immersive, descriptive scenarios
- React to player actions and decisions
- Update character stats, inventory, and conditions based on story events
- Use [DICE:diceType:reason] format to request dice rolls (without showing DC)
- Include characterUpdates JSON object for real-time stat changes
- Use inventory_add and inventory_remove for smart inventory management

DICE ROLLING WITH BONUSES:
- Request rolls using [DICE:diceType:reason] format
- d20 for all checks (attack, saving throws, skills, perception, investigation, insight)
- Other dice for damage, healing, or special effects
- DC is internal and never shown to player
- Show SUCCESS/FAILURE based on roll vs internal DC
- For perception-like skills, use spectrum: higher = more information
- Consider character abilities when setting DCs (e.g., STR 18 character lifting heavy object = lower DC)

BONUS CALCULATION:
- Ability Modifier = (Ability Score - 10) / 2, rounded down
- Skill Check = d20 + Ability Modifier + Proficiency Bonus (if proficient)
- Attack Roll = d20 + Ability Modifier + Proficiency Bonus + Weapon Bonus
- Saving Throw = d20 + Ability Modifier + Proficiency Bonus (if proficient)
- Initiative = d20 + DEX Modifier

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

CHARACTER-SPECIFIC ROLL EXAMPLES:
- "The heavy door requires strength to open. [DICE:d20:Strength Check]"
- "The ancient runes require arcane knowledge. [DICE:d20:Arcana Check]"
- "The guard seems suspicious. [DICE:d20:Insight Check]"
- "You try to persuade the merchant. [DICE:d20:Persuasion Check]"

OPTION-BASED CHALLENGES:
When presenting multiple options, describe what each option requires without rolling dice immediately:
- "You can: 1) Climb the wall (requires Strength check), 2) Find a hidden path (requires Perception check), 3) Use magic to fly over (requires spellcasting ability)"
- "The options are: 1) Intimidate the guard (Charisma check), 2) Sneak past (Dexterity check), 3) Distract with a diversion (Performance check)"
- "You could: 1) Force the lock (Strength check), 2) Pick the lock (Dexterity check), 3) Search for a key (Investigation check)"

Only request dice rolls AFTER the player has chosen an option and you need to resolve that specific choice.

MULTI-ROLL RESULTS:
Only use multi-roll sequences for related actions that happen together:
- Attack roll + damage roll (same action)
- Initiative rolls (all participants roll at once)
- Multiple attacks in one turn (same character)

Do NOT use multi-roll for separate options or choices. Present options first, let player choose, then roll only what's needed for their choice.

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
- Use character-specific dialogue and reactions
- Create opportunities for each party member to shine
- Present options clearly before requesting rolls
- Let players choose their approach, then roll only what's needed

${diceResult ? `DICE RESULT: ${diceResult.diceType} (${diceResult.reason}) = ${diceResult.result}` : ''}
${multiRollResults ? `MULTI-ROLL RESULTS: ${JSON.stringify(multiRollResults)}` : ''}

Previous messages for context:
${messageHistory ? messageHistory.map((m: any) => `${m.role}: ${m.content}`).join('\n') : 'No previous messages'}

Respond as the Dungeon Master, continuing the adventure based on the current situation and any dice results provided. Consider the party composition and create opportunities for different characters to contribute based on their abilities.`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://dungeon-master.vercel.app',
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