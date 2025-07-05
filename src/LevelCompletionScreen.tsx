import React from 'react';
import type { LevelGameState, LevelScoring } from './types';
import type { Achievement } from './scoring';

interface LevelCompletionScreenProps {
  gameState: LevelGameState;
  scoring: LevelScoring;
  totalScore: number;
  achievements: Achievement[];
  onContinue: () => void;
  onRetry: () => void;
}

export const LevelCompletionScreen: React.FC<LevelCompletionScreenProps> = ({
  gameState,
  scoring,
  totalScore,
  achievements,
  onContinue,
  onRetry
}) => {
  const starsEarned = gameState.session.starsEarned;
  
  return (
    <div className="level-completion-overlay">
      <div className="level-completion-modal">
        <div className="completion-header">
          <h2>Level {gameState.currentLevel.id} Complete!</h2>
          <div className="stars-display">
            {Array.from({length: 3}, (_, i) => (
              <span 
                key={i} 
                className={`star ${i < starsEarned ? 'earned' : 'empty'}`}
              >
                ⭐
              </span>
            ))}
          </div>
        </div>

        <div className="scoring-breakdown">
          <h3>Score Breakdown</h3>
          <div className="score-item">
            <span>Base Points:</span>
            <span>{scoring.basePoints}</span>
          </div>
          <div className="score-item">
            <span>Time Bonus:</span>
            <span>+{scoring.timeBonus}</span>
          </div>
          <div className="score-item">
            <span>Difficulty Bonus:</span>
            <span>+{scoring.difficultyBonus}</span>
          </div>
          <div className="score-item">
            <span>Streak Bonus:</span>
            <span>+{scoring.streakBonus}</span>
          </div>
          <div className="score-item">
            <span>Objective Bonus:</span>
            <span>+{scoring.objectiveBonus}</span>
          </div>
          <div className="score-item multiplier">
            <span>Accuracy Multiplier:</span>
            <span>×{scoring.accuracyMultiplier.toFixed(1)}</span>
          </div>
          <div className="score-item total">
            <span><strong>Total Score:</strong></span>
            <span><strong>{totalScore}</strong></span>
          </div>
        </div>

        <div className="level-stats">
          <h3>Level Statistics</h3>
          <div className="stats-grid">
            <div className="stat">
              <span className="stat-label">Accuracy:</span>
              <span className="stat-value">{gameState.accuracy}%</span>
            </div>
            <div className="stat">
              <span className="stat-label">Best Streak:</span>
              <span className="stat-value">{gameState.currentStreak}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Time Remaining:</span>
              <span className="stat-value">{gameState.timeLeft}s</span>
            </div>
            <div className="stat">
              <span className="stat-label">Puzzles Solved:</span>
              <span className="stat-value">{gameState.puzzlesSolved}</span>
            </div>
          </div>
        </div>

        {gameState.completedObjectives.length > 0 && (
          <div className="objectives-completed">
            <h3>Objectives Completed</h3>
            <div className="objectives-list">
              {gameState.objectives
                .filter(obj => gameState.completedObjectives.includes(obj.id))
                .map(objective => (
                  <div key={objective.id} className="objective-completed">
                    <span className="objective-icon">✅</span>
                    <span className="objective-text">{objective.description}</span>
                    <span className="objective-points">+{objective.points}pts</span>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {achievements.length > 0 && (
          <div className="achievements-earned">
            <h3>🏆 Achievements Unlocked!</h3>
            <div className="achievements-list">
              {achievements.map(achievement => (
                <div key={achievement.id} className={`achievement-item rarity-${achievement.rarity}`}>
                  <span className="achievement-icon">{achievement.icon}</span>
                  <div className="achievement-details">
                    <div className="achievement-name">{achievement.name}</div>
                    <div className="achievement-description">{achievement.description}</div>
                  </div>
                  <span className="achievement-points">+{achievement.points}pts</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="completion-actions">
          <button className="retry-btn" onClick={onRetry}>
            🔄 Try Again
          </button>
          <button className="continue-btn" onClick={onContinue}>
            ➡️ Continue
          </button>
        </div>
      </div>
    </div>
  );
};
