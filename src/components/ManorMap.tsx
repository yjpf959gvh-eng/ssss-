import React, { useState } from 'react';
import {
  CheckCircle2,
  Coins,
  Hammer,
  Hand,
  Home,
  Lock,
  Map as MapIcon,
  Play,
  Shuffle,
  Star,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { LEVELS } from '../data/levels';
import { RENOVATION_TASKS } from '../data/renovation';
import { BoostersInventory, LevelConfig, PlayerProgress } from '../types/game';

interface ManorMapProps {
  progress: PlayerProgress;
  onSelectLevel: (level: LevelConfig) => void;
  onCompleteRenovation: (taskId: string, costStars: number, rewardCoins: number) => void;
  onBuyBooster: (type: keyof BoostersInventory, cost: number) => void;
  onToggleMute: () => void;
}

export const ManorMap: React.FC<ManorMapProps> = ({
  progress,
  onSelectLevel,
  onCompleteRenovation,
  onBuyBooster,
  onToggleMute,
}) => {
  const [activeTab, setActiveTab] = useState<'levels' | 'renovation'>('levels');

  const totalStarsEarned = Object.values(progress.levelStars).reduce((a, b) => a + b, 0);
  const completedCount = Object.keys(progress.levelStars).length;
  const renovationDoneCount = progress.completedRenovations.length;

  // Only reveal levels up to unlockedLevel (most recent at top for one-thumb reach)
  const revealedLevels = LEVELS.filter((l) => l.id <= progress.unlockedLevel).reverse();
  const currentLevel =
    LEVELS.find((l) => l.id === progress.unlockedLevel) || LEVELS[LEVELS.length - 1];
  const hasMysteryNext = progress.unlockedLevel < LEVELS.length;

  return (
    <div className="h-full w-full bg-[#1C1613] text-[#FAF5EF] flex flex-col overflow-hidden">
      {/* Mobile App Top Bar (52px) */}
      <header className="shrink-0 h-13 px-3.5 bg-[#1C1613]/95 border-b border-amber-200/15 flex items-center justify-between gap-2">
        <span className="font-display text-lg font-bold tracking-tight text-amber-100 whitespace-nowrap">
          锦绣庄园
        </span>

        <div className="flex items-center gap-3 text-xs font-bold tabular-nums">
          <div className="flex items-center gap-1 text-amber-300">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{totalStarsEarned}</span>
          </div>
          <div className="text-emerald-300">{progress.renovationStars}装修星</div>
          <div className="flex items-center gap-1 text-amber-200">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>{progress.coins}</span>
          </div>
          <button
            onClick={onToggleMute}
            aria-label={progress.muted ? '开启音效' : '关闭音效'}
            className="w-9 h-9 rounded-xl bg-[#2A201B] border border-amber-200/15 text-amber-100 flex items-center justify-center cursor-pointer"
          >
            {progress.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Scrollable Mobile Body */}
      <main className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3.5 no-scrollbar">
        {/* Compact Manor Hero Card */}
        <section className="rounded-2xl overflow-hidden border border-amber-200/20 bg-[#2A201B] shadow-lg">
          <div className="relative h-32">
            <img
              src="/src/assets/images/manor_foyer_backdrop_1795008110014.jpg"
              alt="锦绣庄园"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#2A201B] via-[#1C1613]/45 to-transparent" />
            <div className="absolute bottom-2.5 left-3.5 right-3.5 flex items-end justify-between gap-2">
              <div>
                <div className="text-[11px] text-amber-200/90 tabular-nums">
                  当前进度 {completedCount}/20 关 · 翻新 {renovationDoneCount}/{RENOVATION_TASKS.length}
                </div>
                <h1 className="font-display text-lg font-bold text-white leading-tight">
                  {currentLevel.chapterName}
                </h1>
              </div>
              <img
                src="/src/assets/images/manor_butler_avatar_1795008109289.jpg"
                alt="老管家"
                referrerPolicy="no-referrer"
                className="w-11 h-11 rounded-xl object-cover border border-amber-300/60 shrink-0 shadow"
              />
            </div>
          </div>

          {/* Compact Booster Supply Strip */}
          <div className="px-3 py-2.5 border-t border-amber-200/10 flex items-center justify-between gap-2">
            <span className="text-[11px] text-amber-100/70 shrink-0">道具补给 (100币)</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onBuyBooster('hammer', 100)}
                disabled={progress.coins < 100}
                className="h-8 px-2.5 rounded-lg bg-[#3A2C25] active:scale-95 disabled:opacity-40 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Hammer className="w-3 h-3 text-amber-300" />
                <span>锤 {progress.boosters.hammer}</span>
              </button>
              <button
                onClick={() => onBuyBooster('glove', 100)}
                disabled={progress.coins < 100}
                className="h-8 px-2.5 rounded-lg bg-[#3A2C25] active:scale-95 disabled:opacity-40 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Hand className="w-3 h-3 text-amber-300" />
                <span>套 {progress.boosters.glove}</span>
              </button>
              <button
                onClick={() => onBuyBooster('shuffle', 100)}
                disabled={progress.coins < 100}
                className="h-8 px-2.5 rounded-lg bg-[#3A2C25] active:scale-95 disabled:opacity-40 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Shuffle className="w-3 h-3 text-amber-300" />
                <span>洗 {progress.boosters.shuffle}</span>
              </button>
            </div>
          </div>
        </section>

        {activeTab === 'levels' ? (
          <section className="space-y-2.5 pb-2">
            <div className="flex items-center justify-between px-0.5">
              <h2 className="font-display text-base font-bold text-amber-100">庄园闯关路线</h2>
              <span className="text-[11px] text-amber-200/70">通关后自动解锁下一关</span>
            </div>

            {/* Shrouded Mystery Next Level Card (Only 1 teaser ahead!) */}
            {hasMysteryNext && (
              <div className="rounded-2xl p-3.5 border border-dashed border-amber-200/20 bg-[#221A15]/70 flex items-center justify-between gap-3 opacity-75">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#2E231D] border border-amber-200/15 flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4 text-amber-200/60" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-amber-100/80">
                      第 {progress.unlockedLevel + 1} 关 · 迷雾未知区域
                    </div>
                    <div className="text-[11px] text-[#DED3C7]/60 mt-0.5">
                      通过第 {progress.unlockedLevel} 关后揭晓新挑战
                    </div>
                  </div>
                </div>
                <span className="text-[11px] text-amber-200/50 shrink-0">未解锁</span>
              </div>
            )}

            {/* Revealed Levels Path (Current Active Level + Cleared Levels) */}
            <div className="space-y-2.5">
              {revealedLevels.map((lvl) => {
                const stars = progress.levelStars[lvl.id] || 0;
                const isCurrent = lvl.id === progress.unlockedLevel;

                return (
                  <button
                    key={lvl.id}
                    onClick={() => onSelectLevel(lvl)}
                    className={`w-full text-left rounded-2xl p-3.5 border transition-all flex items-center justify-between gap-3 active:scale-[0.98] cursor-pointer ${
                      isCurrent
                        ? 'bg-[#382920] border-amber-400/75 shadow-[0_6px_24px_rgba(245,158,11,0.18)]'
                        : 'bg-[#2A201B] border-amber-200/15'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center font-display font-bold text-base shrink-0 tabular-nums ${
                          isCurrent
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-[#3A2C25] text-amber-200 border border-amber-200/15'
                        }`}
                      >
                        {lvl.id}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] text-amber-300/85">
                          {lvl.chapterName} · {lvl.difficulty} · {lvl.colorCount}色
                        </div>
                        <div className="font-display text-base font-bold text-[#FAF5EF] truncate">
                          {lvl.title}
                        </div>
                        <div className="text-[11px] text-[#DED3C7]/75 truncate mt-0.5">
                          {lvl.goals.map((g) => `${g.label}×${g.target}`).join(' / ')}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3].map((n) => (
                          <Star
                            key={n}
                            className={`w-3.5 h-3.5 ${
                              n <= stars ? 'fill-amber-400 text-amber-400' : 'text-amber-100/20'
                            }`}
                          />
                        ))}
                      </div>
                      <span
                        className={`text-xs font-bold ${
                          isCurrent ? 'text-amber-300' : 'text-amber-100/65'
                        }`}
                      >
                        {isCurrent ? '点击挑战' : '重温'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="space-y-2.5 pb-2">
            <div className="flex items-center justify-between px-0.5">
              <h2 className="font-display text-base font-bold text-amber-100">庄园翻新任务</h2>
              <span className="text-xs font-bold text-emerald-300 tabular-nums">
                可用 {progress.renovationStars} 装修星
              </span>
            </div>

            {RENOVATION_TASKS.map((task, idx) => {
              const completed = progress.completedRenovations.includes(task.id);
              const canAfford = progress.renovationStars >= task.costStars;

              return (
                <div
                  key={task.id}
                  className={`rounded-2xl p-3.5 border space-y-2.5 ${
                    completed
                      ? 'bg-emerald-950/35 border-emerald-400/35'
                      : 'bg-[#2A201B] border-amber-200/15'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[11px] text-amber-300/80">
                        {String(idx + 1).padStart(2, '0')}. {task.roomName} · {task.previewBadge}
                      </div>
                      <h3 className="font-display text-base font-bold text-[#FAF5EF]">
                        {task.title}
                      </h3>
                    </div>
                    {completed && (
                      <div className="flex items-center gap-1 text-emerald-300 text-xs font-bold shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>已翻新</span>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-[#DED3C7]/80 leading-relaxed">{task.description}</p>

                  {!completed && (
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-amber-200/10">
                      <span className="text-[11px] text-amber-200/75 tabular-nums">
                        回馈 +{task.rewardCoins} 金币
                      </span>
                      <button
                        onClick={() =>
                          onCompleteRenovation(task.id, task.costStars, task.rewardCoins)
                        }
                        disabled={!canAfford}
                        className="h-9 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-[#3A2C25] disabled:text-amber-100/40 text-slate-950 font-bold text-xs transition-colors cursor-pointer disabled:cursor-not-allowed"
                      >
                        {canAfford ? `花费 ${task.costStars} 星翻新` : `需 ${task.costStars} 装修星`}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}
      </main>

      {/* Mobile Sticky Bottom Action + Tab Dock */}
      <footer className="shrink-0 bg-[#1C1613]/95 backdrop-blur-md border-t border-amber-200/15 px-3.5 pt-2.5 pb-[max(0.65rem,env(safe-area-inset-bottom))] space-y-2">
        {activeTab === 'levels' && (
          <button
            onClick={() => onSelectLevel(currentLevel)}
            className="w-full h-11 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>开始第 {currentLevel.id} 关 · {currentLevel.title}</span>
          </button>
        )}

        <nav className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setActiveTab('levels')}
            className={`h-11 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'levels'
                ? 'bg-[#362820] text-amber-300 border border-amber-400/35'
                : 'text-[#DED3C7]/65 hover:text-amber-100'
            }`}
          >
            <MapIcon className="w-4 h-4" />
            <span>闯关地图</span>
          </button>
          <button
            onClick={() => setActiveTab('renovation')}
            className={`h-11 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'renovation'
                ? 'bg-[#362820] text-amber-300 border border-amber-400/35'
                : 'text-[#DED3C7]/65 hover:text-amber-100'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>庄园翻新 ({renovationDoneCount}/{RENOVATION_TASKS.length})</span>
          </button>
        </nav>
      </footer>
    </div>
  );
};
