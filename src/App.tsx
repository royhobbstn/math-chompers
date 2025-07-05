import { useEffect, useState, useCallback } from 'react';
import './App.css';
import type { GameRule, GameStateWithGuesses, Position, Cell, LevelGameState } from './types';
import { generateGrid, randInt, isPrime } from './gameUtils';
import { moveSound, munchSound, errorSound, incorrectSound, winSound } from './sounds';
import { LevelSelector } from './LevelSelector';
import { 
  initializeLevelGameState, 
  loadSaveData, 
  saveLevelProgress 
} from './levelGameState';
import { calculateLevelStars } from './levels';
import { createEnemyAI, calculateNextMove, getDifficultyLevel } from './enemyAI';
import { 
  calculateLevelScore, 
  getTotalScore, 
  updateObjectives, 
  checkAchievements, 
  calculateLevelRewards
} from './scoring';
import { LevelCompletionScreen } from './LevelCompletionScreen';

// Define app modes
type AppMode = 'menu' | 'levelSelect' | 'classicGame' | 'levelGame';

const ROWS = 5;
const COLS = 6;

function getInitialState(score = 0, puzzlesSolved = 0): GameStateWithGuesses & { gameWon?: boolean, timeLeft?: number, puzzlesSolved?: number } {
  const RULES: GameRule[] = ['multiples', 'factors', 'primes', 'addition', 'subtraction', 'mixed'];
  const rule = RULES[randInt(0, RULES.length - 1)];
  let targetNumber: number;
  if (rule === 'primes') {
    targetNumber = 0;
  } else if (rule === 'addition') {
    targetNumber = randInt(5, 20);
  } else if (rule === 'subtraction') {
    targetNumber = randInt(0, 15);
  } else if (rule === 'mixed') {
    targetNumber = randInt(5, 15); // Good range for mixed addition/subtraction
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
  const [appMode, setAppMode] = useState<AppMode>('menu');
  const [started, setStarted] = useState(false);
  const [levelGameState, setLevelGameState] = useState<LevelGameState | null>(null);
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

  // Level completion screen state
  const [showLevelCompletion, setShowLevelCompletion] = useState(false);
  const [levelCompletionData, setLevelCompletionData] = useState<{
    gameState: LevelGameState;
    scoring: any;
    totalScore: number;
    achievements: any[];
  } | null>(null);

  const handleLevelSelect = (levelId: number) => {
    console.log(`Selected level ${levelId}`);
    
    // Initialize level-based game state
    const saveData = loadSaveData();
    const levelState = initializeLevelGameState(levelId, saveData);
    
    if (levelState) {
      setLevelGameState(levelState);
      setAppMode('levelGame');
      setStarted(true);
    } else {
      console.error('Failed to initialize level game state');
    }
  };

  const handleLevelComplete = (finalState: LevelGameState) => {
    // Load save data
    const saveData = loadSaveData();
    
    // Check for achievements
    const newAchievements = checkAchievements(
      finalState,
      saveData.playerStats,
      saveData.achievements
    );
    
    // Calculate detailed scoring
    const scoring = calculateLevelScore(
      finalState.session.finalScore,
      finalState.objectives,
      finalState.completedObjectives,
      finalState.timeLeft,
      finalState.accuracy,
      finalState.currentStreak,
      finalState.currentLevel.id
    );
    
    const totalScore = getTotalScore(scoring);
    
    // Calculate level rewards
    const rewards = calculateLevelRewards(
      totalScore,
      finalState.session.starsEarned,
      newAchievements,
      finalState.objectives,
      finalState.completedObjectives
    );
    
    // Update save data with new achievement IDs
    const updatedSaveData = {
      ...saveData,
      achievements: [...saveData.achievements, ...newAchievements.map(a => a.id)]
    };
    
    // Save level progress with updated data
    saveLevelProgress(
      finalState.currentLevel.id,
      finalState.session,
      updatedSaveData
    );
    
    console.log('Level completed!', {
      level: finalState.currentLevel.id,
      score: totalScore,
      stars: finalState.session.starsEarned,
      achievements: newAchievements.map(a => a.name),
      totalRewards: rewards.totalPoints
    });
    
    // Show level completion screen with detailed data
    setLevelCompletionData({
      gameState: finalState,
      scoring,
      totalScore,
      achievements: newAchievements
    });
    setShowLevelCompletion(true);
  };

  const handleBackToMenu = () => {
    setAppMode('menu');
    setStarted(false);
    setLevelGameState(null);
  };

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

  const handleCompletionContinue = () => {
    setShowLevelCompletion(false);
    setLevelCompletionData(null);
    setAppMode('levelSelect');
    setStarted(false);
    setLevelGameState(null);
  };

  const handleCompletionRetry = () => {
    if (levelCompletionData) {
      setShowLevelCompletion(false);
      setLevelCompletionData(null);
      
      // Restart the same level
      const saveData = loadSaveData();
      const newLevelState = initializeLevelGameState(levelCompletionData.gameState.currentLevel.id, saveData);
      if (newLevelState) {
        setLevelGameState(newLevelState);
        setStarted(true);
      }
    }
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

  // Level game timer effect
  useEffect(() => {
    if (appMode !== 'levelGame' || !levelGameState || levelGameState.gameOver || levelGameState.gameWon) return;
    
    const timer = setInterval(() => {
      setLevelGameState(prev => {
        if (!prev || prev.gameOver || prev.gameWon || prev.timeLeft <= 0) return prev;
        const newTimeLeft = prev.timeLeft - 1;
        if (newTimeLeft <= 0) {
          return { ...prev, timeLeft: 0, gameOver: true };
        }
        return { ...prev, timeLeft: newTimeLeft };
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [appMode, levelGameState?.gameOver, levelGameState?.gameWon]);

  // Handle keyboard input for Muncher movement
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Handle spacebar during game over popup
    if (showGameOverPopup && (e.key === ' ' || e.key === 'Spacebar')) {
      handleGameOverSkip();
      return;
    }
    
    // Handle level game mode
    if (appMode === 'levelGame' && levelGameState && !levelGameState.gameOver && !levelGameState.gameWon) {
      let dRow = 0, dCol = 0;
      if (e.key === 'ArrowUp') dRow = -1;
      if (e.key === 'ArrowDown') dRow = 1;
      if (e.key === 'ArrowLeft') dCol = -1;
      if (e.key === 'ArrowRight') dCol = 1;
      
      if (dRow !== 0 || dCol !== 0) {
        setLevelGameState((prev) => {
          if (!prev) return prev;
          const result = moveMuncherWithSound(prev, dRow, dCol);
          if (result.hitTroggle) {
            errorSound.currentTime = 0; errorSound.play();
          } else {
            moveSound.currentTime = 0; moveSound.play();
          }
          return result.nextState as LevelGameState;
        });
      }
      
      if (e.key === ' ' || e.key === 'Spacebar') {
        setLevelGameState((prev) => {
          if (!prev) return prev;
          const { didMunch, correct, hitTroggle, nextState } = muncherEatWithScoringAndSound(prev);
          if (hitTroggle) {
            errorSound.currentTime = 0; errorSound.play();
          } else if (didMunch) {
            munchSound.currentTime = 0; munchSound.play();
            setLastCorrectGuess(Date.now());
            
            // If level is complete, finalize session data
            if (nextState.gameWon) {
              const completedState = { ...nextState };
              completedState.session.endTime = new Date();
              completedState.session.finalScore = completedState.score;
              
              // Calculate stars earned for level completion
              completedState.session.starsEarned = calculateLevelStars(
                completedState.score, 
                completedState.completedObjectives, 
                completedState.currentLevel
              );
              
              return completedState;
            }
          } else {
            incorrectSound.currentTime = 0; incorrectSound.play();
          }
          return nextState;
        });
      }
      return;
    }
    
    // Handle classic game mode
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
  }, [started, state.gameOver, showGameOverPopup, handleGameOverSkip, appMode, levelGameState]);

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

  // Move Troggles every second for level game mode
  useEffect(() => {
    if (appMode !== 'levelGame' || !levelGameState || levelGameState.gameOver) return;
    
    const interval = setInterval(() => {
      setLevelGameState((prev) => {
        if (!prev || prev.gameOver) return prev;
        const wasGameOver = prev.gameOver;
        const nextState = moveTroggles(prev) as LevelGameState;
        // Only play error sound if transitioning from not over to over (and not won)
        if (!wasGameOver && nextState.gameOver && !nextState.gameWon) {
          errorSound.currentTime = 0; errorSound.play();
        }
        return nextState;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [appMode, levelGameState?.gameOver]);

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
                  case 'mixed':
                    if (typeof cell.value === 'string') {
                      if (cell.value.includes('+')) {
                        const [a, b] = cell.value.split('+').map(Number);
                        isActuallyCorrect = a + b === prev.targetNumber;
                      } else if (cell.value.includes('-')) {
                        const [a, b] = cell.value.split('-').map(Number);
                        isActuallyCorrect = a - b === prev.targetNumber;
                      }
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

  // Handle different app modes
  if (appMode === 'levelSelect') {
    return <LevelSelector onLevelSelect={handleLevelSelect} onBack={handleBackToMenu} />;
  }

  if (appMode === 'levelGame' && levelGameState) {
    // Render level-based game
    return (
      <div className="game-container">
        <div className="level-header">
          <button className="back-btn" onClick={handleBackToMenu}>← Menu</button>
          <h2>Level {levelGameState.currentLevel.id}: {levelGameState.currentLevel.name}</h2>
          <div className="level-objectives">
            {levelGameState.currentLevel.objectives.map(objective => (
              <div 
                key={objective.id} 
                className={`objective ${levelGameState.completedObjectives.includes(objective.id) ? 'completed' : ''}`}
              >
                {objective.description} {levelGameState.completedObjectives.includes(objective.id) ? '✅' : ''}
              </div>
            ))}
          </div>
        </div>
        
        <GameInfo 
          rule={levelGameState.rule} 
          targetNumber={levelGameState.targetNumber} 
          score={levelGameState.score} 
          incorrectGuesses={levelGameState.incorrectGuesses} 
          timeLeft={levelGameState.timeLeft} 
          grid={levelGameState.grid} 
        />
        
        <div className="game-controls">
          {levelGameState.gameWon && (
            <div className="game-won">
              Level Complete!
              <div>Score: {levelGameState.score}</div>
              <div>Stars: {Array.from({length: 3}, (_, i) => (
                <span key={i} className={i < (levelGameState.session.starsEarned || 0) ? 'star earned' : 'star empty'}>
                  ⭐
                </span>
              ))}</div>
              <button onClick={() => handleLevelComplete(levelGameState)}>Continue</button>
            </div>
          )}
          
          {levelGameState.gameOver && !levelGameState.gameWon && (
            <div className="game-over">
              Level Failed!
              <div>Try Again?</div>
              <button onClick={() => {
                const saveData = loadSaveData();
                const newLevelState = initializeLevelGameState(levelGameState.currentLevel.id, saveData);
                if (newLevelState) {
                  setLevelGameState(newLevelState);
                }
              }}>Retry Level</button>
              <button onClick={handleBackToMenu}>Back to Menu</button>
            </div>
          )}
        </div>
        
        <GameGrid grid={levelGameState.grid} />
        
        {/* Level Completion Screen Overlay */}
        {showLevelCompletion && levelCompletionData && (
          <LevelCompletionScreen
            gameState={levelCompletionData.gameState}
            scoring={levelCompletionData.scoring}
            totalScore={levelCompletionData.totalScore}
            achievements={levelCompletionData.achievements}
            onContinue={handleCompletionContinue}
            onRetry={handleCompletionRetry}
          />
        )}
      </div>
    );
  }

  if (appMode === 'menu') {
    return (
      <div className="game-container">
        <h1>Number Munchers</h1>
        <div className="main-menu">
          <button 
            className="menu-btn level-mode-btn" 
            onClick={() => setAppMode('levelSelect')}
          >
            📚 Level Mode
            <span className="btn-description">Play through structured levels with progressive difficulty</span>
          </button>
          
          <button 
            className="menu-btn classic-mode-btn" 
            onClick={() => { 
              setAppMode('classicGame');
              setStarted(true); 
              setLastCorrectGuess(Date.now()); 
              setIsNewHighScore(false);
            }}
          >
            🎮 Classic Mode
            <span className="btn-description">Endless gameplay with random puzzles</span>
          </button>
        </div>
        
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
        
        <HighScoresList newHighScoreIndex={newHighScoreIndex} />
      </div>
    );
  }

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
          <button className="back-btn" onClick={handleBackToMenu} style={{ marginLeft: '1rem' }}>
            Back to Menu
          </button>
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
      
      {/* Level Completion Screen */}
      {showLevelCompletion && levelCompletionData && (
        <div className="level-completion-screen">
          <div className="completion-header">
            Level {levelCompletionData.gameState.currentLevel.id} Complete!
          </div>
          <div className="completion-content">
            <div>Score: {levelCompletionData.totalScore}</div>
            <div>Stars Earned: {levelCompletionData.gameState.session.starsEarned}</div>
            <div>Achievements Unlocked:</div>
            <ul>
              {levelCompletionData.achievements.map(achievement => (
                <li key={achievement.id}>{achievement.name}</li>
              ))}
            </ul>
          </div>
          <div className="completion-actions">
            <button onClick={handleCompletionContinue}>Continue</button>
            <button onClick={handleCompletionRetry}>Retry Level</button>
          </div>
        </div>
      )}
    </div>
  );
}

function GameInfo({ rule, targetNumber, score, incorrectGuesses, timeLeft, grid }: { 
  rule: GameRule, 
  targetNumber: number, 
  score: number, 
  incorrectGuesses: number, 
  timeLeft?: number, 
  grid: Cell[][] 
}) {
  let ruleText = '';
  if (rule === 'multiples') ruleText = `Eat all multiples of ${targetNumber}`;
  if (rule === 'factors') ruleText = `Eat all factors of ${targetNumber}`;
  if (rule === 'primes') ruleText = 'Eat all prime numbers';
  if (rule === 'addition') ruleText = `Find all sums that add up to ${targetNumber}`;
  if (rule === 'subtraction') ruleText = `Find all differences that equal ${targetNumber}`;
  if (rule === 'mixed') ruleText = `Find all addition and subtraction problems that equal ${targetNumber}`;
  // Count total correct answers: current targets + munched correct answers
  const totalCorrectAnswers = grid.flat().filter((cell: Cell) => 
    cell.isTarget || cell.munchedCorrect
  ).length;
  
  // Count remaining unmunched correct answers
  const remainingTargets = grid.flat().filter((cell: Cell) => cell.isTarget).length;
  return (
    <div className="game-info">
      <div style={{fontWeight: 'bold'}}>{ruleText}</div>
      <div>Score: {score} | Incorrect guesses left: {3 - incorrectGuesses} | Time left: {timeLeft ?? 0}s</div>
      <div>Correct answers: {totalCorrectAnswers} | Remaining: {remainingTargets}</div>
    </div>
  );
}

function GameGrid({ grid }: { grid: Cell[][] }) {
  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  
  // Calculate the available space (accounting for UI elements)
  const maxHeight = 'min(70vh, calc(100vh - 200px))'; // Leave space for UI elements
  const maxWidth = 'min(90vw, calc(100vw - 40px))'; // Leave some margin
  
  const gridStyle = {
    display: 'grid',
    gridTemplateRows: `repeat(${rows}, 1fr)`,
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    width: maxWidth,
    height: maxHeight,
    aspectRatio: `${cols} / ${rows}`,
    background: '#e0c97f',
    boxSizing: 'border-box' as const,
    margin: 'auto'
  };

  return (
    <div className="grid" style={gridStyle}>
      {grid.flat().map((cell: Cell, idx: number) => {
        // Build CSS classes for the cell
        let cellClasses = 'cell';
        if (cell.hasMuncher) cellClasses += ' muncher';
        if (cell.hasTroggle) {
          cellClasses += ' troggle';
          if (cell.troggleType) {
            cellClasses += ` ${cell.troggleType}`;
          }
        }
        if (cell.isTarget && cell.revealed) cellClasses += ' target';
        if (cell.munchedCorrect) cellClasses += ' munched';
        if (cell.hasMuncher && cell.hasTroggle) {
          cellClasses += ' collision';
          if (cell.troggleType) {
            cellClasses += ` ${cell.troggleType}`;
          }
        }
        
        return (
          <div
            className={cellClasses}
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
        );
      })}
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

// Enhanced level game eating logic with advanced scoring
function muncherEatWithScoringAndSound(
  state: LevelGameState
): { 
  didMunch: boolean, 
  correct: boolean, 
  hitTroggle: boolean, 
  nextState: LevelGameState 
} {
  if (state.gameOver || state.gameWon) return { didMunch: false, correct: false, hitTroggle: false, nextState: state };
  
  const { row, col } = state.muncher;
  const cell = state.grid[row][col];
  
  // Check for collision with Troggle
  if (cell.hasTroggle) {
    return { didMunch: false, correct: false, hitTroggle: true, nextState: { ...state, gameOver: true, gameWon: false } };
  }
  
  let newState = { ...state };
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
      case 'mixed':
        if (typeof cell.value === 'string') {
          if (cell.value.includes('+')) {
            const [a, b] = cell.value.split('+').map(Number);
            isActuallyCorrect = a + b === state.targetNumber;
          } else if (cell.value.includes('-')) {
            const [a, b] = cell.value.split('-').map(Number);
            isActuallyCorrect = a - b === state.targetNumber;
          }
        }
        break;
    }
  }
  
  if (cell.isTarget && isActuallyCorrect) {
    // Correct munch
    newState.currentStreak += 1;
    newState.puzzlesSolved += 1;
    
    // Calculate advanced scoring
    const basePoints = 10;
    const scoring = calculateLevelScore(
      basePoints,
      newState.objectives,
      newState.completedObjectives,
      newState.timeLeft,
      newState.accuracy,
      newState.currentStreak,
      newState.currentLevel.id
    );
    
    const totalScore = getTotalScore(scoring);
    newState.score += totalScore;
    
    // Update grid
    grid[row][col].isTarget = false;
    grid[row][col].revealed = true;
    grid[row][col].munchedCorrect = true;
    newState.grid = grid;
    
    // Update objectives
    newState = updateObjectives(newState);
    
    // Check if level is complete
    const targetsLeft = grid.flat().some(cell => cell.isTarget && !cell.hasMuncher);
    if (!targetsLeft) {
      newState.gameWon = true;
    }
    
    return {
      didMunch: true,
      correct: true,
      hitTroggle: false,
      nextState: newState
    };
  } else {
    // Incorrect munch
    newState.currentStreak = 0;
    newState.incorrectGuesses += 1;
    newState.session.mistakes += 1;
    
    // Calculate accuracy
    const total = newState.puzzlesSolved + newState.session.mistakes;
    newState.accuracy = total === 0 ? 100 : Math.round((newState.puzzlesSolved / total) * 100);
    
    // Fix incorrect target markings
    if (cell.isTarget && !isActuallyCorrect) {
      grid[row][col].isTarget = false;
      newState.grid = grid;
    }
    
    if (newState.incorrectGuesses >= 3) {
      newState.gameOver = true;
      newState.gameWon = false;
    }
    
    return { 
      didMunch: true, 
      correct: false, 
      hitTroggle: false, 
      nextState: newState 
    };
  }
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
      case 'mixed':
        if (typeof cell.value === 'string') {
          if (cell.value.includes('+')) {
            const [a, b] = cell.value.split('+').map(Number);
            isActuallyCorrect = a + b === state.targetNumber;
          } else if (cell.value.includes('-')) {
            const [a, b] = cell.value.split('-').map(Number);
            isActuallyCorrect = a - b === state.targetNumber;
          }
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
  
  // Get actual grid dimensions instead of using hardcoded constants
  const GRID_ROWS = state.grid.length;
  const GRID_COLS = state.grid[0]?.length || 0;
  
  // Enhanced AI for level mode
  if ('currentLevel' in state) {
    const levelState = state as any; // Cast to access level properties
    const difficultyLevel = getDifficultyLevel(levelState.currentLevel?.id || 1);
    const levelEnemyTypes = levelState.currentLevel?.parameters?.enemyTypes || ['standard'];
    
    for (let i = 0; i < state.troggles.length; i++) {
      const troggle = state.troggles[i];
      const { row, col } = troggle;
      grid[row][col].hasTroggle = false;
      
      // Use enemy type from level definition
      const enemyType = levelEnemyTypes[i % levelEnemyTypes.length];
      const ai = createEnemyAI(enemyType, difficultyLevel);
      const troggleState = {
        position: troggle,
        type: enemyType,
        ai,
        lastMove: new Date(),
        cooldown: 0
      };
      
      // Calculate intelligent move
      const newPos = calculateNextMove(troggleState, levelState, []);
      
      // Move the Troggle and set its type
      grid[newPos.row][newPos.col].hasTroggle = true;
      grid[newPos.row][newPos.col].troggleType = enemyType;
      newTroggles.push(newPos);
    }
  } else {
    // Classic mode - use original simple movement
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
      const newRow = Math.max(0, Math.min(GRID_ROWS - 1, row + dRow));
      const newCol = Math.max(0, Math.min(GRID_COLS - 1, col + dCol));
      
      // Move the Troggle first (allow collision to happen visually)
      grid[newRow][newCol].hasTroggle = true;
      newTroggles.push({ row: newRow, col: newCol });
    }
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
