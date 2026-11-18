import { useEffect, useState } from 'react';
import { GameBoard } from './components/GameBoard';
import { PostLevelModal, PreLevelModal } from './components/LevelModal';
import { ManorMap } from './components/ManorMap';
import { LEVELS } from './data/levels';
import { BoostersInventory, LevelConfig, PlayerProgress } from './types/game';
import { sound } from './utils/sound';

const STORAGE_KEY = 'manor_match3_progress_v1';

const DEFAULT_PROGRESS: PlayerProgress = {
  unlockedLevel: 1,
  levelStars: {},
  levelHighScores: {},
  coins: 300,
  renovationStars: 1,
  completedRenovations: [],
  boosters: {
    hammer: 3,
    glove: 2,
    shuffle: 2,
  },
  muted: false,
};

function loadProgress(): PlayerProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<PlayerProgress>;
    return {
      ...DEFAULT_PROGRESS,
      ...parsed,
      boosters: {
        ...DEFAULT_PROGRESS.boosters,
        ...(parsed.boosters || {}),
      },
    };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export default function App() {
  const [progress, setProgress] = useState<PlayerProgress>(loadProgress);
  const [briefingLevel, setBriefingLevel] = useState<LevelConfig | null>(null);
  const [activeLevel, setActiveLevel] = useState<LevelConfig | null>(null);
  const [playInstanceKey, setPlayInstanceKey] = useState(1);
  const [postResult, setPostResult] = useState<{
    won: boolean;
    score: number;
    stars: number;
    coinsEarned: number;
  } | null>(null);

  useEffect(() => {
    sound.setMuted(progress.muted);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      // Ignore storage quota errors
    }
  }, [progress]);

  const handleToggleMute = () => {
    setProgress((prev) => ({ ...prev, muted: !prev.muted }));
  };

  const handleConsumeBooster = (type: keyof BoostersInventory) => {
    setProgress((prev) => ({
      ...prev,
      boosters: {
        ...prev.boosters,
        [type]: Math.max(0, prev.boosters[type] - 1),
      },
    }));
  };

  const handleBuyBooster = (type: keyof BoostersInventory, cost: number) => {
    setProgress((prev) => {
      if (prev.coins < cost) return prev;
      sound.playPowerCreate();
      return {
        ...prev,
        coins: prev.coins - cost,
        boosters: {
          ...prev.boosters,
          [type]: prev.boosters[type] + 1,
        },
      };
    });
  };

  const handleCompleteRenovation = (taskId: string, costStars: number, rewardCoins: number) => {
    setProgress((prev) => {
      if (prev.renovationStars < costStars || prev.completedRenovations.includes(taskId)) {
        return prev;
      }
      sound.playRenovate();
      return {
        ...prev,
        renovationStars: prev.renovationStars - costStars,
        coins: prev.coins + rewardCoins,
        completedRenovations: [...prev.completedRenovations, taskId],
      };
    });
  };

  const handleSpendCoinsForMoves = (cost: number): boolean => {
    if (progress.coins < cost) return false;
    setProgress((prev) => ({
      ...prev,
      coins: prev.coins - cost,
    }));
    return true;
  };

  const handleLevelComplete = (result: {
    won: boolean;
    score: number;
    stars: number;
    remainingMoves: number;
    coinsEarned: number;
  }) => {
    if (result.won && activeLevel) {
      setProgress((prev) => {
        const isFirstClear = !prev.levelStars[activeLevel.id];
        const prevBestStars = prev.levelStars[activeLevel.id] || 0;
        const prevBestScore = prev.levelHighScores[activeLevel.id] || 0;
        const nextUnlocked = Math.min(
          LEVELS.length,
          Math.max(prev.unlockedLevel, activeLevel.id + 1)
        );

        return {
          ...prev,
          unlockedLevel: nextUnlocked,
          levelStars: {
            ...prev.levelStars,
            [activeLevel.id]: Math.max(prevBestStars, result.stars),
          },
          levelHighScores: {
            ...prev.levelHighScores,
            [activeLevel.id]: Math.max(prevBestScore, result.score),
          },
          coins: prev.coins + result.coinsEarned,
          renovationStars: prev.renovationStars + (isFirstClear ? 1 : 0),
        };
      });
    }
    setPostResult({
      won: result.won,
      score: result.score,
      stars: result.stars,
      coinsEarned: result.coinsEarned,
    });
  };

  const handleStartFromBriefing = () => {
    if (!briefingLevel) return;
    setActiveLevel(briefingLevel);
    setBriefingLevel(null);
    setPostResult(null);
    setPlayInstanceKey((k) => k + 1);
  };

  const handleReplay = () => {
    setPostResult(null);
    setPlayInstanceKey((k) => k + 1);
  };

  const handleNextLevel = () => {
    if (!activeLevel) return;
    const nextLvl = LEVELS.find((l) => l.id === activeLevel.id + 1);
    setPostResult(null);
    if (nextLvl) {
      setActiveLevel(nextLvl);
      setPlayInstanceKey((k) => k + 1);
    } else {
      setActiveLevel(null);
    }
  };

  const handleReturnMap = () => {
    setPostResult(null);
    setActiveLevel(null);
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#100C0A] flex items-center justify-center sm:p-4 relative overflow-hidden">
      {/* Subtle outer ambient glow on wide screens */}
      <div
        className="hidden sm:block pointer-events-none fixed inset-0 opacity-15 blur-xl scale-110 bg-cover bg-center"
        style={{
          backgroundImage: 'url("/src/assets/images/manor_foyer_backdrop_1795008110014.jpg")',
        }}
      />

      {/* Dedicated Mobile Game Viewport Frame */}
      <div className="relative w-full max-w-[430px] h-[100dvh] sm:h-[min(92dvh,860px)] sm:rounded-[34px] sm:border-[3px] sm:border-[#4B382F] sm:shadow-[0_24px_80px_rgba(0,0,0,0.85)] bg-[#1C1613] overflow-hidden flex flex-col">
        {activeLevel ? (
          <GameBoard
            key={`${activeLevel.id}-${playInstanceKey}`}
            level={activeLevel}
            boosters={progress.boosters}
            muted={progress.muted}
            onToggleMute={handleToggleMute}
            onConsumeBooster={handleConsumeBooster}
            onExitToMap={handleReturnMap}
            onLevelComplete={handleLevelComplete}
            coins={progress.coins}
            onSpendCoinsForMoves={handleSpendCoinsForMoves}
          />
        ) : (
          <ManorMap
            progress={progress}
            onSelectLevel={(lvl) => setBriefingLevel(lvl)}
            onCompleteRenovation={handleCompleteRenovation}
            onBuyBooster={handleBuyBooster}
            onToggleMute={handleToggleMute}
          />
        )}

        {briefingLevel && (
          <PreLevelModal
            level={briefingLevel}
            bestStars={progress.levelStars[briefingLevel.id] || 0}
            bestScore={progress.levelHighScores[briefingLevel.id] || 0}
            onStart={handleStartFromBriefing}
            onClose={() => setBriefingLevel(null)}
          />
        )}

        {activeLevel && postResult && (
          <PostLevelModal
            level={activeLevel}
            won={postResult.won}
            score={postResult.score}
            stars={postResult.stars}
            coinsEarned={postResult.coinsEarned}
            hasNextLevel={activeLevel.id < LEVELS.length}
            onReplay={handleReplay}
            onNextLevel={handleNextLevel}
            onReturnMap={handleReturnMap}
          />
        )}
      </div>
    </div>
  );
}
