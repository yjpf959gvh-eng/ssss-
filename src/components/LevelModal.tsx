import React from 'react';
import { ArrowRight, Play, RotateCcw, Star, X } from 'lucide-react';
import { LevelConfig } from '../types/game';
import { GoalIcon } from './TileArtwork';

interface PreLevelModalProps {
  level: LevelConfig;
  bestStars: number;
  bestScore: number;
  onStart: () => void;
  onClose: () => void;
}

export const PreLevelModal: React.FC<PreLevelModalProps> = ({
  level,
  bestStars,
  bestScore,
  onStart,
  onClose,
}) => {
  return (
    <div className="absolute inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="relative w-full bg-[#2A201B] border-t sm:border border-amber-200/25 rounded-t-3xl sm:rounded-3xl sm:mx-4 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl space-y-4">
        <div className="w-10 h-1 rounded-full bg-amber-200/25 mx-auto sm:hidden" />

        <button
          onClick={onClose}
          aria-label="关闭"
          className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-[#3A2C25] hover:bg-[#4B3930] text-amber-100 flex items-center justify-center cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-1 pr-10">
          <div className="text-xs text-amber-300/90 flex items-center gap-1.5">
            <span>第 {level.id} 关</span>
            <span aria-hidden="true">·</span>
            <span>{level.chapterName}</span>
            <span aria-hidden="true">·</span>
            <span>{level.difficulty}</span>
          </div>
          <h2 className="font-display text-2xl font-bold text-[#FAF5EF]">{level.title}</h2>
          <p className="text-xs text-[#DED3C7] leading-relaxed">{level.subtitle}</p>
        </div>

        <div className="bg-[#1D1512] border border-amber-200/10 rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-amber-100/75">
            <span>通关目标</span>
            <span className="tabular-nums font-semibold text-amber-200">步数：{level.moves} 步</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {level.goals.map((g) => (
              <div
                key={g.type}
                className="flex items-center gap-2 bg-[#2A201B] rounded-xl px-2.5 py-2 border border-amber-200/10"
              >
                <GoalIcon type={g.type} className="w-6 h-6 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] text-amber-100/75 truncate">{g.label}</div>
                  <div className="text-sm font-bold tabular-nums text-amber-200">×{g.target}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-amber-100/70 px-1">
          <div className="flex items-center gap-1">
            {[1, 2, 3].map((n) => (
              <Star
                key={n}
                className={`w-4 h-4 ${
                  n <= bestStars ? 'fill-amber-400 text-amber-400' : 'text-amber-200/20'
                }`}
              />
            ))}
          </div>
          <span className="tabular-nums">
            {bestScore > 0 ? `最高 ${bestScore.toLocaleString()} 分` : '首次挑战'}
          </span>
        </div>

        <button
          onClick={onStart}
          className="w-full h-12 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-extrabold text-base flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>开始闯关</span>
        </button>
      </div>
    </div>
  );
};

interface PostLevelModalProps {
  level: LevelConfig;
  won: boolean;
  score: number;
  stars: number;
  coinsEarned: number;
  hasNextLevel: boolean;
  onReplay: () => void;
  onNextLevel: () => void;
  onReturnMap: () => void;
}

export const PostLevelModal: React.FC<PostLevelModalProps> = ({
  level,
  won,
  score,
  stars,
  coinsEarned,
  hasNextLevel,
  onReplay,
  onNextLevel,
  onReturnMap,
}) => {
  return (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="w-full bg-[#2A201B] border-t sm:border border-amber-200/25 rounded-t-3xl sm:rounded-3xl sm:mx-4 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-center shadow-2xl space-y-4">
        <div className="w-10 h-1 rounded-full bg-amber-200/25 mx-auto sm:hidden" />

        <div className="space-y-1">
          <div className="text-xs text-amber-300/80">
            第 {level.id} 关 · {level.title}
          </div>
          <h2 className="font-display text-2xl font-bold text-[#FAF5EF]">
            {won ? (level.id === 20 ? '二十关全破！' : '关卡完成！') : '差一点点'}
          </h2>
        </div>

        <div className="flex items-center justify-center gap-3 py-1">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                won && n <= stars
                  ? 'bg-amber-500/20 border-amber-300/60 scale-105'
                  : 'bg-[#1D1512] border-amber-200/10'
              }`}
            >
              <Star
                className={`w-7 h-7 ${
                  won && n <= stars ? 'fill-amber-400 text-amber-400' : 'text-amber-200/20'
                }`}
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2.5 bg-[#1D1512] rounded-2xl p-3.5 border border-amber-200/10">
          <div>
            <div className="text-[11px] text-amber-100/65">本局得分</div>
            <div className="text-lg font-extrabold tabular-nums text-amber-200">
              {score.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-amber-100/65">获得奖励</div>
            <div className="text-sm font-extrabold tabular-nums text-emerald-300 mt-1">
              {won ? `+${coinsEarned}币 · +1星` : '未扣体力'}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {won && hasNextLevel && (
            <button
              onClick={onNextLevel}
              className="w-full h-12 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-extrabold text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <span>解锁并进入第 {level.id + 1} 关</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onReturnMap}
              className="h-11 rounded-xl bg-[#3A2C25] hover:bg-[#4B3930] text-amber-100 font-semibold text-xs transition-colors cursor-pointer"
            >
              返回路线图
            </button>
            <button
              onClick={onReplay}
              className="h-11 rounded-xl bg-[#3A2C25] hover:bg-[#4B3930] text-amber-100 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>重玩本关</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
