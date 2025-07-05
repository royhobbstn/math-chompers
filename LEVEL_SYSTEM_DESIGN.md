# Number Munchers Level System Design

## Overview

This document outlines the comprehensive level system for the Number Munchers game, designed to provide progressive difficulty, engaging gameplay, and educational value. The system balances challenge progression with mathematical learning objectives.

## Core Design Principles

1. **Progressive Difficulty**: Each level increases in complexity through multiple dimensions
2. **Educational Value**: Levels are designed to reinforce mathematical concepts
3. **Engaging Gameplay**: Varied challenges keep players motivated
4. **Accessibility**: Clear feedback and gradual learning curve
5. **Replayability**: Multiple paths and bonus objectives

## Level Structure

### Level Components

Each level consists of:
- **Primary Objective**: Main mathematical rule to master
- **Difficulty Parameters**: Grid size, time limits, enemy behavior
- **Bonus Objectives**: Optional challenges for extra points
- **Progression Requirements**: Criteria to unlock next level

### Level Categories

#### 1. Tutorial Levels (Levels 1-3)
- **Purpose**: Introduce core mechanics and basic math concepts
- **Grid Size**: 4x5 (smaller for easier navigation)
- **Time Limit**: 90 seconds (generous for learning)
- **Enemies**: 1 slow-moving Troggle
- **Rules**: Simple multiples (2, 3, 5)

#### 2. Basic Levels (Levels 4-8)
- **Purpose**: Establish fundamental math skills
- **Grid Size**: 5x6 (standard size)
- **Time Limit**: 60 seconds
- **Enemies**: 1-2 Troggles with normal speed
- **Rules**: Multiples, factors, basic primes

#### 3. Intermediate Levels (Levels 9-15)
- **Purpose**: Introduce complex operations and faster gameplay
- **Grid Size**: 5x6 to 6x7
- **Time Limit**: 45-60 seconds
- **Enemies**: 2-3 Troggles, some with special behaviors
- **Rules**: Addition, subtraction, larger primes, mixed operations

#### 4. Advanced Levels (Levels 16-25)
- **Purpose**: Challenge players with complex scenarios
- **Grid Size**: 6x7 to 7x8
- **Time Limit**: 30-45 seconds
- **Enemies**: 3-4 Troggles with advanced AI patterns
- **Rules**: Complex mixed operations, large number ranges

#### 5. Master Levels (Levels 26+)
- **Purpose**: Ultimate challenges for expert players
- **Grid Size**: Variable, up to 8x9
- **Time Limit**: 20-40 seconds
- **Enemies**: 4+ Troggles with unpredictable behavior
- **Rules**: All operations combined, special challenge modes

## Difficulty Scaling System

### Primary Difficulty Factors

1. **Mathematical Complexity**
   - Number range (2-10 → 2-50 → 2-100)
   - Operation difficulty (single → mixed → complex)
   - Target number complexity

2. **Grid Dynamics**
   - Grid size progression
   - Number of correct answers (3-5 → 5-8 → 8-12)
   - Spatial distribution of targets

3. **Time Pressure**
   - Decreasing time limits per category
   - Bonus time for quick completion
   - Time penalties for mistakes

4. **Enemy Behavior**
   - Number of Troggles (1 → 2 → 3 → 4+)
   - Movement speed (slow → normal → fast)
   - AI patterns (random → tracking → predictive)

### Adaptive Difficulty

- **Performance Tracking**: Monitor player success rates
- **Dynamic Adjustment**: Modify parameters based on performance
- **Skill-Based Progression**: Allow players to advance at their own pace

## Level Progression Mechanics

### Unlocking System

```typescript
interface LevelRequirements {
  minScore: number;           // Minimum score to unlock
  previousLevel: number;      // Must complete this level first
  bonusObjectives?: number;   // Optional: bonus challenges completed
  accuracy?: number;          // Optional: minimum accuracy percentage
}
```

### Progression Paths

1. **Linear Path**: Standard progression through numbered levels
2. **Branching Paths**: Multiple routes through skill trees
3. **Challenge Modes**: Special levels that test specific skills

### Star Rating System

Each level can earn 1-3 stars based on:
- ⭐ **1 Star**: Complete the level (basic success)
- ⭐⭐ **2 Stars**: Complete with good performance (score threshold)
- ⭐⭐⭐ **3 Stars**: Perfect or near-perfect completion (high score + accuracy)

## Enemy AI Progression

### Troggle Behavior Patterns

1. **Random Movement** (Levels 1-5)
   - Completely random direction changes
   - Slow movement speed

2. **Simple Tracking** (Levels 6-10)
   - Occasional movement toward player
   - Normal movement speed

3. **Smart Pursuit** (Levels 11-18)
   - Active tracking with pathfinding
   - Attempts to cut off player routes

4. **Coordinated Hunting** (Levels 19+)
   - Multiple Troggles work together
   - Advanced prediction algorithms
   - Varying movement speeds

### Special Enemy Types

- **Speed Troggle**: Moves twice as fast
- **Smart Troggle**: Uses advanced pathfinding
- **Blocker Troggle**: Guards specific areas
- **Hunter Troggle**: Actively pursues player

## Mathematical Curriculum Integration

### Skill Progression Tree

```
Level 1-3: Basic Multiples (2, 3, 5)
    ↓
Level 4-6: Extended Multiples (up to 10)
    ↓
Level 7-9: Factors Introduction
    ↓
Level 10-12: Prime Numbers
    ↓
Level 13-15: Addition Problems
    ↓
Level 16-18: Subtraction Problems
    ↓
Level 19-21: Mixed Operations
    ↓
Level 22+: Advanced Combinations
```

### Educational Objectives

- **Number Sense**: Understanding relationships between numbers
- **Mental Math**: Quick calculation skills
- **Pattern Recognition**: Identifying mathematical patterns
- **Problem Solving**: Strategic thinking under pressure

## Scoring and Rewards

### Base Scoring System

```typescript
interface LevelScoring {
  basePoints: number;         // Points per correct answer
  timeBonus: number;          // Bonus for remaining time
  accuracyMultiplier: number; // Multiplier based on accuracy
  difficultyBonus: number;    // Bonus based on level difficulty
  streakBonus: number;        // Bonus for consecutive correct answers
}
```

### Reward Types

1. **Points**: Immediate feedback for actions
2. **Stars**: Level completion rating
3. **Badges**: Achievement unlocks
4. **Power-ups**: Temporary game advantages
5. **Unlockables**: New game modes or cosmetics

## Special Game Modes

### 1. Speed Challenge
- Fixed time limit across all levels
- Emphasis on quick recognition and movement
- Leaderboards for fastest completion times

### 2. Accuracy Challenge
- No time limit, but limited mistakes allowed
- Focus on careful mathematical reasoning
- Perfect accuracy required for progression

### 3. Survival Mode
- Endless gameplay with increasing difficulty
- Troggles spawn more frequently over time
- High score competition

### 4. Daily Challenges
- Special limited-time levels
- Unique rule combinations
- Exclusive rewards

## User Interface Considerations

### Level Selection Screen

- **Visual Progress Map**: Show completed levels and unlocked paths
- **Difficulty Indicators**: Clear visual cues for challenge level
- **Star Display**: Show earned stars for each level
- **Recommended Path**: Suggest next optimal level

### In-Game Feedback

- **Progress Indicators**: Show targets remaining, time left
- **Performance Metrics**: Real-time accuracy and score
- **Hint System**: Subtle visual cues for struggling players
- **Celebration Effects**: Satisfying feedback for achievements

## Implementation Strategy

### Phase 1: Core Level System
1. Implement basic level structure
2. Create first 10 levels with increasing difficulty
3. Add star rating system
4. Implement level unlocking mechanics

### Phase 2: Enhanced Progression
1. Add enemy AI improvements
2. Implement branching level paths
3. Create special challenge modes
4. Add achievement system

### Phase 3: Advanced Features
1. Adaptive difficulty system
2. Daily challenges
3. Leaderboards and social features
4. Advanced analytics and player insights

## Technical Implementation Notes

### Data Structures

```typescript
interface Level {
  id: number;
  name: string;
  description: string;
  category: LevelCategory;
  requirements: LevelRequirements;
  parameters: LevelParameters;
  objectives: LevelObjective[];
  rewards: LevelReward[];
}

interface LevelParameters {
  gridSize: { rows: number; cols: number; };
  timeLimit: number;
  rule: GameRule;
  targetNumber?: number;
  enemyCount: number;
  enemyTypes: EnemyType[];
  difficultyModifiers: DifficultyModifier[];
}
```

### Save System

- **Progress Tracking**: Store completed levels, stars earned, scores
- **Statistics**: Track performance metrics for adaptive difficulty
- **Achievements**: Persistent badge and unlock tracking
- **Settings**: Player preferences and accessibility options

## Implementation Checklist

### Phase 1: Core Level System Foundation

#### Step 1: Type Definitions and Data Structures
- [ ] Create comprehensive TypeScript interfaces for level system
- [ ] Define level categories, requirements, parameters, objectives
- [ ] Add enemy types and difficulty modifiers
- [ ] Update existing types to support level system

#### Step 2: Level Data and Configuration
- [ ] Create level definitions file with first 10 levels
- [ ] Implement level parameter calculation functions
- [ ] Add level validation and testing utilities
- [ ] Create level progression logic

#### Step 3: Game State Integration
- [ ] Modify game state to include current level and progress
- [ ] Update game initialization to use level parameters
- [ ] Add level completion detection and scoring
- [ ] Implement star rating calculation

#### Step 4: User Interface Updates
- [ ] Create level selection screen component
- [ ] Update game info display with level information
- [ ] Add progress indicators and star displays
- [ ] Implement level unlock visual feedback

#### Step 5: Save System Enhancement
- [ ] Extend save system to track level progress
- [ ] Add level completion and star storage
- [ ] Implement level unlock persistence
- [ ] Add progress statistics tracking

### Phase 2: Enhanced Features

#### Step 6: Enemy AI Improvements
- [ ] Implement different Troggle behavior patterns
- [ ] Add special enemy types with unique behaviors
- [ ] Create difficulty-based AI scaling
- [ ] Add coordinated enemy movement patterns

#### Step 7: Advanced Scoring and Rewards
- [ ] Implement comprehensive scoring system
- [ ] Add bonus objectives and achievements
- [ ] Create reward calculation and distribution
- [ ] Add performance-based unlocks

#### Step 8: Special Game Modes
- [ ] Implement Speed Challenge mode
- [ ] Add Accuracy Challenge mode
- [ ] Create Survival mode with endless progression
- [ ] Add Daily Challenge system

### Phase 3: Polish and Advanced Features

#### Step 9: Adaptive Difficulty
- [ ] Implement performance tracking
- [ ] Add dynamic difficulty adjustment
- [ ] Create skill-based recommendations
- [ ] Add accessibility options

#### Step 10: UI/UX Enhancements
- [ ] Create visual progress map
- [ ] Add celebration effects and animations
- [ ] Implement hint system for struggling players
- [ ] Add comprehensive tutorial system

---

## Current Implementation Status

**Phase 1 Progress: 5/5 Complete** ✅
- Step 1: Type Definitions ✅ Complete
- Step 2: Level Data ✅ Complete
- Step 3: Game State Integration ✅ Complete  
- Step 4: UI Updates ✅ Complete
- Step 5: Save System ✅ Complete

**Phase 1 COMPLETE!** 🎉

**Bug Fixes:**
- ✅ Fixed level unlocking: Stars are now properly calculated on level completion
- ✅ Fixed grid sizing: Dynamic grid dimensions work for all level sizes
- ✅ Fixed Troggle movement: Uses dynamic grid bounds instead of hardcoded values

**Phase 2 Progress: 1/3 Complete**
- Step 6: Enemy AI Improvements ✅ Complete
- Step 7: Advanced Scoring and Rewards ❌ Not Started
- Step 8: Special Game Modes ❌ Not Started

**Step 6 Implementation Details:**
- ✅ Created enhanced AI system with 5 enemy types (standard, speed, smart, blocker, hunter)
- ✅ Implemented intelligent movement patterns and pathfinding
- ✅ Added difficulty scaling based on level progression
- ✅ Updated level definitions to use new enemy types
- ✅ Added visual indicators and animations for different enemy types
- ✅ Integrated AI system with existing game loop

**Next Action**: Begin Step 7 - Advanced Scoring and Rewards

---