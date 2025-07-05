import type { LevelGameState, LevelObjective, LevelScoring } from './types';
import { getLevelById } from './levels';

// === ADVANCED SCORING SYSTEM ===

export function calculateLevelScore(
  baseScore: number,
  objectives: LevelObjective[],
  completedObjectives: string[],
  timeRemaining: number,
  accuracy: number,
  currentStreak: number,
  levelId: number
): LevelScoring {
  const level = getLevelById(levelId);
  if (!level) {
    throw new Error(`Level ${levelId} not found`);
  }

  // Base scoring multipliers
  const difficultyMultipliers = {
    tutorial: 1.0,
    basic: 1.2,
    intermediate: 1.5,
    advanced: 2.0,
    master: 3.0
  };

  const difficultyBonus = Math.floor(baseScore * (difficultyMultipliers[level.category] - 1));

  // Time bonus: up to 50% bonus for speed completion
  const maxTimeBonus = Math.floor(baseScore * 0.5);
  const timeBonus = Math.floor((timeRemaining / level.parameters.timeLimit) * maxTimeBonus);

  // Accuracy multiplier: 0.5x to 2.0x based on accuracy
  const accuracyMultiplier = Math.max(0.5, Math.min(2.0, accuracy / 50));

  // Streak bonus: 10 points per consecutive correct answer
  const streakBonus = currentStreak * 10;

  // Objective completion bonus
  const objectiveBonus = completedObjectives.reduce((total, objId) => {
    const objective = objectives.find(obj => obj.id === objId);
    return total + (objective?.points || 0);
  }, 0);

  return {
    basePoints: baseScore,
    timeBonus,
    accuracyMultiplier,
    difficultyBonus,
    streakBonus,
    objectiveBonus
  };
}

export function getTotalScore(scoring: LevelScoring): number {
  const subtotal = scoring.basePoints + scoring.timeBonus + scoring.difficultyBonus + scoring.streakBonus + scoring.objectiveBonus;
  return Math.floor(subtotal * scoring.accuracyMultiplier);
}

// === OBJECTIVE CHECKING SYSTEM ===

export function checkObjectiveCompletion(
  objective: LevelObjective,
  gameState: LevelGameState
): boolean {
  switch (objective.condition) {
    case 'complete':
      // Level is complete when no targets remain
      return !gameState.grid.flat().some(cell => cell.isTarget);

    case 'score':
      // Score objective
      return gameState.score >= (objective.target || 0);

    case 'time':
      // Time objective (time remaining)
      return gameState.timeLeft >= (objective.target || 0);

    case 'accuracy':
      // Accuracy objective
      return gameState.accuracy >= (objective.target || 0);

    case 'noMistakes':
      // No mistakes objective
      return gameState.incorrectGuesses === 0;

    default:
      return false;
  }
}

export function updateObjectives(gameState: LevelGameState): LevelGameState {
  const newCompletedObjectives = [...gameState.completedObjectives];
  
  for (const objective of gameState.objectives) {
    if (!newCompletedObjectives.includes(objective.id)) {
      if (checkObjectiveCompletion(objective, gameState)) {
        newCompletedObjectives.push(objective.id);
        
        // Award objective points immediately
        gameState.score += objective.points;
      }
    }
  }

  return {
    ...gameState,
    completedObjectives: newCompletedObjectives
  };
}

// === ACHIEVEMENT SYSTEM ===

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'score' | 'speed' | 'accuracy' | 'completion' | 'special';
  requirements: {
    type: 'total_score' | 'level_completion' | 'perfect_accuracy' | 'speed_completion' | 'streak' | 'no_mistakes';
    target?: number;
    levelId?: number;
    timeLimit?: number;
  };
  points: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_steps',
    name: 'First Steps',
    description: 'Complete your first level',
    icon: '👶',
    category: 'completion',
    requirements: { type: 'level_completion', levelId: 1 },
    points: 10,
    rarity: 'common'
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Complete a level in under 30 seconds',
    icon: '⚡',
    category: 'speed',
    requirements: { type: 'speed_completion', timeLimit: 30 },
    points: 50,
    rarity: 'rare'
  },
  {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: 'Complete a level with 100% accuracy',
    icon: '💯',
    category: 'accuracy',
    requirements: { type: 'perfect_accuracy' },
    points: 30,
    rarity: 'rare'
  },
  {
    id: 'streak_master',
    name: 'Streak Master',
    description: 'Get 10 correct answers in a row',
    icon: '🔥',
    category: 'special',
    requirements: { type: 'streak', target: 10 },
    points: 40,
    rarity: 'epic'
  },
  {
    id: 'no_mistakes',
    name: 'Flawless Victory',
    description: 'Complete a level without any mistakes',
    icon: '🏆',
    category: 'accuracy',
    requirements: { type: 'no_mistakes' },
    points: 25,
    rarity: 'rare'
  },
  {
    id: 'high_scorer',
    name: 'High Scorer',
    description: 'Reach a total score of 1000 points',
    icon: '🎯',
    category: 'score',
    requirements: { type: 'total_score', target: 1000 },
    points: 100,
    rarity: 'epic'
  },
  {
    id: 'tutorial_master',
    name: 'Tutorial Master',
    description: 'Complete all tutorial levels with 3 stars',
    icon: '🌟',
    category: 'completion',
    requirements: { type: 'level_completion', levelId: 3 },
    points: 75,
    rarity: 'epic'
  },
  {
    id: 'lightning_fast',
    name: 'Lightning Fast',
    description: 'Complete a level in under 15 seconds',
    icon: '⚡⚡',
    category: 'speed',
    requirements: { type: 'speed_completion', timeLimit: 15 },
    points: 100,
    rarity: 'legendary'
  }
];

export function checkAchievements(
  gameState: LevelGameState,
  playerStats: any,
  previousAchievements: string[]
): Achievement[] {
  const newAchievements: Achievement[] = [];

  for (const achievement of ACHIEVEMENTS) {
    if (previousAchievements.includes(achievement.id)) {
      continue; // Already earned
    }

    let earned = false;

    switch (achievement.requirements.type) {
      case 'level_completion':
        if (gameState.gameWon && gameState.currentLevel.id === achievement.requirements.levelId) {
          earned = true;
        }
        break;

      case 'perfect_accuracy':
        if (gameState.gameWon && gameState.accuracy === 100) {
          earned = true;
        }
        break;

      case 'speed_completion':
        const timeUsed = gameState.currentLevel.parameters.timeLimit - gameState.timeLeft;
        if (gameState.gameWon && timeUsed <= (achievement.requirements.timeLimit || 0)) {
          earned = true;
        }
        break;

      case 'streak':
        if (gameState.currentStreak >= (achievement.requirements.target || 0)) {
          earned = true;
        }
        break;

      case 'no_mistakes':
        if (gameState.gameWon && gameState.incorrectGuesses === 0) {
          earned = true;
        }
        break;

      case 'total_score':
        if (playerStats.totalScore >= (achievement.requirements.target || 0)) {
          earned = true;
        }
        break;
    }

    if (earned) {
      newAchievements.push(achievement);
    }
  }

  return newAchievements;
}

// === POWER-UPS SYSTEM ===

export interface PowerUp {
  id: string;
  name: string;
  description: string;
  icon: string;
  effect: 'reveal_targets' | 'slow_enemies' | 'extra_time' | 'double_points' | 'freeze_enemies';
  duration: number; // in seconds, -1 for instant
  cost: number; // points cost
  rarity: 'common' | 'rare' | 'epic';
}

export const POWER_UPS: PowerUp[] = [
  {
    id: 'reveal',
    name: 'Target Reveal',
    description: 'Reveals all correct answers for 5 seconds',
    icon: '👁️',
    effect: 'reveal_targets',
    duration: 5,
    cost: 50,
    rarity: 'common'
  },
  {
    id: 'slow_motion',
    name: 'Slow Motion',
    description: 'Slows down all enemies for 10 seconds',
    icon: '🐌',
    effect: 'slow_enemies',
    duration: 10,
    cost: 75,
    rarity: 'rare'
  },
  {
    id: 'time_boost',
    name: 'Time Boost',
    description: 'Adds 15 seconds to the timer',
    icon: '⏰',
    effect: 'extra_time',
    duration: -1,
    cost: 100,
    rarity: 'rare'
  },
  {
    id: 'double_score',
    name: 'Double Points',
    description: 'Double points for 15 seconds',
    icon: '2️⃣',
    effect: 'double_points',
    duration: 15,
    cost: 125,
    rarity: 'epic'
  },
  {
    id: 'freeze',
    name: 'Freeze Enemies',
    description: 'Freezes all enemies for 8 seconds',
    icon: '❄️',
    effect: 'freeze_enemies',
    duration: 8,
    cost: 150,
    rarity: 'epic'
  }
];

// === REWARD CALCULATION ===

export function calculateLevelRewards(
  finalScore: number,
  starsEarned: number,
  achievements: Achievement[],
  objectives: LevelObjective[],
  completedObjectives: string[]
): {
  totalPoints: number;
  achievements: Achievement[];
  objectiveRewards: number;
  starBonus: number;
} {
  // Achievement points
  const achievementPoints = achievements.reduce((total, ach) => total + ach.points, 0);

  // Objective completion rewards
  const objectiveRewards = completedObjectives.reduce((total, objId) => {
    const objective = objectives.find(obj => obj.id === objId);
    return total + (objective?.points || 0);
  }, 0);

  // Star bonus (multiplicative)
  const starBonus = starsEarned * 25; // 25 points per star

  const totalPoints = finalScore + achievementPoints + objectiveRewards + starBonus;

  return {
    totalPoints,
    achievements,
    objectiveRewards,
    starBonus
  };
}
