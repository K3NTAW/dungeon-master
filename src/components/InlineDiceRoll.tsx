'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dices } from 'lucide-react';

interface InlineDiceRollProps {
  diceType: string; // e.g., "d20", "2d6", "d100"
  reason: string; // e.g., "Attack Roll", "Saving Throw:DC15", "Skill Check:Persuasion:DC19"
  onRoll: (result: number) => void;
  className?: string;
}

export default function InlineDiceRoll({ diceType, reason, onRoll, className = '' }: InlineDiceRollProps) {
  const [isRolling, setIsRolling] = useState(false);
  const [result, setResult] = useState<number | null>(null);

  // Parse reason to extract DC and check type
  const parseReason = (reason: string) => {
    const dcMatch = reason.match(/DC(\d+)/);
    const dc = dcMatch ? parseInt(dcMatch[1]) : null;
    
    // Remove DC from display reason
    const displayReason = reason.replace(/DC\d+/, '').replace(/^Skill Check:/, '').replace(/^Saving Throw:/, '');
    
    return { dc, displayReason };
  };

  const { dc, displayReason } = parseReason(reason);

  const parseDice = (diceString: string) => {
    const match = diceString.match(/^(\d+)?d(\d+)$/);
    if (!match) return { count: 1, sides: 20 };
    
    const count = match[1] ? parseInt(match[1]) : 1;
    const sides = parseInt(match[2]);
    return { count, sides };
  };

  const rollDice = async () => {
    if (isRolling) return;
    
    setIsRolling(true);
    const { count, sides } = parseDice(diceType);
    
    // Simulate rolling animation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Calculate result
    let total = 0;
    for (let i = 0; i < count; i++) {
      total += Math.floor(Math.random() * sides) + 1;
    }
    
    setResult(total);
    onRoll(total);
    setIsRolling(false);
  };

  const getDiceColor = (sides: number) => {
    switch (sides) {
      case 20: return 'bg-blue-100 text-blue-800 border-blue-200';
      case 12: return 'bg-green-100 text-green-800 border-green-200';
      case 10: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 8: return 'bg-purple-100 text-purple-800 border-purple-200';
      case 6: return 'bg-red-100 text-red-800 border-red-200';
      case 4: return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const { sides } = parseDice(diceType);

  return (
    <div className={`inline-flex items-center gap-2 p-2 rounded-lg border ${getDiceColor(sides)} ${className}`}>
      <div className="flex items-center gap-1">
        <Dices className="h-4 w-4" />
        <span className="font-mono font-semibold">{diceType}</span>
      </div>
      <div className="flex flex-col">
        <span className="text-sm opacity-75">({displayReason})</span>
        {dc && (
          <span className="text-xs font-semibold text-blue-600">DC {dc}</span>
        )}
      </div>
      {result === null ? (
        <Button
          size="sm"
          variant="outline"
          onClick={rollDice}
          disabled={isRolling}
          className="ml-2"
        >
          {isRolling ? (
            <>
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-1"></div>
              Rolling...
            </>
          ) : (
            'Roll'
          )}
        </Button>
      ) : (
        <div className="flex flex-col items-center ml-2">
          <span className="font-bold text-lg">= {result}</span>
          {dc && (
            <span className={`text-xs font-semibold ${result >= dc ? 'text-green-600' : 'text-red-600'}`}>
              {result >= dc ? 'SUCCESS' : 'FAILURE'}
            </span>
          )}
        </div>
      )}
    </div>
  );
} 