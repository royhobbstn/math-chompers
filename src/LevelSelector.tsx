import { useState, useEffect } from 'react';
import { LEVELS, LEVEL_CATEGORIES, getLevelsByCategory } from './levels';
import { loadSaveData, getUnlockedLevels, getCompletedLevels, getTotalStars, getRecommendedLevel } from './levelGameState';
import type { SaveData, LevelCategory } from './types';

interface LevelSelectorProps {
  onLevelSelect: (levelId: number) => void;
  onBack: () => void;
}

export function LevelSelector({ onLevelSelect, onBack }: LevelSelectorProps) {
  const [saveData, setSaveData] = useState<SaveData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<LevelCategory>('tutorial');

  useEffect(() => {
    const data = loadSaveData();
    setSaveData(data);
  }, []);

  if (!saveData) {
    return <div className="loading">Loading...</div>;
  }

  const unlockedLevels = getUnlockedLevels(saveData);
  const completedLevels = getCompletedLevels(saveData);
  const totalStars = getTotalStars(saveData);
  const recommendedLevel = getRecommendedLevel(saveData);

  return (
    <div className="level-selector">
      <div className="level-selector-header">
        <button className="back-button" onClick={onBack}>
          ← Back to Main Menu
        </button>
        <h1>Select Level</h1>
        <div className="player-stats">
          <div className="stat">
            <span className="stat-label">Total Stars:</span>
            <span className="stat-value">{totalStars}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Completed:</span>
            <span className="stat-value">{completedLevels.length}/{LEVELS.length}</span>
          </div>
        </div>
      </div>

      <div className="category-tabs">
        {Object.entries(LEVEL_CATEGORIES).map(([category, info]) => {
          const categoryLevels = getLevelsByCategory(category as LevelCategory);
          const hasUnlockedInCategory = categoryLevels.some(level => unlockedLevels.includes(level.id));
          
          return (
            <button
              key={category}
              className={`category-tab ${selectedCategory === category ? 'active' : ''} ${!hasUnlockedInCategory ? 'locked' : ''}`}
              onClick={() => setSelectedCategory(category as LevelCategory)}
              disabled={!hasUnlockedInCategory}
              style={{ borderColor: info.color }}
            >
              <span className="category-name">{info.name}</span>
              <span className="category-count">
                {categoryLevels.filter(level => completedLevels.includes(level.id)).length}/{categoryLevels.length}
              </span>
            </button>
          );
        })}
      </div>

      <div className="levels-grid">
        {getLevelsByCategory(selectedCategory).map(level => {
          const isUnlocked = unlockedLevels.includes(level.id);
          const isCompleted = completedLevels.includes(level.id);
          const isRecommended = level.id === recommendedLevel;
          const progress = saveData.levelProgress[level.id];
          const stars = progress?.starsEarned || 0;

          return (
            <div
              key={level.id}
              className={`level-card ${isUnlocked ? 'unlocked' : 'locked'} ${isCompleted ? 'completed' : ''} ${isRecommended ? 'recommended' : ''}`}
              onClick={() => isUnlocked && onLevelSelect(level.id)}
            >
              <div className="level-number">{level.id}</div>
              <div className="level-info">
                <h3 className="level-name">{level.name}</h3>
                <p className="level-description">{level.description}</p>
                
                {isUnlocked && (
                  <div className="level-details">
                    <div className="level-rule">
                      {level.parameters.rule === 'multiples' && `Multiples of ${level.parameters.targetNumber}`}
                      {level.parameters.rule === 'factors' && `Factors of ${level.parameters.targetNumber}`}
                      {level.parameters.rule === 'primes' && 'Prime Numbers'}
                      {level.parameters.rule === 'addition' && `Addition = ${level.parameters.targetNumber}`}
                      {level.parameters.rule === 'subtraction' && `Subtraction = ${level.parameters.targetNumber}`}
                      {level.parameters.rule === 'mixed' && `Mixed Operations = ${level.parameters.targetNumber}`}
                    </div>
                    
                    <div className="level-params">
                      <span className="param">⏱️ {level.parameters.timeLimit}s</span>
                      <span className="param">🎯 {level.parameters.enemyCount} enemies</span>
                      <span className="param">📏 {level.parameters.gridSize.rows}×{level.parameters.gridSize.cols}</span>
                    </div>
                  </div>
                )}
                
                {isCompleted && (
                  <div className="level-completion">
                    <div className="stars">
                      {[1, 2, 3].map(star => (
                        <span key={star} className={`star ${star <= stars ? 'earned' : 'empty'}`}>
                          ⭐
                        </span>
                      ))}
                    </div>
                    <div className="best-score">Best: {progress?.bestScore || 0}</div>
                  </div>
                )}
                
                {isRecommended && !isCompleted && (
                  <div className="recommended-badge">Recommended</div>
                )}
              </div>
              
              {!isUnlocked && (
                <div className="lock-overlay">
                  <div className="lock-icon">🔒</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// CSS styles for the level selector
export const levelSelectorStyles = `
.level-selector {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.level-selector-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #ddd;
}

.back-button {
  padding: 10px 20px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
}

.back-button:hover {
  background: #5a6268;
}

.player-stats {
  display: flex;
  gap: 20px;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 20px;
  font-weight: bold;
  color: #333;
}

.category-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 30px;
  flex-wrap: wrap;
}

.category-tab {
  padding: 12px 24px;
  border: 2px solid #ddd;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 120px;
}

.category-tab:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.category-tab.active {
  background: #f8f9fa;
  border-width: 3px;
}

.category-tab.locked {
  opacity: 0.5;
  cursor: not-allowed;
}

.category-name {
  font-weight: bold;
  margin-bottom: 4px;
}

.category-count {
  font-size: 12px;
  color: #666;
}

.levels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.level-card {
  border: 2px solid #ddd;
  border-radius: 12px;
  padding: 20px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
}

.level-card.unlocked:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0,0,0,0.1);
  border-color: #007bff;
}

.level-card.completed {
  border-color: #28a745;
  background: linear-gradient(135deg, #fff 0%, #f8fff9 100%);
}

.level-card.recommended {
  border-color: #ffc107;
  background: linear-gradient(135deg, #fff 0%, #fffbf0 100%);
}

.level-card.locked {
  opacity: 0.6;
  cursor: not-allowed;
}

.level-number {
  position: absolute;
  top: 10px;
  right: 15px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #007bff;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 18px;
}

.level-card.completed .level-number {
  background: #28a745;
}

.level-card.recommended .level-number {
  background: #ffc107;
  color: #333;
}

.level-info {
  margin-right: 50px;
}

.level-name {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: #333;
}

.level-description {
  margin: 0 0 15px 0;
  color: #666;
  font-size: 14px;
  line-height: 1.4;
}

.level-details {
  margin-bottom: 15px;
}

.level-rule {
  font-weight: bold;
  color: #007bff;
  margin-bottom: 8px;
}

.level-params {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.param {
  font-size: 12px;
  color: #666;
  background: #f8f9fa;
  padding: 4px 8px;
  border-radius: 4px;
}

.level-completion {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stars {
  display: flex;
  gap: 2px;
}

.star.earned {
  color: #ffc107;
}

.star.empty {
  color: #ddd;
}

.best-score {
  font-size: 12px;
  color: #666;
  font-weight: bold;
}

.recommended-badge {
  background: #ffc107;
  color: #333;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  display: inline-block;
}

.lock-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
}

.lock-icon {
  font-size: 48px;
  opacity: 0.5;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  font-size: 18px;
  color: #666;
}

@media (max-width: 768px) {
  .level-selector-header {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }
  
  .player-stats {
    justify-content: center;
  }
  
  .levels-grid {
    grid-template-columns: 1fr;
  }
  
  .category-tabs {
    justify-content: center;
  }
}
`;
