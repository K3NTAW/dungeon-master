import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { characterName, characterClass, characterRace, campaignTitle } = body;

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OpenRouter API key not configured' },
        { status: 500 }
      );
    }

    if (!characterName) {
      return NextResponse.json(
        { error: 'Character name is required' },
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

    const systemPrompt = `You are an AI Dungeon Master creating a new D&D 5e character. Generate appropriate stats and provide a welcome message.

CHARACTER INFO:
Name: ${characterName}
Class: ${characterClass || 'Adventurer'}
Race: ${characterRace || 'Human'}
Campaign: ${campaignTitle || 'Adventure'}

TASK:
1. Generate appropriate D&D 5e stats for this character
2. Provide a welcoming message as the DM introducing this new adventurer

RESPONSE FORMAT:
Respond with a JSON object containing:

{
  "welcomeMessage": "Your welcoming message as the DM...",
  "characterStats": {
    "ability_scores": {
      "str": 14,
      "dex": 12,
      "con": 16,
      "int": 10,
      "wis": 14,
      "cha": 8
    },
    "hit_points": 12,
    "max_hit_points": 12,
    "armor_class": 15,
    "skills": ["Athletics", "Perception", "Survival"],
    "spells": [],
    "equipment": ["Longsword", "Shield", "Backpack", "Bedroll"],
    "inventory": ["Rations (5 days)", "Waterskin", "50 feet of rope"],
    "conditions": []
  }
}

STAT GENERATION RULES:
- Use standard D&D 5e ability score generation (4d6 drop lowest, or point buy equivalent)
- HP should be appropriate for the class and CON modifier
- AC should be reasonable for the class (10-18 range)
- Skills should match the character's class and background
- Equipment should be starting gear appropriate for the class
- Inventory should include basic adventuring supplies

CLASS-SPECIFIC GUIDANCE:
- Fighter: Higher STR/CON, martial weapons, armor
- Wizard: Higher INT, spells, arcane focus
- Cleric: Higher WIS, divine spells, holy symbol
- Rogue: Higher DEX, stealth skills, light weapons
- Ranger: Balanced DEX/WIS, survival skills, ranged weapons
- Paladin: Higher STR/CHA, heavy armor, divine spells

Make the welcome message exciting and thematic! You can include dice rolls if appropriate, such as:
- "Let's see what fate has in store for you! [DICE:d20:Destiny Check]"
- "Your journey begins with a test of luck! [DICE:d100:Fortune Roll]"

But only include dice rolls if they make thematic sense for the character's introduction.`;

    const completion = await client.chat.completions.create({
      model: "openrouter/horizon-beta",
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Create a new character: ${characterName}, a ${characterRace || 'Human'} ${characterClass || 'Adventurer'}` }
      ],
      temperature: 0.8,
      max_tokens: 1000,
    });

    const responseContent = completion.choices[0].message.content || '';

    // Parse the JSON response
    try {
      const parsed = JSON.parse(responseContent);
      
      if (!parsed.welcomeMessage || !parsed.characterStats) {
        throw new Error('Invalid response format');
      }

      return NextResponse.json({
        welcomeMessage: parsed.welcomeMessage,
        characterStats: parsed.characterStats,
        usage: completion.usage,
      });

    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      
      // Fallback to default stats if parsing fails
      const fallbackStats = {
        ability_scores: {
          str: 12, dex: 12, con: 12, int: 12, wis: 12, cha: 12
        },
        hit_points: 8,
        max_hit_points: 8,
        armor_class: 10,
        skills: ["Athletics"],
        spells: [],
        equipment: ["Simple weapon", "Backpack"],
        inventory: ["Rations (1 day)", "Waterskin"],
        conditions: []
      };

      return NextResponse.json({
        welcomeMessage: `Welcome, ${characterName}! A new adventurer joins the fray. May your journey be filled with glory and treasure!`,
        characterStats: fallbackStats,
        usage: completion.usage,
      });
    }

  } catch (error) {
    console.error('Generate character API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate character' },
      { status: 500 }
    );
  }
} 