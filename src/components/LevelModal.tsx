import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Play, RotateCcw, Star, X } from 'lucide-react';
import { LevelConfig } from '../types/game';
import { sound } from '../utils/sound';
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
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 360, damping: 28 }}
        className="relative w-full bg-[#2A201B] border-t sm:border border-amber-200/25 rounded-t-3xl sm:rounded-3xl sm:mx-4 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl space-y-4"
      >
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
      </motion.div>
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

const CONFETTI_COLORS = ['#FBBF24', '#34D399', '#FB7185', '#60A5FA', '#C084FC'];

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
  const [revealedStars, setRevealedStars] = useState(0);
  const [displayScore, setDisplayScore] = useState(0);
  const [displayCoins, setDisplayCoins] = useState(0);

  // Choreographed 1-by-1 star pop-in with ding audio
  useEffect(() => {
    setRevealedStars(0);
    if (!won || stars <= 0) return;

    const timers: number[] = [];
    for (let i = 1; i <= stars; i++) {
      const t = window.setTimeout(() => {
        setRevealedStars(i);
        sound.playStarDing(i);
      }, 220 + (i - 1) * 320);
      timers.push(t);
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [won, stars]);

  // Smooth score and coin count-up roll
  useEffect(() => {
    const start = performance.now();
    const duration = 750;
    let raf = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayScore(Math.round(score * eased));
      setDisplayCoins(Math.round(coinsEarned * eased));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score, coinsEarned]);

  return (
    <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center overflow-hidden">
      {/* Celebratory Confetti Backdrop when Won */}
      {won && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 20 }).map((_, idx) => {
            const left = `${(idx * 5.2 + 3) % 96}%`;
            const delay = (idx % 5) * 0.14;
            const color = CONFETTI_COLORS[idx % CONFETTI_COLORS.length];
            return (
              <motion.span
                key={idx}
                initial={{ y: -30, x: 0, rotate: 0, opacity: 0.95 }}
                animate={{
                  y: 520,
                  x: idx % 2 === 0 ? 28 : -28,
                  rotate: idx % 2 === 0 ? 320 : -320,
                  opacity: 0,
                }}
                transition={{
                  duration: 2.2,
                  delay,
                  ease: 'easeOut',
                }}
                style={{ left, backgroundColor: color }}
                className="absolute top-0 w-2.5 h-3.5 rounded-sm"
              />
            );
          })}
        </div>
      )}

      <motion.div
        initial={{ y: 60, opacity: 0, scale: 0.94 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 24 }}
        className="relative w-full bg-[#2A201B] border-t sm:border border-amber-300/35 rounded-t-3xl sm:rounded-3xl sm:mx-4 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-center shadow-2xl space-y-4"
      >
        <div className="w-10 h-1 rounded-full bg-amber-200/25 mx-auto sm:hidden" />

        <div className="space-y-1">
          <div className="text-xs text-amber-300/85">
            第 {level.id} 关 · {level.title}
          </div>
          <h2 className="font-display text-2xl font-bold text-[#FAF5EF]">
            {won ? (level.id === 20 ? '二十关大满贯！' : '精彩通关！') : '差一点就成功了'}
          </h2>
        </div>

        {/* Choreographed Star Ceremonial Reveal */}
        <div className="flex items-center justify-center gap-3.5 py-2">
          {[1, 2, 3].map((n) => {
            const lit = won && n <= revealedStars;
            return (
              <motion.div
                key={n}
                initial={{ scale: 0.7, opacity: 0.5 }}
                animate={
                  lit
                    ? { scale: [0.6, 1.32, 1], opacity: 1, rotate: [0, -10, 0] }
                    : { scale: 1, opacity: 0.45, rotate: 0 }
                }
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className={`relative w-14 h-14 rounded-2xl flex items-center justify-center border ${
                  lit
                    ? 'bg-amber-500/25 border-amber-300 shadow-[0_0_24px_rgba(251,191,36,0.45)]'
                    : 'bg-[#1D1512] border-amber-200/10'
                }`}
              >
                <Star
                  className={`w-8 h-8 ${
                    lit ? 'fill-amber-400 text-amber-300' : 'text-amber-200/20'
                  }`}
                />
              </motion.div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2.5 bg-[#1D1512] rounded-2xl p-3.5 border border-amber-200/15">
          <div>
            <div className="text-[11px] text-amber-100/65">最终得分</div>
            <div className="text-xl font-extrabold tabular-nums text-amber-200">
              {displayScore.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-amber-100/65">通关奖励</div>
            <div className="text-sm font-extrabold tabular-nums text-emerald-300 mt-1">
              {won ? `+${displayCoins}币 · +1装修星` : '未扣除体力'}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          {won && hasNextLevel && (
            <button
              onClick={onNextLevel}
              className="w-full h-12 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-extrabold text-sm flex items-center justify-center gap-1.5 shadow-lg transition-all cursor-pointer"
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
      </motion.div>
    </div>
  );
};
