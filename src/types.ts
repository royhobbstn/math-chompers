// Types for the Number Munchers game

export type Cell = {
  value: number | string;
  isTarget: boolean;
  hasMuncher: boolean;
  hasTroggle: boolean;
  troggleType?: EnemyType; // Track the type of Troggle in this cell
  revealed?: boolean; // Optional property for delayed reveal feature
  munchedCorrect?: boolean; // Track if this was munched as a correct answer
};

export type Position = {
  row: number;
  col: number;
};

export type GameRule = 'multiples' | 'factors' | 'primes' | 'addition' | 'subtraction' | 'mixed';

export interface GameState {
  grid: Cell[][];
  muncher: Position;
  troggles: Position[];
  rule: GameRule;
  targetNumber: number;
  score: number;
  gameOver: boolean;
}

// Extend GameState to always include incorrectGuesses
export type GameStateWithGuesses = GameState & { incorrectGuesses: number };

// === LEVEL SYSTEM TYPES ===

export type LevelCategory = 'tutorial' | 'basic' | 'intermediate' | 'advanced' | 'master';

export type EnemyType = 'standard' | 'speed' | 'smart' | 'blocker' | 'hunter';

export type DifficultyModifier = 
  | 'extraTime' 
  | 'lessTime' 
  | 'moreTargets' 
  | 'lessTargets' 
  | 'fasterEnemies' 
  | 'slowerEnemies'
  | 'moreEnemies'
  | 'smarterEnemies';

export interface LevelRequirements {
  minScore: number;           // Minimum score to unlock
  previousLevel: number;      // Must complete this level first
  bonusObjectives?: number;   // Optional: bonus challenges completed
  accuracy?: number;          // Optional: minimum accuracy percentage
  starsRequired?: number;     // Optional: minimum stars from previous levels
}

export interface LevelParameters {
  gridSize: { rows: number; cols: number; };
  timeLimit: number;
  rule: GameRule;
  targetNumber?: number;
  enemyCount: number;
  enemyTypes: EnemyType[];
  difficultyModifiers: DifficultyModifier[];
  numberRange?: { min: number; max: number; };
  targetCount?: { min: number; max: number; };
}

export interface LevelObjective {
  id: string;
  description: string;
  type: 'primary' | 'bonus';
  condition: 'complete' | 'score' | 'time' | 'accuracy' | 'noMistakes';
  target?: number;           // Target value for score/time/accuracy objectives
  points: number;            // Points awarded for completing this objective
  required: boolean;         // Whether this objective is required to pass the level
}

export interface LevelReward {
  type: 'points' | 'stars' | 'badge' | 'unlock';
  value: number | string;
  description: string;
}

export interface Level {
  id: number;
  name: string;
  description: string;
  category: LevelCategory;
  requirements: LevelRequirements;
  parameters: LevelParameters;
  objectives: LevelObjective[];
  rewards: LevelReward[];
  isUnlocked?: boolean;      // Runtime property for UI
  bestScore?: number;        // Runtime property for save data
  starsEarned?: number;      // Runtime property for save data (0-3)
  completed?: boolean;       // Runtime property for save data
}

export interface LevelProgress {
  levelId: number;
  completed: boolean;
  bestScore: number;
  starsEarned: number;       // 0-3 stars
  attempts: number;
  totalTime: number;         // Total time spent on this level
  firstCompletedAt?: Date;
  lastPlayedAt: Date;
  objectivesCompleted: string[]; // IDs of completed objectives
}

export interface PlayerStats {
  totalScore: number;
  totalStars: number;
  levelsCompleted: number;
  totalPlayTime: number;
  averageAccuracy: number;
  bestStreak: number;
  favoriteRule: GameRule;
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface GameSession {
  levelId: number;
  startTime: Date;
  endTime?: Date;
  finalScore: number;
  accuracy: number;
  starsEarned: number;
  objectivesCompleted: string[];
  mistakes: number;
  timeRemaining: number;
}

// Enhanced game state that includes level information
export interface LevelGameState extends GameStateWithGuesses {
  currentLevel: Level;
  session: GameSession;
  objectives: LevelObjective[];
  completedObjectives: string[];
  timeLeft: number;
  puzzlesSolved: number;
  accuracy: number;
  currentStreak: number;
  gameWon?: boolean;  // Add gameWon property for level completion
}

export interface LevelScoring {
  basePoints: number;         // Points per correct answer
  timeBonus: number;          // Bonus for remaining time
  accuracyMultiplier: number; // Multiplier based on accuracy
  difficultyBonus: number;    // Bonus based on level difficulty
  streakBonus: number;        // Bonus for consecutive correct answers
  objectiveBonus: number;     // Bonus for completed objectives
}

// === ENEMY AI TYPES ===

export interface EnemyAI {
  type: EnemyType;
  speed: number;              // Movement speed multiplier
  intelligence: number;       // 0-1, how smart the AI is
  aggressiveness: number;     // 0-1, how much it pursues the player
  coordination: boolean;      // Whether it coordinates with other enemies
  specialAbility?: string;    // Special behavior description
}

export interface TroggleState {
  position: Position;
  type: EnemyType;
  ai: EnemyAI;
  lastMove: Date;
  target?: Position;          // Current target position for smart AI
  path?: Position[];          // Planned path for pathfinding AI
  cooldown?: number;          // Frames until next move (for speed control)
}

// === SAVE DATA TYPES ===

export interface SaveData {
  playerStats: PlayerStats;
  levelProgress: Record<number, LevelProgress>;
  unlockedLevels: number[];
  settings: GameSettings;
  achievements: string[]; // Store achievement IDs as strings
  lastPlayed: Date;
  version: string;
}

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  difficulty: 'easy' | 'normal' | 'hard';
  showHints: boolean;
  autoSave: boolean;
  animations: boolean;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
  progress?: number;          // For progressive achievements
  maxProgress?: number;       // For progressive achievements
}
