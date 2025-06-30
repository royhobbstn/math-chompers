// Types for the Number Munchers game

export type Cell = {
  value: number | string;
  isTarget: boolean;
  hasMuncher: boolean;
  hasTroggle: boolean;
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

export interface GridCell {
  value: number | string; // string for addition/subtraction problems
  isTarget: boolean;
  hasMuncher?: boolean;
  hasTroggle?: boolean;
}
