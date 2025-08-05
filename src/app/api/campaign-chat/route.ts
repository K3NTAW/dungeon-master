import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, model = "openrouter/horizon-beta", context } = body;

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      );
    }

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    const client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
        "X-Title": process.env.NEXT_PUBLIC_SITE_NAME || "Dungeon Master",
      },
    });

    // Create system prompt for D&D Dungeon Master
    const systemPrompt = `You are an AI Dungeon Master for a D&D 5e campaign. You have the ability to update character data in real-time based on story events.

CHARACTER CONTEXT:
${context.character ? `
Character: ${context.character.name}
Class: ${context.character.class || 'Unknown'}
Level: ${context.character.level}
Race: ${context.character.race || 'Unknown'}
Current HP: ${context.character.hit_points || 0}/${context.character.max_hit_points || 0}
AC: ${context.character.armor_class || 10}
Experience Points: ${context.character.experience_points}
Ability Scores: ${JSON.stringify(context.character.ability_scores)}
Skills: ${Array.isArray(context.character.skills) ? context.character.skills.join(', ') : 'None'}
Spells: ${Array.isArray(context.character.spells) ? context.character.spells.join(', ') : 'None'}
Equipment: ${Array.isArray(context.character.equipment) ? context.character.equipment.join(', ') : 'None'}
Inventory: ${Array.isArray(context.character.inventory) ? context.character.inventory.join(', ') : 'None'}
Conditions: ${Array.isArray(context.character.conditions) ? context.character.conditions.join(', ') : 'None'}
` : 'No character selected'}

RESPONSE FORMAT:
You should respond as a Dungeon Master, describing the world and events. When dice rolls are needed, use the format [DICE:diceType:reason] in your response.

DICE ROLL FORMATS:
- [DICE:d20:Attack Roll] - For attack rolls
- [DICE:d20:Saving Throw] - For saving throws  
- [DICE:2d6:Damage] - For damage rolls
- [DICE:d100:Percentile] - For percentile checks
- [DICE:d4:Healing] - For healing spells

When character changes occur (XP gain, damage, item acquisition, etc.), include a JSON object in your response with the following format:

{
  "characterUpdates": {
    "experience_points": 10,
    "hit_points": -5,
    "inventory": ["Healing Potion", "Gold Coins"],
    "conditions": ["Poisoned"]
  }
}

EXAMPLES:
- If the player attacks: "You swing your sword at the goblin. [DICE:d20:Attack Roll]"
- If the player needs to save: "The dragon breathes fire! Make a Dexterity saving throw. [DICE:d20:Saving Throw]"
- If the player hits: "Your sword strikes true! [DICE:2d6:Damage]"
- If the player casts a spell: "You cast Magic Missile. [DICE:d4:Spell Damage]"
- If the player defeats an enemy: Add XP and potentially add loot to inventory
- If the player takes damage: Reduce hit_points
- If the player finds treasure: Add items to inventory
- If the player gets poisoned: Add "Poisoned" to conditions
- If the player drinks a healing potion: Increase hit_points and remove potion from inventory

IMPORTANT RULES:
1. Only include characterUpdates when something actually changes
2. Be fair and consistent with D&D 5e rules
3. XP rewards should be appropriate for the challenge (10-50 XP for minor encounters, 100-300 XP for major encounters)
4. Damage should be reasonable (1-10 for minor threats, 10-30 for serious threats)
5. Always respond in character as the DM first, then include any updates
6. If no character changes occur, don't include characterUpdates in your response
7. Proactively request dice rolls when appropriate (attacks, saves, damage, etc.)
8. Use the [DICE:diceType:reason] format for all dice rolls
9. Make dice rolls contextual and exciting - don't just say "roll d20"

Start your response as the DM, then if there are any character updates, include them in a separate JSON block.`;

    // Add system message to the beginning
    const messagesWithSystem = [
      { role: 'system', content: systemPrompt },
      ...messages
    ];

    const completion = await client.chat.completions.create({
      model,
      messages: messagesWithSystem,
      temperature: 0.8,
      max_tokens: 1000,
    });

    const responseContent = completion.choices[0].message.content || '';

    // Parse the response to extract character updates
    let characterUpdates = null;
    let cleanResponse = responseContent;

    // Look for JSON in the response
    const jsonMatch = responseContent.match(/\{[\s\S]*"characterUpdates"[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.characterUpdates) {
          characterUpdates = parsed.characterUpdates;
          // Remove the JSON from the response
          cleanResponse = responseContent.replace(jsonMatch[0], '').trim();
        }
      } catch (error) {
        console.error('Error parsing character updates JSON:', error);
      }
    }

    return NextResponse.json({
      content: cleanResponse,
      characterUpdates,
      usage: completion.usage,
    });

  } catch (error) {
    console.error('Campaign chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to get completion from OpenRouter' },
      { status: 500 }
    );
  }
} 