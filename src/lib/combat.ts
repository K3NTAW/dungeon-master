/* eslint-disable @typescript-eslint/no-explicit-any */

export interface CombatStats {
  initiative: number;
  attackBonus: {
    melee: number;
    ranged: number;
    spell: number;
  };
  damage: {
    melee: string;
    ranged: string;
    spell: string;
  };
  ac: number;
  speed: number;
  hp: {
    current: number;
    max: number;
  };
}

export interface Equipment {
  weapons: string[];
  armor: string[];
  shield: boolean;
  ammunition: Record<string, number>;
}

export class CombatManager {
  /**
   * Calculate initiative bonus
   */
  static calculateInitiative(dexModifier: number): number {
    return dexModifier;
  }

  /**
   * Calculate attack bonus for different attack types
   */
  static calculateAttackBonus(
    abilityScores: any,
    characterClass: string | null,
    proficiencyBonus: number = 2
  ) {
    const strMod = Math.floor((abilityScores?.str || 10) - 10) / 2;
    const dexMod = Math.floor((abilityScores?.dex || 10) - 10) / 2;
    
    // Determine spellcasting modifier based on class
    let spellMod = 0;
    switch (characterClass?.toLowerCase()) {
      case 'wizard':
        spellMod = Math.floor((abilityScores?.int || 10) - 10) / 2;
        break;
      case 'cleric':
      case 'druid':
      case 'ranger':
        spellMod = Math.floor((abilityScores?.wis || 10) - 10) / 2;
        break;
      case 'sorcerer':
      case 'warlock':
      case 'bard':
      case 'paladin':
        spellMod = Math.floor((abilityScores?.cha || 10) - 10) / 2;
        break;
      default:
        spellMod = Math.max(strMod, dexMod);
    }

    return {
      melee: strMod + proficiencyBonus,
      ranged: dexMod + proficiencyBonus,
      spell: spellMod + proficiencyBonus
    };
  }

  /**
   * Check if character can use specific equipment/abilities
   */
  static validateEquipment(
    action: string,
    equipment: any[],
    inventory: any[],
    abilityScores: any
  ): { canUse: boolean; reason?: string; alternatives?: string[] } {
    const allItems = [...(equipment || []), ...(inventory || [])];
    
    switch (action.toLowerCase()) {
      case 'shield bash':
        const hasShield = allItems.some(item => 
          item.toLowerCase().includes('shield')
        );
        if (!hasShield) {
          return {
            canUse: false,
            reason: "You don't have a shield equipped or in your inventory.",
            alternatives: ["Use your weapon to attack", "Try to grapple the enemy", "Use a different action"]
          };
        }
        break;

      case 'two-weapon fighting':
      case 'dual wield':
        const weapons = allItems.filter(item => 
          item.toLowerCase().includes('sword') ||
          item.toLowerCase().includes('dagger') ||
          item.toLowerCase().includes('axe') ||
          item.toLowerCase().includes('mace') ||
          item.toLowerCase().includes('hammer')
        );
        if (weapons.length < 2) {
          return {
            canUse: false,
            reason: "You need two weapons to use two-weapon fighting.",
            alternatives: ["Use a single weapon", "Draw another weapon first", "Use a different action"]
          };
        }
        break;

      case 'heavy armor':
        const strScore = abilityScores?.str || 10;
        if (strScore < 13) {
          return {
            canUse: false,
            reason: "You need Strength 13 or higher to wear heavy armor without penalty.",
            alternatives: ["Use medium armor", "Use light armor", "Improve your Strength score"]
          };
        }
        break;

      case 'spellcasting':
        // Check for spell components (simplified)
        const hasComponents = allItems.some(item => 
          item.toLowerCase().includes('component') ||
          item.toLowerCase().includes('focus') ||
          item.toLowerCase().includes('material')
        );
        if (!hasComponents) {
          return {
            canUse: false,
            reason: "You need spell components or a focus to cast spells.",
            alternatives: ["Use a weapon attack", "Use an ability that doesn't require components", "Find spell components"]
          };
        }
        break;

      case 'ranged attack':
        const hasAmmunition = allItems.some(item => 
          item.toLowerCase().includes('arrow') ||
          item.toLowerCase().includes('bolt') ||
          item.toLowerCase().includes('dart')
        );
        if (!hasAmmunition) {
          return {
            canUse: false,
            reason: "You need ammunition for ranged attacks.",
            alternatives: ["Use a melee weapon", "Find ammunition", "Use a different action"]
          };
        }
        break;
    }

    return { canUse: true };
  }

  /**
   * Get available combat actions based on equipment
   */
  static getAvailableActions(
    equipment: any[],
    inventory: any[],
    abilityScores: any
  ): string[] {
    const allItems = [...(equipment || []), ...(inventory || [])];
    const actions = ["Attack", "Move", "Dodge", "Disengage", "Dash", "Help"];

    // Check for weapons
    const hasMeleeWeapon = allItems.some(item => 
      item.toLowerCase().includes('sword') ||
      item.toLowerCase().includes('dagger') ||
      item.toLowerCase().includes('axe') ||
      item.toLowerCase().includes('mace') ||
      item.toLowerCase().includes('hammer')
    );

    const hasRangedWeapon = allItems.some(item => 
      item.toLowerCase().includes('bow') ||
      item.toLowerCase().includes('crossbow') ||
      item.toLowerCase().includes('sling')
    );

    const hasShield = allItems.some(item => 
      item.toLowerCase().includes('shield')
    );

    if (hasMeleeWeapon) {
      actions.push("Melee Attack");
      if (hasShield) actions.push("Shield Bash");
    }

    if (hasRangedWeapon) {
      const hasAmmo = allItems.some(item => 
        item.toLowerCase().includes('arrow') ||
        item.toLowerCase().includes('bolt')
      );
      if (hasAmmo) actions.push("Ranged Attack");
    }

    // Check for spellcasting
    const hasSpells = allItems.some(item => 
      item.toLowerCase().includes('spell') ||
      item.toLowerCase().includes('scroll')
    );
    if (hasSpells) actions.push("Cast Spell");

    // Check for grappling/shoving
    const strMod = Math.floor((abilityScores?.str || 10) - 10) / 2;
    if (strMod >= 0) {
      actions.push("Grapple", "Shove");
    }

    return actions;
  }

  /**
   * Calculate movement speed based on equipment and conditions
   */
  static calculateMovementSpeed(
    baseSpeed: number = 30,
    armor: any[],
    conditions: any[]
  ): number {
    let speed = baseSpeed;

    // Heavy armor reduces speed
    const heavyArmor = armor?.some(item => 
      item.toLowerCase().includes('plate') ||
      item.toLowerCase().includes('heavy')
    );
    if (heavyArmor) speed -= 10;

    // Conditions affect speed
    if (conditions?.includes('Exhausted')) speed -= 10;
    if (conditions?.includes('Slowed')) speed = Math.floor(speed / 2);

    return Math.max(speed, 5); // Minimum 5 feet
  }

  /**
   * Format combat stats for display
   */
  static formatCombatStats(stats: CombatStats): string {
    return `Combat Stats:
Initiative: +${stats.initiative}
Attack Bonus: Melee +${stats.attackBonus.melee}, Ranged +${stats.attackBonus.ranged}, Spell +${stats.attackBonus.spell}
AC: ${stats.ac}
Speed: ${stats.speed} feet
HP: ${stats.hp.current}/${stats.hp.max}`;
  }
} 