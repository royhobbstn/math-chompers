import type { 
  LevelGameState, 
  GameSession, 
  LevelObjective,
  SaveData,
  LevelProgress 
} from './types';
import { getLevelById, generateLevelParameters, calculateLevelStars, isLevelUnlocked } from './levels';
import { generateGrid, getRandomEmptyPosition } from './gameUtils';

// === LEVEL-BASED GAME STATE MANAGEMENT ===

export function initializeLevelGameState(levelId: number, existingSave?: SaveData): LevelGameState | null {
  const level = getLevelById(levelId);
  if (!level) {
    console.error(`Level ${levelId} not found`);
    return null;
  }

  // Check if level is unlocked
  const completedLevels = existingSave ? Object.keys(existingSave.levelProgress).map(Number) : [];
  if (!isLevelUnlocked(levelId, completedLevels, existingSave?.playerStats)) {
    console.error(`Level ${levelId} is not unlocked`);
    return null;
  }

  // Generate level parameters with difficulty modifiers applied
  const params = generateLevelParameters(level);
  
  // Create grid based on level parameters
  const grid = generateGrid(
    params.gridSize.rows,
    params.gridSize.cols,
    params.rule,
    params.targetNumber || 0
  ).map(row => row.map(cell => ({ ...cell, revealed: false })));

  // Place Muncher at a random position
  const muncherPosition = getRandomEmptyPosition(grid);
  grid[muncherPosition.row][muncherPosition.col].hasMuncher = true;

  // Place Troggles based on level parameters
  const troggles = [];
  for (let i = 0; i < params.enemyCount; i++) {
    const trogglePosition = getRandomEmptyPosition(grid);
    grid[trogglePosition.row][trogglePosition.col].hasTroggle = true;
    troggles.push(trogglePosition);
  }

  // Initialize game session
  const session: GameSession = {
    levelId,
    startTime: new Date(),
    finalScore: 0,
    accuracy: 100,
    starsEarned: 0,
    objectivesCompleted: [],
    mistakes: 0,
    timeRemaining: params.timeLimit
  };

  // Create initial game state
  const gameState: LevelGameState = {
    // Base game state
    grid,
    muncher: muncherPosition,
    troggles,
    rule: params.rule,
    targetNumber: params.targetNumber || 0,
    score: 0,
    gameOver: false,
    incorrectGuesses: 0,
    
    // Level-specific state
    currentLevel: level,
    session,
    objectives: level.objectives,
    completedObjectives: [],
    timeLeft: params.timeLimit,
    puzzlesSolved: 0,
    accuracy: 100,
    currentStreak: 0
  };

  return gameState;
}

export function updateLevelProgress(
  state: LevelGameState,
  action: 'move' | 'eat_correct' | 'eat_incorrect' | 'time_tick' | 'complete'
): LevelGameState {
  const newState = { ...state };
  
  switch (action) {
    case 'move':
      // No specific level progress updates for movement
      break;
      
    case 'eat_correct':
      newState.currentStreak += 1;
      newState.puzzlesSolved += 1;
      
      // Check if any objectives were completed
      newState.objectives.forEach(objective => {
        if (!newState.completedObjectives.includes(objective.id)) {
          if (checkObjectiveCompletion(objective, newState)) {
            newState.completedObjectives.push(objective.id);
            newState.score += objective.points;
          }
        }
      });
      break;
      
    case 'eat_incorrect':
      newState.currentStreak = 0;
      newState.session.mistakes += 1;
      newState.accuracy = calculateAccuracy(newState.puzzlesSolved, newState.session.mistakes);
      break;
      
    case 'time_tick':
      newState.timeLeft = Math.max(0, newState.timeLeft - 1);
      newState.session.timeRemaining = newState.timeLeft;
      
      if (newState.timeLeft === 0) {
        newState.gameOver = true;
      }
      break;
      
    case 'complete':
      newState.session.endTime = new Date();
      newState.session.finalScore = newState.score;
      newState.session.starsEarned = calculateLevelStars(
        newState.score,
        newState.completedObjectives,
        newState.currentLevel
      );
      break;
  }
  
  return newState;
}

function checkObjectiveCompletion(objective: LevelObjective, state: LevelGameState): boolean {
  switch (objective.condition) {
    case 'complete':
      // Check if all targets are eaten
      return !state.grid.flat().some(cell => cell.isTarget);
      
    case 'score':
      return objective.target ? state.score >= objective.target : false;
      
    case 'time':
      return objective.target ? state.timeLeft >= objective.target : false;
      
    case 'accuracy':
      return objective.target ? state.accuracy >= objective.target : false;
      
    case 'noMistakes':
      return state.session.mistakes === 0;
      
    default:
      return false;
  }
}

function calculateAccuracy(correct: number, incorrect: number): number {
  const total = correct + incorrect;
  if (total === 0) return 100;
  return Math.round((correct / total) * 100);
}

// === SAVE DATA MANAGEMENT ===

export function getDefaultSaveData(): SaveData {
  return {
    playerStats: {
      totalScore: 0,
      totalStars: 0,
      levelsCompleted: 0,
      totalPlayTime: 0,
      averageAccuracy: 100,
      bestStreak: 0,
      favoriteRule: 'multiples',
      skillLevel: 'beginner'
    },
    levelProgress: {},
    unlockedLevels: [1], // Level 1 is always unlocked
    settings: {
      soundEnabled: true,
      musicEnabled: true,
      difficulty: 'normal',
      showHints: true,
      autoSave: true,
      animations: true
    },
    achievements: [],
    lastPlayed: new Date(),
    version: '1.0.0'
  };
}

export function loadSaveData(): SaveData {
  try {
    const saved = localStorage.getItem('munchers-save-data');
    if (saved) {
      const data = JSON.parse(saved) as SaveData;
      // Migrate old save data if needed
      return migrateSaveData(data);
    }
  } catch (error) {
    console.error('Error loading save data:', error);
  }
  
  return getDefaultSaveData();
}

export function saveLevelProgress(levelId: number, session: GameSession, saveData: SaveData): SaveData {
  const newSaveData = { ...saveData };
  
  // Update level progress
  const progress: LevelProgress = {
    levelId,
    completed: session.starsEarned > 0,
    bestScore: Math.max(session.finalScore, newSaveData.levelProgress[levelId]?.bestScore || 0),
    starsEarned: Math.max(session.starsEarned, newSaveData.levelProgress[levelId]?.starsEarned || 0),
    attempts: (newSaveData.levelProgress[levelId]?.attempts || 0) + 1,
    totalTime: (newSaveData.levelProgress[levelId]?.totalTime || 0) + getSessionDuration(session),
    firstCompletedAt: newSaveData.levelProgress[levelId]?.firstCompletedAt || (session.starsEarned > 0 ? session.endTime : undefined),
    lastPlayedAt: new Date(),
    objectivesCompleted: [...new Set([
      ...(newSaveData.levelProgress[levelId]?.objectivesCompleted || []),
      ...session.objectivesCompleted
    ])]
  };
  
  newSaveData.levelProgress[levelId] = progress;
  
  // Update player stats
  newSaveData.playerStats.totalScore += session.finalScore;
  newSaveData.playerStats.totalStars += session.starsEarned;
  if (session.starsEarned > 0) {
    newSaveData.playerStats.levelsCompleted += 1;
  }
  newSaveData.playerStats.totalPlayTime += getSessionDuration(session);
  
  // Update unlocked levels (unlock next level if this one was completed)
  if (session.starsEarned > 0) {
    const nextLevelId = levelId + 1;
    if (!newSaveData.unlockedLevels.includes(nextLevelId)) {
      newSaveData.unlockedLevels.push(nextLevelId);
    }
  }
  
  newSaveData.lastPlayed = new Date();
  
  // Save to localStorage
  try {
    localStorage.setItem('munchers-save-data', JSON.stringify(newSaveData));
  } catch (error) {
    console.error('Error saving data:', error);
  }
  
  return newSaveData;
}

function getSessionDuration(session: GameSession): number {
  if (!session.endTime) return 0;
  return session.endTime.getTime() - session.startTime.getTime();
}

function migrateSaveData(data: any): SaveData {
  // Handle migration from older save formats
  const defaultData = getDefaultSaveData();
  
  return {
    ...defaultData,
    ...data,
    // Ensure all required fields exist
    playerStats: { ...defaultData.playerStats, ...data.playerStats },
    settings: { ...defaultData.settings, ...data.settings },
    levelProgress: data.levelProgress || {},
    unlockedLevels: data.unlockedLevels || [1],
    achievements: data.achievements || [],
    lastPlayed: data.lastPlayed ? new Date(data.lastPlayed) : new Date(),
    version: data.version || '1.0.0'
  };
}

// === LEVEL PROGRESSION HELPERS ===

export function getUnlockedLevels(saveData: SaveData): number[] {
  return saveData.unlockedLevels;
}

export function getCompletedLevels(saveData: SaveData): number[] {
  return Object.values(saveData.levelProgress)
    .filter(progress => progress.completed)
    .map(progress => progress.levelId);
}

export function getTotalStars(saveData: SaveData): number {
  return Object.values(saveData.levelProgress)
    .reduce((total, progress) => total + progress.starsEarned, 0);
}

export function getRecommendedLevel(saveData: SaveData): number {
  const unlockedLevels = getUnlockedLevels(saveData);
  const completedLevels = getCompletedLevels(saveData);
  
  // Find the first unlocked but not completed level
  const incompleteLevel = unlockedLevels.find(levelId => !completedLevels.includes(levelId));
  
  if (incompleteLevel) {
    return incompleteLevel;
  }
  
  // If all unlocked levels are complete, return the highest unlocked level
  return Math.max(...unlockedLevels);
}
