import type { 
  Level, 
  LevelCategory, 
  LevelParameters
} from './types';

// === LEVEL CONFIGURATION ===

export const LEVEL_CATEGORIES = {
  tutorial: { name: 'Tutorial', color: '#4CAF50', maxLevel: 3 },
  basic: { name: 'Basic', color: '#2196F3', maxLevel: 8 },
  intermediate: { name: 'Intermediate', color: '#FF9800', maxLevel: 15 },
  advanced: { name: 'Advanced', color: '#F44336', maxLevel: 25 },
  master: { name: 'Master', color: '#9C27B0', maxLevel: 999 }
} as const;

// === LEVEL DEFINITIONS ===

export const LEVELS: Level[] = [
  // TUTORIAL LEVELS (1-3)
  {
    id: 1,
    name: "First Steps",
    description: "Learn the basics! Eat all multiples of 2.",
    category: 'tutorial',
    requirements: { minScore: 0, previousLevel: 0 },
    parameters: {
      gridSize: { rows: 4, cols: 5 },
      timeLimit: 90,
      rule: 'multiples',
      targetNumber: 2,
      enemyCount: 1,
      enemyTypes: ['standard'],
      difficultyModifiers: ['slowerEnemies'],
      numberRange: { min: 2, max: 20 },
      targetCount: { min: 3, max: 5 }
    },
    objectives: [
      {
        id: 'complete',
        description: 'Eat all multiples of 2',
        type: 'primary',
        condition: 'complete',
        points: 50,
        required: true
      },
      {
        id: 'no_mistakes',
        description: 'Complete without mistakes',
        type: 'bonus',
        condition: 'noMistakes',
        points: 25,
        required: false
      }
    ],
    rewards: [
      { type: 'points', value: 50, description: 'Level completion bonus' },
      { type: 'stars', value: 1, description: 'First star earned!' }
    ]
  },
  
  {
    id: 2,
    name: "Three Times Fun",
    description: "Master multiples of 3. They're everywhere!",
    category: 'tutorial',
    requirements: { minScore: 30, previousLevel: 1 },
    parameters: {
      gridSize: { rows: 4, cols: 5 },
      timeLimit: 90,
      rule: 'multiples',
      targetNumber: 3,
      enemyCount: 1,
      enemyTypes: ['standard'],
      difficultyModifiers: ['slowerEnemies'],
      numberRange: { min: 3, max: 24 },
      targetCount: { min: 4, max: 6 }
    },
    objectives: [
      {
        id: 'complete',
        description: 'Eat all multiples of 3',
        type: 'primary',
        condition: 'complete',
        points: 60,
        required: true
      },
      {
        id: 'time_bonus',
        description: 'Complete with 30+ seconds remaining',
        type: 'bonus',
        condition: 'time',
        target: 30,
        points: 30,
        required: false
      }
    ],
    rewards: [
      { type: 'points', value: 60, description: 'Level completion bonus' }
    ]
  },

  {
    id: 3,
    name: "High Five",
    description: "Count by fives! Find all multiples of 5.",
    category: 'tutorial',
    requirements: { minScore: 50, previousLevel: 2 },
    parameters: {
      gridSize: { rows: 4, cols: 5 },
      timeLimit: 85,
      rule: 'multiples',
      targetNumber: 5,
      enemyCount: 1,
      enemyTypes: ['standard'],
      difficultyModifiers: [],
      numberRange: { min: 5, max: 50 },
      targetCount: { min: 4, max: 6 }
    },
    objectives: [
      {
        id: 'complete',
        description: 'Eat all multiples of 5',
        type: 'primary',
        condition: 'complete',
        points: 70,
        required: true
      },
      {
        id: 'high_score',
        description: 'Score 150+ points',
        type: 'bonus',
        condition: 'score',
        target: 150,
        points: 35,
        required: false
      }
    ],
    rewards: [
      { type: 'points', value: 70, description: 'Level completion bonus' },
      { type: 'unlock', value: 'basic_levels', description: 'Basic levels unlocked!' }
    ]
  },

  // BASIC LEVELS (4-8)
  {
    id: 4,
    name: "Factor Hunt",
    description: "Find the factors of 12. What divides evenly?",
    category: 'basic',
    requirements: { minScore: 80, previousLevel: 3 },
    parameters: {
      gridSize: { rows: 5, cols: 6 },
      timeLimit: 60,
      rule: 'factors',
      targetNumber: 12,
      enemyCount: 1,
      enemyTypes: ['standard'],
      difficultyModifiers: [],
      numberRange: { min: 1, max: 25 },
      targetCount: { min: 4, max: 6 }
    },
    objectives: [
      {
        id: 'complete',
        description: 'Find all factors of 12',
        type: 'primary',
        condition: 'complete',
        points: 80,
        required: true
      },
      {
        id: 'accuracy',
        description: 'Maintain 80%+ accuracy',
        type: 'bonus',
        condition: 'accuracy',
        target: 80,
        points: 40,
        required: false
      }
    ],
    rewards: [
      { type: 'points', value: 80, description: 'Level completion bonus' }
    ]
  },

  {
    id: 5,
    name: "Lucky Seven",
    description: "Multiples of 7 - can you spot them all?",
    category: 'basic',
    requirements: { minScore: 100, previousLevel: 4 },
    parameters: {
      gridSize: { rows: 5, cols: 6 },
      timeLimit: 60,
      rule: 'multiples',
      targetNumber: 7,
      enemyCount: 2,
      enemyTypes: ['standard', 'speed'],
      difficultyModifiers: [],
      numberRange: { min: 7, max: 49 },
      targetCount: { min: 5, max: 7 }
    },
    objectives: [
      {
        id: 'complete',
        description: 'Eat all multiples of 7',
        type: 'primary',
        condition: 'complete',
        points: 90,
        required: true
      },
      {
        id: 'speed_bonus',
        description: 'Complete in under 45 seconds',
        type: 'bonus',
        condition: 'time',
        target: 15, // 15 seconds remaining = 45 seconds used
        points: 45,
        required: false
      }
    ],
    rewards: [
      { type: 'points', value: 90, description: 'Level completion bonus' }
    ]
  },

  {
    id: 6,
    name: "Prime Time",
    description: "Hunt for prime numbers! Only divisible by 1 and themselves.",
    category: 'basic',
    requirements: { minScore: 120, previousLevel: 5 },
    parameters: {
      gridSize: { rows: 5, cols: 6 },
      timeLimit: 70,
      rule: 'primes',
      enemyCount: 2,
      enemyTypes: ['standard', 'standard'],
      difficultyModifiers: [],
      numberRange: { min: 2, max: 30 },
      targetCount: { min: 5, max: 8 }
    },
    objectives: [
      {
        id: 'complete',
        description: 'Find all prime numbers',
        type: 'primary',
        condition: 'complete',
        points: 100,
        required: true
      },
      {
        id: 'perfect_accuracy',
        description: 'No incorrect guesses',
        type: 'bonus',
        condition: 'noMistakes',
        points: 50,
        required: false
      }
    ],
    rewards: [
      { type: 'points', value: 100, description: 'Level completion bonus' },
      { type: 'badge', value: 'prime_hunter', description: 'Prime Hunter badge earned!' }
    ]
  },

  {
    id: 7,
    name: "Factor Challenge",
    description: "Factors of 18 - there are quite a few!",
    category: 'basic',
    requirements: { minScore: 150, previousLevel: 6 },
    parameters: {
      gridSize: { rows: 5, cols: 6 },
      timeLimit: 55,
      rule: 'factors',
      targetNumber: 18,
      enemyCount: 2,
      enemyTypes: ['standard', 'speed'],
      difficultyModifiers: ['lessTime'],
      numberRange: { min: 1, max: 30 },
      targetCount: { min: 5, max: 7 }
    },
    objectives: [
      {
        id: 'complete',
        description: 'Find all factors of 18',
        type: 'primary',
        condition: 'complete',
        points: 110,
        required: true
      },
      {
        id: 'dodge_master',
        description: 'Avoid the speed Troggle',
        type: 'bonus',
        condition: 'noMistakes', // No collisions
        points: 55,
        required: false
      }
    ],
    rewards: [
      { type: 'points', value: 110, description: 'Level completion bonus' }
    ]
  },

  {
    id: 8,
    name: "Eight is Great",
    description: "Multiples of 8 to complete Basic training!",
    category: 'basic',
    requirements: { minScore: 180, previousLevel: 7 },
    parameters: {
      gridSize: { rows: 5, cols: 6 },
      timeLimit: 50,
      rule: 'multiples',
      targetNumber: 8,
      enemyCount: 2,
      enemyTypes: ['standard', 'speed'],
      difficultyModifiers: ['lessTime'],
      numberRange: { min: 8, max: 64 },
      targetCount: { min: 6, max: 8 }
    },
    objectives: [
      {
        id: 'complete',
        description: 'Eat all multiples of 8',
        type: 'primary',
        condition: 'complete',
        points: 120,
        required: true
      },
      {
        id: 'high_score',
        description: 'Score 300+ points',
        type: 'bonus',
        condition: 'score',
        target: 300,
        points: 60,
        required: false
      }
    ],
    rewards: [
      { type: 'points', value: 120, description: 'Level completion bonus' },
      { type: 'unlock', value: 'intermediate_levels', description: 'Intermediate levels unlocked!' },
      { type: 'badge', value: 'basic_graduate', description: 'Basic Graduate badge earned!' }
    ]
  },

  // INTERMEDIATE LEVELS (9-10 for now, more will be added)
  {
    id: 9,
    name: "Addition Action",
    description: "Find sums that equal 10. Math in action!",
    category: 'intermediate',
    requirements: { minScore: 200, previousLevel: 8 },
    parameters: {
      gridSize: { rows: 5, cols: 6 },
      timeLimit: 60,
      rule: 'addition',
      targetNumber: 10,
      enemyCount: 2,
      enemyTypes: ['standard', 'smart'],
      difficultyModifiers: [],
      numberRange: { min: 0, max: 15 },
      targetCount: { min: 6, max: 9 }
    },
    objectives: [
      {
        id: 'complete',
        description: 'Find all addition problems that equal 10',
        type: 'primary',
        condition: 'complete',
        points: 130,
        required: true
      },
      {
        id: 'efficiency',
        description: 'Complete with minimal moves',
        type: 'bonus',
        condition: 'score',
        target: 400,
        points: 65,
        required: false
      }
    ],
    rewards: [
      { type: 'points', value: 130, description: 'Level completion bonus' }
    ]
  },

  {
    id: 10,
    name: "Subtraction Station",
    description: "Differences that equal 5. Think carefully!",
    category: 'intermediate',
    requirements: { minScore: 230, previousLevel: 9 },
    parameters: {
      gridSize: { rows: 6, cols: 7 },
      timeLimit: 55,
      rule: 'subtraction',
      targetNumber: 5,
      enemyCount: 3,
      enemyTypes: ['standard', 'smart', 'speed'],
      difficultyModifiers: ['moreEnemies'],
      numberRange: { min: 0, max: 20 },
      targetCount: { min: 6, max: 10 }
    },
    objectives: [
      {
        id: 'complete',
        description: 'Find all subtraction problems that equal 5',
        type: 'primary',
        condition: 'complete',
        points: 140,
        required: true
      },
      {
        id: 'survivor',
        description: 'Survive against 3 Troggles',
        type: 'bonus',
        condition: 'noMistakes',
        points: 70,
        required: false
      }
    ],
    rewards: [
      { type: 'points', value: 140, description: 'Level completion bonus' },
      { type: 'badge', value: 'intermediate_challenger', description: 'Intermediate Challenger!' }
    ]
  }
];

// === LEVEL UTILITY FUNCTIONS ===

export function getLevelById(id: number): Level | undefined {
  return LEVELS.find(level => level.id === id);
}

export function getLevelsByCategory(category: LevelCategory): Level[] {
  return LEVELS.filter(level => level.category === category);
}

export function getNextLevel(currentLevelId: number): Level | undefined {
  return LEVELS.find(level => level.id === currentLevelId + 1);
}

export function isLevelUnlocked(levelId: number, completedLevels: number[], playerStats?: any): boolean {
  const level = getLevelById(levelId);
  if (!level) return false;
  
  // Level 1 is always unlocked
  if (levelId === 1) return true;
  
  // Check if previous level is completed
  const previousLevelCompleted = completedLevels.includes(level.requirements.previousLevel);
  if (!previousLevelCompleted) return false;
  
  // Check minimum score requirement (if we have player stats)
  if (playerStats && playerStats.totalScore < level.requirements.minScore) {
    return false;
  }
  
  return true;
}

export function calculateLevelStars(score: number, objectives: string[], level: Level): number {
  let stars = 0;
  
  // 1 star for completion
  stars = 1;
  
  // 2nd star for good performance (complete all primary objectives + some bonus)
  const bonusObjectives = level.objectives.filter(obj => obj.type === 'bonus');
  const completedBonus = objectives.filter(id => 
    bonusObjectives.some(obj => obj.id === id)
  ).length;
  
  if (completedBonus >= 1) {
    stars = 2;
  }
  
  // 3rd star for excellent performance (all objectives + high score)
  if (completedBonus === bonusObjectives.length && score >= getMinimumThreeStarScore(level)) {
    stars = 3;
  }
  
  return stars;
}

export function getMinimumThreeStarScore(level: Level): number {
  const baseScore = level.objectives
    .filter(obj => obj.type === 'primary')
    .reduce((sum, obj) => sum + obj.points, 0);
  
  // Three stars require roughly 150% of base objective points
  return Math.floor(baseScore * 1.5);
}

export function generateLevelParameters(level: Level): LevelParameters {
  // Apply difficulty modifiers to base parameters
  let params = { ...level.parameters };
  
  level.parameters.difficultyModifiers.forEach(modifier => {
    switch (modifier) {
      case 'extraTime':
        params.timeLimit += 15;
        break;
      case 'lessTime':
        params.timeLimit -= 10;
        break;
      case 'moreTargets':
        if (params.targetCount) {
          params.targetCount.min += 1;
          params.targetCount.max += 2;
        }
        break;
      case 'lessTargets':
        if (params.targetCount) {
          params.targetCount.min = Math.max(2, params.targetCount.min - 1);
          params.targetCount.max = Math.max(3, params.targetCount.max - 1);
        }
        break;
      case 'fasterEnemies':
        // This will be handled in enemy AI logic
        break;
      case 'slowerEnemies':
        // This will be handled in enemy AI logic
        break;
      case 'moreEnemies':
        params.enemyCount += 1;
        break;
      case 'smarterEnemies':
        // This will be handled in enemy AI logic
        break;
    }
  });
  
  return params;
}

export function validateLevel(level: Level): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (level.id <= 0) {
    errors.push('Level ID must be positive');
  }
  
  if (!level.name.trim()) {
    errors.push('Level name is required');
  }
  
  if (level.parameters.timeLimit <= 0) {
    errors.push('Time limit must be positive');
  }
  
  if (level.parameters.enemyCount < 0) {
    errors.push('Enemy count cannot be negative');
  }
  
  if (level.parameters.gridSize.rows < 3 || level.parameters.gridSize.cols < 3) {
    errors.push('Grid must be at least 3x3');
  }
  
  if (level.objectives.filter(obj => obj.required).length === 0) {
    errors.push('At least one required objective must be defined');
  }
  
  return { valid: errors.length === 0, errors };
}

// Export level count for easy reference
export const TOTAL_LEVELS = LEVELS.length;
export const LEVELS_BY_CATEGORY = {
  tutorial: getLevelsByCategory('tutorial').length,
  basic: getLevelsByCategory('basic').length,
  intermediate: getLevelsByCategory('intermediate').length,
  advanced: getLevelsByCategory('advanced').length,
  master: getLevelsByCategory('master').length
};
