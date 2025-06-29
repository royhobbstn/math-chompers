import type { Cell, GameRule, Position } from './types';

// Utility to generate a random integer between min and max (inclusive)
export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Check if a number is prime
export function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) {
    if (n % i === 0) return false;
  }
  return true;
}

// Generate a grid of numbers and mark targets based on the rule
export function generateGrid(
  rows: number,
  cols: number,
  rule: GameRule,
  targetNumber: number,
  attempts: number = 0
): Cell[][] {
  const totalCells = rows * cols;
  
  // Prevent infinite recursion
  if (attempts > 10) {
    // Fallback to a simple rule that always works
    if (rule !== 'primes') {
      return generateGrid(rows, cols, 'primes', 0, 0);
    } else {
      // If even primes fail, generate a simple numeric grid
      console.warn('Grid generation failed, using fallback');
      const grid: Cell[][] = [];
      for (let r = 0; r < rows; r++) {
        const row: Cell[] = [];
        for (let c = 0; c < cols; c++) {
          const value = randInt(2, 50);
          const isTarget = isPrime(value) && row.filter(cell => cell.isTarget).length < 5;
          row.push({ value, isTarget, hasMuncher: false, hasTroggle: false });
        }
        grid.push(row);
      }
      return grid;
    }
  }
  
  // Step 1: Generate all possible correct values for this rule
  const correctValues = generateCorrectValues(rule, targetNumber);
  
  // If we don't have enough possible correct values, try a different target
  if (correctValues.length < 3) {
    const newTarget = getAlternativeTarget(rule);
    return generateGrid(rows, cols, rule, newTarget, attempts + 1);
  }
  
  // Step 2: Determine how many correct answers to place (3-8, but not more than available)
  const maxCorrect = Math.min(8, correctValues.length, totalCells - 2); // Leave room for muncher/troggle
  const numCorrectAnswers = Math.max(3, randInt(3, maxCorrect));
  
  // Step 3: Pick random positions for correct answers
  const correctPositions = new Set<number>();
  while (correctPositions.size < numCorrectAnswers) {
    correctPositions.add(randInt(0, totalCells - 1));
  }
  
  // Step 4: Generate incorrect values to fill remaining positions
  const incorrectValues = generateIncorrectValues(rule, targetNumber);
  
  // Step 5: Build the grid
  const grid: Cell[][] = [];
  let flatIndex = 0;
  
  for (let r = 0; r < rows; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < cols; c++) {
      let value: number | string;
      let isTarget = false;
      
      if (correctPositions.has(flatIndex)) {
        // Place a correct answer
        value = correctValues[randInt(0, correctValues.length - 1)];
        isTarget = true;
      } else {
        // Place an incorrect answer
        value = incorrectValues[randInt(0, incorrectValues.length - 1)];
        isTarget = false;
      }
      
      row.push({ value, isTarget, hasMuncher: false, hasTroggle: false });
      flatIndex++;
    }
    grid.push(row);
  }
  
  // Final validation: Fix any incorrect target markings
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid[r][c];
      // Use the same logic as isCorrectValue to validate
      let shouldBeTarget = false;
      switch (rule) {
        case 'multiples':
          shouldBeTarget = typeof cell.value === 'number' && targetNumber > 0 && cell.value % targetNumber === 0;
          break;
        case 'factors':
          shouldBeTarget = typeof cell.value === 'number' && targetNumber > 0 && cell.value > 0 && targetNumber % cell.value === 0;
          break;
        case 'primes':
          shouldBeTarget = typeof cell.value === 'number' && isPrime(cell.value);
          break;
        case 'addition':
          if (typeof cell.value === 'string' && cell.value.includes('+')) {
            const [a, b] = cell.value.split('+').map(Number);
            shouldBeTarget = a + b === targetNumber;
          }
          break;
        case 'subtraction':
          if (typeof cell.value === 'string' && cell.value.includes('-')) {
            const [a, b] = cell.value.split('-').map(Number);
            shouldBeTarget = a - b === targetNumber;
          }
          break;
      }
      
      if (cell.isTarget !== shouldBeTarget) {
        // Fix the marking
        cell.isTarget = shouldBeTarget;
      }
    }
  }
  
  return grid;
}

// Generate all possible correct values for a given rule and target
function generateCorrectValues(rule: GameRule, targetNumber: number): (number | string)[] {
  const values: (number | string)[] = [];
  
  switch (rule) {
    case 'multiples':
      // Generate multiples of targetNumber that fit in our range
      if (targetNumber > 0) {
        for (let i = 1; i <= 25; i++) {
          const multiple = targetNumber * i;
          if (multiple >= 2 && multiple <= 50) {
            values.push(multiple);
          }
        }
      }
      break;
      
    case 'factors':
      // Generate factors of targetNumber
      if (targetNumber > 0) {
        for (let i = 1; i <= targetNumber; i++) {
          if (targetNumber % i === 0) {
            values.push(i);
          }
        }
      }
      break;
      
    case 'primes':
      // Generate prime numbers in our range
      for (let i = 2; i <= 50; i++) {
        if (isPrime(i)) {
          values.push(i);
        }
      }
      break;
      
    case 'addition':
      // Generate addition problems that equal targetNumber
      for (let a = 0; a <= targetNumber; a++) {
        const b = targetNumber - a;
        if (b >= 0 && b <= 20) {
          // Add both orientations for variety
          values.push(`${a}+${b}`);
          if (a !== b) values.push(`${b}+${a}`);
        }
      }
      break;
      
    case 'subtraction':
      // Generate subtraction problems that equal targetNumber
      for (let b = 0; b <= 20; b++) {
        const a = b + targetNumber;
        if (a >= b && a <= 30) {
          values.push(`${a}-${b}`);
        }
      }
      break;
  }
  
  return values;
}

// Generate incorrect values that don't match the rule
function generateIncorrectValues(rule: GameRule, targetNumber: number): (number | string)[] {
  const values: (number | string)[] = [];
  
  // Helper function to check if a value would be considered correct
  const isCorrectValue = (value: number | string): boolean => {
    switch (rule) {
      case 'multiples':
        return typeof value === 'number' && targetNumber > 0 && value % targetNumber === 0;
      case 'factors':
        return typeof value === 'number' && targetNumber > 0 && value > 0 && targetNumber % value === 0;
      case 'primes':
        return typeof value === 'number' && isPrime(value);
      case 'addition':
        if (typeof value === 'string' && value.includes('+')) {
          const [a, b] = value.split('+').map(Number);
          return a + b === targetNumber;
        }
        return false;
      case 'subtraction':
        if (typeof value === 'string' && value.includes('-')) {
          const [a, b] = value.split('-').map(Number);
          return a - b === targetNumber;
        }
        return false;
      default:
        return false;
    }
  };
  
  // Generate enough incorrect values
  const targetCount = 100; // Generate plenty of options
  let attempts = 0;
  
  while (values.length < targetCount && attempts < 1000) {
    let value: number | string;
    
    switch (rule) {
      case 'multiples':
      case 'factors':
      case 'primes':
        value = randInt(2, 50);
        break;
        
      case 'addition':
        const a = randInt(0, 20);
        const b = randInt(0, 20);
        value = `${a}+${b}`;
        break;
        
      case 'subtraction':
        const x = randInt(0, 30);
        const y = randInt(0, Math.min(x, 15));
        value = `${x}-${y}`;
        break;
        
      default:
        value = randInt(2, 50);
    }
    
    // Only add if it's not correct and not already in our list
    if (!isCorrectValue(value) && !values.includes(value)) {
      values.push(value);
    }
    
    attempts++;
  }
  
  // If we still don't have enough incorrect values, fall back to simple numbers
  let fallbackAttempts = 0;
  while (values.length < targetCount && fallbackAttempts < 100) {
    const num = randInt(2, 50);
    if (!isCorrectValue(num) && !values.includes(num)) {
      values.push(num);
    }
    fallbackAttempts++;
  }
  
  // If we still don't have enough, just add some guaranteed incorrect values
  if (values.length < 20) {
    for (let i = 51; i <= 100 && values.length < 50; i++) {
      if (!values.includes(i)) {
        values.push(i);
      }
    }
  }
  
  return values;
}

// Helper to get an alternative target if the current one doesn't work
function getAlternativeTarget(rule: GameRule): number {
  switch (rule) {
    case 'multiples':
    case 'factors':
      return randInt(6, 12); // Use larger numbers for more factors/multiples
    case 'primes':
      return 0; // Primes don't use a target number
    case 'addition':
      return randInt(8, 15); // Sweet spot for addition problems
    case 'subtraction':
      return randInt(3, 10); // Good range for subtraction
    default:
      return randInt(2, 12);
  }
}

// Get a random empty position on the grid
export function getRandomEmptyPosition(grid: Cell[][]): Position {
  const empty: Position[] = [];
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (!grid[r][c].hasMuncher && !grid[r][c].hasTroggle) {
        empty.push({ row: r, col: c });
      }
    }
  }
  
  if (empty.length === 0) {
    console.warn('No empty positions found, returning default position');
    return { row: 0, col: 0 };
  }
  
  return empty[randInt(0, empty.length - 1)];
}
