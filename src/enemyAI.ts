import type { Position, EnemyType, EnemyAI, TroggleState, LevelGameState } from './types';
import { randInt } from './gameUtils';

// === ENEMY AI SYSTEM ===

export function createEnemyAI(type: EnemyType, difficultyLevel: number = 1): EnemyAI {
  switch (type) {
    case 'standard':
      return {
        type: 'standard',
        speed: 1.0,
        intelligence: 0.1 + (difficultyLevel * 0.1),
        aggressiveness: 0.2 + (difficultyLevel * 0.05),
        coordination: false,
        specialAbility: 'Basic random movement with occasional player tracking'
      };
      
    case 'speed':
      return {
        type: 'speed',
        speed: 1.5 + (difficultyLevel * 0.2),
        intelligence: 0.3,
        aggressiveness: 0.4,
        coordination: false,
        specialAbility: 'Moves faster than normal Troggles'
      };
      
    case 'smart':
      return {
        type: 'smart',
        speed: 0.8,
        intelligence: 0.7 + (difficultyLevel * 0.1),
        aggressiveness: 0.6,
        coordination: false,
        specialAbility: 'Uses pathfinding to pursue the player intelligently'
      };
      
    case 'blocker':
      return {
        type: 'blocker',
        speed: 0.5,
        intelligence: 0.4,
        aggressiveness: 0.8,
        coordination: true,
        specialAbility: 'Guards important areas and blocks player movement'
      };
      
    case 'hunter':
      return {
        type: 'hunter',
        speed: 1.2,
        intelligence: 0.8,
        aggressiveness: 0.9,
        coordination: true,
        specialAbility: 'Actively hunts the player with coordinated movement'
      };
      
    default:
      return createEnemyAI('standard', difficultyLevel);
  }
}

export function calculateNextMove(
  troggle: TroggleState, 
  gameState: LevelGameState,
  allTroggles: TroggleState[]
): Position {
  const { position, ai } = troggle;
  const muncher = gameState.muncher;
  const grid = gameState.grid;
  
  // Apply speed control - some enemies move slower/faster
  if (troggle.cooldown && troggle.cooldown > 0) {
    return position; // Don't move this turn
  }
  
  switch (ai.type) {
    case 'standard':
      return calculateStandardMove(position, muncher, grid, ai);
      
    case 'speed':
      return calculateSpeedMove(position, muncher, grid, ai);
      
    case 'smart':
      return calculateSmartMove(position, muncher, grid, ai, troggle);
      
    case 'blocker':
      return calculateBlockerMove(position, muncher, grid, ai, gameState);
      
    case 'hunter':
      return calculateHunterMove(position, muncher, grid, ai, allTroggles);
      
    default:
      return calculateStandardMove(position, muncher, grid, ai);
  }
}

// === MOVEMENT ALGORITHMS ===

function calculateStandardMove(
  position: Position, 
  muncher: Position, 
  grid: any[][], 
  ai: EnemyAI
): Position {
  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  
  // Mix of random movement and occasional tracking
  if (Math.random() < ai.intelligence) {
    // Try to move toward muncher
    return moveTowardTarget(position, muncher, rows, cols);
  } else {
    // Random movement
    return getRandomAdjacentPosition(position, rows, cols);
  }
}

function calculateSpeedMove(
  position: Position, 
  muncher: Position, 
  grid: any[][], 
  ai: EnemyAI
): Position {
  // Speed Troggles are more aggressive and direct
  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  
  if (Math.random() < ai.aggressiveness) {
    return moveTowardTarget(position, muncher, rows, cols);
  } else {
    return getRandomAdjacentPosition(position, rows, cols);
  }
}

function calculateSmartMove(
  position: Position, 
  muncher: Position, 
  grid: any[][], 
  _ai: EnemyAI,
  troggle: TroggleState
): Position {
  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  
  // Smart Troggles use simple pathfinding
  if (!troggle.path || troggle.path.length === 0) {
    // Calculate a path to the muncher using simple A* pathfinding
    troggle.path = findPath(position, muncher, grid);
  }
  
  if (troggle.path && troggle.path.length > 0) {
    const nextStep = troggle.path.shift();
    if (nextStep && isValidPosition(nextStep, rows, cols)) {
      return nextStep;
    }
  }
  
  // Fallback to moving toward target
  return moveTowardTarget(position, muncher, rows, cols);
}

function calculateBlockerMove(
  position: Position, 
  muncher: Position, 
  grid: any[][], 
  _ai: EnemyAI,
  gameState: LevelGameState
): Position {
  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  
  // Blocker Troggles try to position themselves between muncher and targets
  const targets = findNearestTargets(gameState.grid, muncher, 3);
  
  if (targets.length > 0) {
    // Try to block the path to the nearest target
    const target = targets[0];
    const blockPosition = getBlockingPosition(muncher, target, position);
    
    if (blockPosition) {
      return moveTowardTarget(position, blockPosition, rows, cols);
    }
  }
  
  // Fallback to standard movement
  return moveTowardTarget(position, muncher, rows, cols);
}

function calculateHunterMove(
  position: Position, 
  muncher: Position, 
  grid: any[][], 
  _ai: EnemyAI,
  allTroggles: TroggleState[]
): Position {
  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  
  // Hunter Troggles coordinate with other hunters to surround the player
  const otherHunters = allTroggles.filter(t => 
    t.ai.type === 'hunter' && t.position !== position
  );
  
  if (otherHunters.length > 0) {
    // Try to coordinate positioning to surround the muncher
    const surroundPosition = calculateSurroundPosition(muncher, position, otherHunters);
    if (surroundPosition) {
      return moveTowardTarget(position, surroundPosition, rows, cols);
    }
  }
  
  // Direct pursuit with high aggression
  return moveTowardTarget(position, muncher, rows, cols);
}

// === UTILITY FUNCTIONS ===

function moveTowardTarget(
  current: Position, 
  target: Position, 
  maxRows: number, 
  maxCols: number
): Position {
  const { row, col } = current;
  let newRow = row;
  let newCol = col;
  
  // Move one step toward target
  if (target.row > row) newRow = Math.min(maxRows - 1, row + 1);
  else if (target.row < row) newRow = Math.max(0, row - 1);
  
  if (target.col > col) newCol = Math.min(maxCols - 1, col + 1);
  else if (target.col < col) newCol = Math.max(0, col - 1);
  
  // Only move in one direction per turn (horizontal or vertical)
  if (newRow !== row && newCol !== col) {
    // Choose direction randomly
    if (Math.random() < 0.5) {
      newCol = col; // Move vertically
    } else {
      newRow = row; // Move horizontally
    }
  }
  
  return { row: newRow, col: newCol };
}

function getRandomAdjacentPosition(
  position: Position, 
  maxRows: number, 
  maxCols: number
): Position {
  const { row, col } = position;
  const directions = [
    { row: -1, col: 0 }, // Up
    { row: 1, col: 0 },  // Down
    { row: 0, col: -1 }, // Left
    { row: 0, col: 1 }   // Right
  ];
  
  const validMoves = directions
    .map(dir => ({ 
      row: Math.max(0, Math.min(maxRows - 1, row + dir.row)),
      col: Math.max(0, Math.min(maxCols - 1, col + dir.col))
    }))
    .filter(pos => pos.row !== row || pos.col !== col); // Exclude current position
  
  if (validMoves.length === 0) return position;
  
  return validMoves[randInt(0, validMoves.length - 1)];
}

function isValidPosition(pos: Position, maxRows: number, maxCols: number): boolean {
  return pos.row >= 0 && pos.row < maxRows && pos.col >= 0 && pos.col < maxCols;
}

function findPath(start: Position, end: Position, grid: any[][]): Position[] {
  // Simple pathfinding using breadth-first search
  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  const visited = new Set<string>();
  const queue: { pos: Position; path: Position[] }[] = [{ pos: start, path: [] }];
  
  while (queue.length > 0) {
    const { pos, path } = queue.shift()!;
    const key = `${pos.row},${pos.col}`;
    
    if (visited.has(key)) continue;
    visited.add(key);
    
    if (pos.row === end.row && pos.col === end.col) {
      return path;
    }
    
    // Add adjacent positions
    const directions = [
      { row: -1, col: 0 }, { row: 1, col: 0 },
      { row: 0, col: -1 }, { row: 0, col: 1 }
    ];
    
    for (const dir of directions) {
      const newPos = {
        row: pos.row + dir.row,
        col: pos.col + dir.col
      };
      
      if (isValidPosition(newPos, rows, cols) && !visited.has(`${newPos.row},${newPos.col}`)) {
        queue.push({
          pos: newPos,
          path: [...path, newPos]
        });
      }
    }
  }
  
  return []; // No path found
}

function findNearestTargets(grid: any[][], muncher: Position, count: number): Position[] {
  const targets: Position[] = [];
  
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (grid[r][c].isTarget) {
        targets.push({ row: r, col: c });
      }
    }
  }
  
  // Sort by distance to muncher
  targets.sort((a, b) => {
    const distA = Math.abs(a.row - muncher.row) + Math.abs(a.col - muncher.col);
    const distB = Math.abs(b.row - muncher.row) + Math.abs(b.col - muncher.col);
    return distA - distB;
  });
  
  return targets.slice(0, count);
}

function getBlockingPosition(muncher: Position, target: Position, _current: Position): Position | null {
  // Calculate a position between muncher and target
  const midRow = Math.floor((muncher.row + target.row) / 2);
  const midCol = Math.floor((muncher.col + target.col) / 2);
  
  return { row: midRow, col: midCol };
}

function calculateSurroundPosition(
  muncher: Position, 
  current: Position, 
  otherHunters: TroggleState[]
): Position | null {
  // Try to position this hunter to help surround the muncher
  const surroundPositions = [
    { row: muncher.row - 1, col: muncher.col },     // North
    { row: muncher.row + 1, col: muncher.col },     // South
    { row: muncher.row, col: muncher.col - 1 },     // West
    { row: muncher.row, col: muncher.col + 1 }      // East
  ];
  
  // Find positions not occupied by other hunters
  const occupiedPositions = otherHunters.map(h => h.position);
  const availablePositions = surroundPositions.filter(pos => 
    !occupiedPositions.some(occ => occ.row === pos.row && occ.col === pos.col)
  );
  
  if (availablePositions.length > 0) {
    // Choose the closest available surround position
    availablePositions.sort((a, b) => {
      const distA = Math.abs(a.row - current.row) + Math.abs(a.col - current.col);
      const distB = Math.abs(b.row - current.row) + Math.abs(b.col - current.col);
      return distA - distB;
    });
    
    return availablePositions[0];
  }
  
  return null;
}

// === DIFFICULTY SCALING ===

export function getDifficultyLevel(levelId: number): number {
  if (levelId <= 3) return 1;      // Tutorial
  if (levelId <= 8) return 2;      // Basic
  if (levelId <= 15) return 3;     // Intermediate
  if (levelId <= 25) return 4;     // Advanced
  return 5;                        // Master
}

export function getEnemyTypesForLevel(levelId: number): EnemyType[] {
  const difficulty = getDifficultyLevel(levelId);
  
  switch (difficulty) {
    case 1: // Tutorial
      return ['standard'];
      
    case 2: // Basic
      return ['standard', 'speed'];
      
    case 3: // Intermediate
      return ['standard', 'speed', 'smart'];
      
    case 4: // Advanced
      return ['standard', 'speed', 'smart', 'blocker'];
      
    case 5: // Master
      return ['standard', 'speed', 'smart', 'blocker', 'hunter'];
      
    default:
      return ['standard'];
  }
}

export function applySpeedModifier(baseSpeed: number, modifier: string): number {
  switch (modifier) {
    case 'slowerEnemies':
      return baseSpeed * 0.7;
    case 'fasterEnemies':
      return baseSpeed * 1.3;
    default:
      return baseSpeed;
  }
}
