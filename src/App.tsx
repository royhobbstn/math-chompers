import { useEffect, useState, useCallback } from 'react';
import './App.css';
import type { GameState, GameRule, GameStateWithGuesses, Position } from './types';
import { generateGrid, randInt, isPrime } from './gameUtils';
import { moveSound, munchSound, errorSound, incorrectSound, winSound } from './sounds';

const ROWS = 5;
const COLS = 6;

function getInitialState(score = 0, puzzlesSolved = 0): GameStateWithGuesses & { gameWon?: boolean, timeLeft?: number, puzzlesSolved?: number } {
  const RULES: GameRule[] = ['multiples', 'factors', 'primes', 'addition', 'subtraction'];
  const rule = RULES[randInt(0, RULES.length - 1)];
  let targetNumber: number;
  if (rule === 'primes') {
    targetNumber = 0;
  } else if (rule === 'addition') {
    targetNumber = randInt(5, 20);
  } else if (rule === 'subtraction') {
    targetNumber = randInt(0, 15);
  } else if (rule === 'factors') {
    // Generate numbers that have more factors to make the game more interesting
    const numbersWithManyFactors = [12, 18, 20, 24, 30, 36];
    targetNumber = numbersWithManyFactors[randInt(0, numbersWithManyFactors.length - 1)];
  } else {
    targetNumber = randInt(2, 12);
  }
  let grid = generateGrid(ROWS, COLS, rule, targetNumber).map(row => row.map(cell => ({ ...cell, revealed: false })));
  
  // Debug logging for factors
  if (rule === 'factors') {
    console.log(`Factors of ${targetNumber}:`);
    const targetCells = grid.flat().filter(cell => cell.isTarget);
    targetCells.forEach(cell => {
      console.log(`  ${cell.value} is marked as target`);
    });
  }
  
  // Place Muncher and Troggle at opposite corners
  const corners = [
    { row: 0, col: 0 },                    // Top-left
    { row: 0, col: COLS - 1 },             // Top-right
    { row: ROWS - 1, col: 0 },             // Bottom-left
    { row: ROWS - 1, col: COLS - 1 }       // Bottom-right
  ];
  
  // Randomly choose which corner gets the Muncher
  const muncherCornerIndex = randInt(0, 3);
  const muncher = corners[muncherCornerIndex];
  
  // Place Troggle at the opposite corner (diagonally opposite)
  const troggleCornerIndex = 3 - muncherCornerIndex; // This gives us the diagonal opposite
  const troggles = [corners[troggleCornerIndex]];
  
  grid[muncher.row][muncher.col].hasMuncher = true;
  grid[troggles[0].row][troggles[0].col].hasTroggle = true;
  return {
    grid,
    muncher,
    troggles,
    rule,
    targetNumber,
    score,
    gameOver: false,
    incorrectGuesses: 0,
    gameWon: false,
    timeLeft: 60,
    puzzlesSolved,
  };
}

function App() {
  const [started, setStarted] = useState(false);
  const [state, setState] = useState<GameStateWithGuesses & { gameWon?: boolean, timeLeft?: number, puzzlesSolved?: number }>(() => getInitialState());
  const [lastCorrectGuess, setLastCorrectGuess] = useState<number>(Date.now());
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [newHighScoreIndex, setNewHighScoreIndex] = useState<number | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [pendingHighScore, setPendingHighScore] = useState<{score: number, puzzlesSolved: number} | null>(null);
  const [showGameOverPopup, setShowGameOverPopup] = useState(false);
  const [gameOverScore, setGameOverScore] = useState(0);
  const [gameOverPuzzles, setGameOverPuzzles] = useState(0);
  const [gameOverTimeoutId, setGameOverTimeoutId] = useState<number | null>(null);

  const handleHighScoreSubmit = () => {
    if (!pendingHighScore || !playerName.trim()) return;
    
    let finalPlayerName = playerName.trim().substring(0, 20); // Limit name length
    if (finalPlayerName === '') {
      finalPlayerName = "Anonymous";
    }
    
    try {
      const highScores = getHighScores();
      const newScore: HighScore = {
        score: pendingHighScore.score,
        playerName: finalPlayerName,
        date: new Date().toLocaleDateString(),
        puzzlesSolved: pendingHighScore.puzzlesSolved
      };
      
      highScores.push(newScore);
      highScores.sort((a, b) => b.score - a.score); // Sort by score descending
      
      // Keep only top 5 scores
      const topScores = highScores.slice(0, 5);
      localStorage.setItem('munchers-high-scores', JSON.stringify(topScores));
      
      // Find the index of the new score for animation
      const newIndex = topScores.findIndex(s => s === newScore);
      setNewHighScoreIndex(newIndex);
      
      // Clear the form - high scores are always shown
      setIsNewHighScore(false);
      setPendingHighScore(null);
      setPlayerName('');
      
    } catch (error) {
      console.error('Error saving high score:', error);
      setIsNewHighScore(false);
      setPendingHighScore(null);
    }
  };

  const handleGameOverSkip = () => {
    if (gameOverTimeoutId) {
      clearTimeout(gameOverTimeoutId);
      setGameOverTimeoutId(null);
    }
    setShowGameOverPopup(false);
    setStarted(false);
    setState(getInitialState());
  };

  // Game timer effect - simplified to avoid dependency issues
  useEffect(() => {
    if (!started || state.gameOver || state.gameWon) return;
    
    const timer = setInterval(() => {
      setState(prev => {
        if (prev.gameOver || prev.gameWon || typeof prev.timeLeft !== 'number') return prev;
        if (prev.timeLeft <= 1) {
          return { ...prev, gameOver: true, timeLeft: 0 };
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [started]); // Only depend on started to avoid re-creating timer

  // Handle keyboard input for Muncher movement
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Handle spacebar during game over popup
    if (showGameOverPopup && (e.key === ' ' || e.key === 'Spacebar')) {
      handleGameOverSkip();
      return;
    }
    
    if (!started || state.gameOver) return;
    
    let dRow = 0, dCol = 0;
    if (e.key === 'ArrowUp') dRow = -1;
    if (e.key === 'ArrowDown') dRow = 1;
    if (e.key === 'ArrowLeft') dCol = -1;
    if (e.key === 'ArrowRight') dCol = 1;
    
    if (dRow !== 0 || dCol !== 0) {
      setState((prev) => {
        const result = moveMuncherWithSound(prev, dRow, dCol);
        if (result.hitTroggle) {
          errorSound.currentTime = 0; errorSound.play();
        } else {
          moveSound.currentTime = 0; moveSound.play();
        }
        return result.nextState;
      });
    }
    
    if (e.key === ' ' || e.key === 'Spacebar') {
      setState((prev) => {
        const { didMunch, correct, hitTroggle, nextState } = muncherEatWithSound(prev);
        if (hitTroggle) {
          errorSound.currentTime = 0; errorSound.play();
        } else if (didMunch) {
          if (correct) {
            munchSound.currentTime = 0; munchSound.play();
            setLastCorrectGuess(Date.now()); // Reset reveal timer on correct guess
          } else {
            incorrectSound.currentTime = 0; incorrectSound.play();
          }
        }
        return nextState;
      });
    }
  }, [started, state.gameOver, showGameOverPopup, handleGameOverSkip]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Move Troggles every second - simplified
  useEffect(() => {
    if (!started || state.gameOver) return;
    
    const interval = setInterval(() => {
      setState((prev) => {
        if (prev.gameOver) return prev;
        const wasGameOver = prev.gameOver;
        const nextState = moveTroggles(prev);
        // Only play error sound if transitioning from not over to over (and not won)
        if (!wasGameOver && nextState.gameOver && !nextState.gameWon) {
          errorSound.currentTime = 0; errorSound.play();
        }
        return nextState;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [started]); // Only depend on started

  // Play win sound when game is won - no longer save high score here
  useEffect(() => {
    if (started && state.gameWon) {
      winSound.currentTime = 0;
      winSound.play();
      setIsNewHighScore(false); // Reset since we're not saving per-puzzle scores
    }
  }, [started, state.gameWon]);

  // Handle high score saving when game ends
  useEffect(() => {
    if (started && state.gameOver && !state.gameWon) {
      // Store game over data and show popup
      setGameOverScore(state.score);
      setGameOverPuzzles(state.puzzlesSolved || 0);
      setShowGameOverPopup(true);
      
      // Handle high score logic
      const madeHighScore = saveHighScore(state.score, state.puzzlesSolved || 0, setIsNewHighScore, setPendingHighScore);

      setIsNewHighScore(madeHighScore);
      
      // Fade away popup and go to startup screen after 5 seconds
      const timeoutId = setTimeout(() => {
        setShowGameOverPopup(false);
        setStarted(false);
        setState(getInitialState());
        setGameOverTimeoutId(null);
      }, 5000);
      setGameOverTimeoutId(timeoutId);
    }
  }, [started, state.gameOver, state.gameWon, state.score, state.puzzlesSolved]);

  // Reveal logic - show correct squares if player hasn't found any for 10 seconds
  useEffect(() => {
    if (!started || state.gameOver || state.gameWon) return;
    
    const revealTimer = setInterval(() => {
      const now = Date.now();
      if (now - lastCorrectGuess > 10000) { // 10 seconds
        setState(prev => {
          // Find unrevealed correct squares and double-check they are actually correct
          const unrevealedTargets: Position[] = [];
          for (let r = 0; r < prev.grid.length; r++) {
            for (let c = 0; c < prev.grid[r].length; c++) {
              const cell = prev.grid[r][c];
              if (cell.isTarget && !cell.revealed && !cell.hasMuncher && !cell.hasTroggle) {
                // Double-check that this cell is actually correct before revealing
                let isActuallyCorrect = false;
                switch (prev.rule) {
                  case 'multiples':
                    isActuallyCorrect = typeof cell.value === 'number' && prev.targetNumber > 0 && cell.value % prev.targetNumber === 0;
                    break;
                  case 'factors':
                    isActuallyCorrect = typeof cell.value === 'number' && prev.targetNumber > 0 && cell.value > 0 && prev.targetNumber % cell.value === 0;
                    break;
                  case 'primes':
                    isActuallyCorrect = typeof cell.value === 'number' && isPrime(cell.value);
                    break;
                  case 'addition':
                    if (typeof cell.value === 'string' && cell.value.includes('+')) {
                      const [a, b] = cell.value.split('+').map(Number);
                      isActuallyCorrect = a + b === prev.targetNumber;
                    }
                    break;
                  case 'subtraction':
                    if (typeof cell.value === 'string' && cell.value.includes('-')) {
                      const [a, b] = cell.value.split('-').map(Number);
                      isActuallyCorrect = a - b === prev.targetNumber;
                    }
                    break;
                }
                
                if (isActuallyCorrect) {
                  unrevealedTargets.push({ row: r, col: c });
                }
              }
            }
          }
          
          if (unrevealedTargets.length > 0) {
            // Reveal one random correct square
            const randomTarget = unrevealedTargets[randInt(0, unrevealedTargets.length - 1)];
            const newGrid = prev.grid.map(row => row.map(cell => ({ ...cell })));
            newGrid[randomTarget.row][randomTarget.col].revealed = true;
            
            return { ...prev, grid: newGrid };
          }
          
          return prev;
        });
        
        // Reset the timer after revealing
        setLastCorrectGuess(Date.now());
      }
    }, 2000); // Check every 2 seconds
    
    return () => clearInterval(revealTimer);
  }, [started, lastCorrectGuess, state.gameOver, state.gameWon]);

  // Reset new high score index after animation
  useEffect(() => {
    if (newHighScoreIndex !== null) {
      const timer = setTimeout(() => {
        setNewHighScoreIndex(null);
      }, 3000); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [newHighScoreIndex]);

  if (!started) {
    return (
      <div className="game-container">
        <h2>Math Chompers</h2>
        
        {/* Show high score notification */}
        {isNewHighScore && (
          <div style={{
            background: '#4caf50',
            color: 'white',
            padding: '1rem',
            borderRadius: '8px',
            margin: '1rem auto',
            maxWidth: '400px',
            fontWeight: 'bold',
            textAlign: 'center'
          }}>
            🎉 Congratulations! You made the high score list! 🎉
            <div style={{ marginTop: '1rem' }}>
              <input
                type="text"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleHighScoreSubmit()}
                style={{
                  padding: '0.5rem',
                  margin: '0.5rem',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '1rem',
                  maxWidth: '200px'
                }}
                autoFocus
              />
              <button
                onClick={handleHighScoreSubmit}
                style={{
                  padding: '0.5rem 1rem',
                  margin: '0.5rem',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: '#fff',
                  color: '#4caf50',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Submit
              </button>
            </div>
          </div>
        )}
        
        <div style={{ marginBottom: '2rem' }}>
          <button className="start-btn" onClick={() => { 
            setStarted(true); 
            setLastCorrectGuess(Date.now()); 
            setIsNewHighScore(false); // Clear the notification when starting new game
          }}>Start New Session</button>
        </div>
        <HighScoresList newHighScoreIndex={newHighScoreIndex} />
      </div>
    );
  }

  return (
    <div className="game-container">
      <h2>Math Chompers</h2>
      <GameInfo rule={state.rule} targetNumber={state.targetNumber} score={state.score} incorrectGuesses={state.incorrectGuesses} timeLeft={state.timeLeft} grid={state.grid} />
      <div className="game-controls">
        {state.gameWon && (
          <div className="game-won">
            You Win!
            <div>Final Score: {state.score}</div>
            <div style={{marginBottom: '1em'}}>Puzzles Solved: {(state.puzzlesSolved || 0) + 1}</div>
            {isNewHighScore && <div style={{color: '#ff6b35', fontWeight: 'bold', margin: '0.5rem 0'}}>🎉 NEW HIGH SCORE! 🎉</div>}
            <button onClick={() => { 
              setState(getInitialState(state.score, (state.puzzlesSolved || 0) + 1)); 
              setLastCorrectGuess(Date.now()); 
              setIsNewHighScore(false); 
            }}>Continue</button>
          </div>
        )}
      </div>
      <GameGrid grid={state.grid} />
      
      {/* Game Over Popup */}
      {showGameOverPopup && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(255, 0, 0, 0.9)',
          color: 'white',
          padding: '2rem',
          borderRadius: '12px',
          textAlign: 'center',
          fontSize: '1.5rem',
          fontWeight: 'bold',
          zIndex: 1000,
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          animation: 'gameOverFade 5s ease-in-out forwards'
        }}>
          <div>Game Over!</div>
          <div style={{ fontSize: '1.2rem', marginTop: '1rem' }}>
            Final Score: {gameOverScore}
          </div>
          <div style={{ fontSize: '1rem', marginTop: '0.5rem' }}>
            Puzzles Solved: {gameOverPuzzles}
          </div>
          <div style={{ fontSize: '0.9rem', marginTop: '2rem', opacity: 0.8 }}>
            Press SPACEBAR to continue
          </div>
        </div>
      )}
    </div>
  );
}

function GameInfo({ rule, targetNumber, score, incorrectGuesses, timeLeft, grid }: { rule: GameRule, targetNumber: number, score: number, incorrectGuesses: number, timeLeft?: number, grid: GameState['grid'] }) {
  let ruleText = '';
  if (rule === 'multiples') ruleText = `Eat all multiples of ${targetNumber}`;
  if (rule === 'factors') ruleText = `Eat all factors of ${targetNumber}`;
  if (rule === 'primes') ruleText = 'Eat all prime numbers';
  if (rule === 'addition') ruleText = `Find all sums that add up to ${targetNumber}`;
  if (rule === 'subtraction') ruleText = `Find all differences that equal ${targetNumber}`;
  // Count total correct answers: current targets + munched correct answers
  const totalCorrectAnswers = grid.flat().filter(cell => 
    cell.isTarget || cell.munchedCorrect
  ).length;
  
  // Count remaining unmunched correct answers
  const remainingTargets = grid.flat().filter(cell => cell.isTarget).length;
  return (
    <div className="game-info">
      <div style={{fontWeight: 'bold'}}>{ruleText}</div>
      <div>Score: {score} | Incorrect guesses left: {3 - incorrectGuesses} | Time left: {timeLeft ?? 0}s</div>
      <div>Correct answers: {totalCorrectAnswers} | Remaining: {remainingTargets}</div>
    </div>
  );
}

function GameGrid({ grid }: { grid: GameState['grid'] }) {
  return (
    <div className="grid">
      {grid.flat().map((cell, idx) => (
        <div
          className={`cell${cell.hasMuncher ? ' muncher' : ''}${cell.hasTroggle ? ' troggle' : ''}${cell.isTarget && cell.revealed ? ' target' : ''}${cell.munchedCorrect ? ' munched' : ''}${cell.hasMuncher && cell.hasTroggle ? ' collision' : ''}`}
          key={idx}
        >
          {cell.hasMuncher && cell.hasTroggle ? (
            // Show collision - both characters overlapping
            <div className="collision-container">
              <img
                src="/assets/muncher.jpg"
                alt="Muncher"
                className="collision-muncher"
              />
              <img
                src="/assets/troggle.jpg"
                alt="Troggle"
                className="collision-troggle"
              />
            </div>
          ) : cell.hasMuncher ? (
            <img
              src="/assets/muncher.jpg"
              alt="Muncher"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : cell.hasTroggle ? (
            <img
              src="/assets/troggle.jpg"
              alt="Troggle"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            cell.value
          )}
        </div>
      ))}
    </div>
  );
}

// --- Game Logic ---
function moveMuncherWithSound(state: GameStateWithGuesses, dRow: number, dCol: number): { hitTroggle: boolean, nextState: GameStateWithGuesses } {
  if (state.gameOver) return { hitTroggle: false, nextState: state };
  const { row, col } = state.muncher;
  const newRow = Math.max(0, Math.min(state.grid.length - 1, row + dRow));
  const newCol = Math.max(0, Math.min(state.grid[0].length - 1, col + dCol));
  if (newRow === row && newCol === col) return { hitTroggle: false, nextState: state };
  
  // Move muncher first (allow collision to happen visually)
  let grid = state.grid.map(row => row.map(cell => ({ ...cell })));
  grid[state.muncher.row][state.muncher.col].hasMuncher = false;
  grid[newRow][newCol].hasMuncher = true;
  
  // Check for collision AFTER the move
  const cell = grid[newRow][newCol];
  if (cell.hasTroggle) {
    // Collision happened - game over after showing the collision
    return { hitTroggle: true, nextState: { ...state, grid, muncher: { row: newRow, col: newCol }, gameOver: true } };
  }
  
  return {
    hitTroggle: false,
    nextState: {
      ...state,
      grid,
      muncher: { row: newRow, col: newCol },
    }
  };
}

function muncherEatWithSound(state: GameStateWithGuesses & { gameWon?: boolean }): { didMunch: boolean, correct: boolean, hitTroggle: boolean, nextState: GameStateWithGuesses & { gameWon?: boolean } } {
  if (state.gameOver || state.gameWon) return { didMunch: false, correct: false, hitTroggle: false, nextState: state };
  const { row, col } = state.muncher;
  const cell = state.grid[row][col];
  
  // Check for collision with Troggle (this can happen if they're on the same square)
  if (cell.hasTroggle) {
    // Game over - collision during eating
    return { didMunch: false, correct: false, hitTroggle: true, nextState: { ...state, gameOver: true, gameWon: false } };
  }
  
  let score = state.score;
  let grid = state.grid.map(row => row.map(cell => ({ ...cell })));
  
  // Double-check if this is actually a correct answer
  let isActuallyCorrect = false;
  if (cell.isTarget) {
    switch (state.rule) {
      case 'multiples':
        isActuallyCorrect = typeof cell.value === 'number' && state.targetNumber > 0 && cell.value % state.targetNumber === 0;
        break;
      case 'factors':
        isActuallyCorrect = typeof cell.value === 'number' && state.targetNumber > 0 && cell.value > 0 && state.targetNumber % cell.value === 0;
        break;
      case 'primes':
        isActuallyCorrect = typeof cell.value === 'number' && isPrime(cell.value);
        break;
      case 'addition':
        if (typeof cell.value === 'string' && cell.value.includes('+')) {
          const [a, b] = cell.value.split('+').map(Number);
          isActuallyCorrect = a + b === state.targetNumber;
        }
        break;
      case 'subtraction':
        if (typeof cell.value === 'string' && cell.value.includes('-')) {
          const [a, b] = cell.value.split('-').map(Number);
          isActuallyCorrect = a - b === state.targetNumber;
        }
        break;
    }
  }
  
  if (cell.isTarget && isActuallyCorrect) {
    score += 10;
    grid[row][col].isTarget = false;
    grid[row][col].revealed = true;
    grid[row][col].munchedCorrect = true;
    // Correct munch
    const targetsLeft = grid.flat().some(cell => cell.isTarget && !cell.hasMuncher);
    return {
      didMunch: true,
      correct: true,
      hitTroggle: false,
      nextState: {
        ...state,
        grid,
        score,
        gameWon: !targetsLeft,
      }
    };
  } else if (cell.isTarget && !isActuallyCorrect) {
    // This was marked as a target but is actually incorrect - treat as incorrect guess
    const incorrectGuesses = state.incorrectGuesses + 1;
    // Fix the grid marking
    grid[row][col].isTarget = false;
    if (incorrectGuesses >= 3) {
      return {
        didMunch: true,
        correct: false,
        hitTroggle: false,
        nextState: { ...state, grid, incorrectGuesses, gameOver: true, gameWon: false }
      };
    }
    return { didMunch: true, correct: false, hitTroggle: false, nextState: { ...state, grid, incorrectGuesses } };
  } else {
    // Incorrect munch
    const incorrectGuesses = state.incorrectGuesses + 1;
    if (incorrectGuesses >= 3) {
      return {
        didMunch: true,
        correct: false,
        hitTroggle: false,
        nextState: { ...state, incorrectGuesses, gameOver: true, gameWon: false }
      };
    }
    return { didMunch: true, correct: false, hitTroggle: false, nextState: { ...state, incorrectGuesses } };
  }
}

function moveTroggles(state: GameStateWithGuesses & { gameWon?: boolean }): GameStateWithGuesses & { gameWon?: boolean } {
  if (state.gameOver || state.gameWon) return state;
  let grid = state.grid.map(row => row.map(cell => ({ ...cell })));
  const newTroggles: Position[] = [];
  
  for (const troggle of state.troggles) {
    const { row, col } = troggle;
    grid[row][col].hasTroggle = false;
    // Only move horizontally or vertically, not diagonally
    const moveAxis = Math.random() < 0.5 ? 'row' : 'col';
    let dRow = 0, dCol = 0;
    if (moveAxis === 'row') {
      dRow = randInt(-1, 1);
    } else {
      dCol = randInt(-1, 1);
    }
    const newRow = Math.max(0, Math.min(ROWS - 1, row + dRow));
    const newCol = Math.max(0, Math.min(COLS - 1, col + dCol));
    
    // Move the Troggle first (allow collision to happen visually)
    grid[newRow][newCol].hasTroggle = true;
    newTroggles.push({ row: newRow, col: newCol });
  }
  
  // Check for collision AFTER all Troggles have moved
  for (const troggle of newTroggles) {
    if (troggle.row === state.muncher.row && troggle.col === state.muncher.col) {
      // Collision happened - game over after showing the collision
      return { ...state, grid, troggles: newTroggles, gameOver: true, gameWon: false };
    }
  }
  
  return { ...state, grid, troggles: newTroggles };
}

// High Score Management
interface HighScore {
  score: number;
  playerName: string;
  date: string;
  puzzlesSolved: number;
}

function getHighScores(): HighScore[] {
  try {
    const stored = localStorage.getItem('munchers-high-scores');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveHighScore(score: number, puzzlesSolved: number, setIsNewHighScore: (value: boolean) => void, setPendingHighScore: (value: {score: number, puzzlesSolved: number} | null) => void): boolean {
  if (score === 0) return false; // Don't save zero scores
  
  try {
    const highScores = getHighScores();
    // Check if this score would make it to the top 5
    const wouldMakeList = highScores.length < 5 || score > highScores[highScores.length - 1].score;
    
    if (wouldMakeList) {
      // Set up for high score entry
      setPendingHighScore({ score, puzzlesSolved });
      setIsNewHighScore(true);
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}

function HighScoresList({ newHighScoreIndex }: { newHighScoreIndex?: number | null }) {
  const highScores = getHighScores();
  
  if (highScores.length === 0) {
    return (
      <div className="high-scores">
        <h3>High Scores</h3>
        <p>No high scores yet! Start playing to set some records!</p>
      </div>
    );
  }
  
  return (
    <div className="high-scores">
      <h3>High Scores</h3>
      <div className="scores-list">
        {highScores.map((score, index) => (
          <div 
            key={index} 
            className={`score-entry${index === newHighScoreIndex ? ' new-high-score' : ''}`}
          >
            <span className="rank">#{index + 1}</span>
            <span className="score">{score.score} pts</span>
            <span className="details">
              <div>{score.playerName}</div>
              <div style={{fontSize: '0.8em', color: '#666'}}>{score.puzzlesSolved} puzzle{score.puzzlesSolved !== 1 ? 's' : ''} solved</div>
            </span>
            <span className="date">{score.date}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
