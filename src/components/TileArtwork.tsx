import React from 'react';
import { GemColor, GoalType, PowerUpType } from '../types/game';

export const GEM_STYLES: Record<
  GemColor,
  {
    bg: string;
    border: string;
    shadow: string;
    accent: string;
    label: string;
  }
> = {
  red: {
    bg: 'from-rose-500 to-red-700',
    border: 'border-rose-300/60',
    shadow: 'shadow-[0_3px_0_#881337]',
    accent: '#FDA4AF',
    label: '红茶杯',
  },
  blue: {
    bg: 'from-sky-400 to-blue-700',
    border: 'border-sky-200/60',
    shadow: 'shadow-[0_3px_0_#1E3A8A]',
    accent: '#BAE6FD',
    label: '蓝宝石',
  },
  green: {
    bg: 'from-emerald-400 to-green-700',
    border: 'border-emerald-200/60',
    shadow: 'shadow-[0_3px_0_#14532D]',
    accent: '#A7F3D0',
    label: '翡翠叶',
  },
  yellow: {
    bg: 'from-amber-300 to-amber-600',
    border: 'border-amber-100/70',
    shadow: 'shadow-[0_3px_0_#92400E]',
    accent: '#FEF08A',
    label: '金铃铛',
  },
  purple: {
    bg: 'from-violet-400 to-purple-700',
    border: 'border-violet-200/60',
    shadow: 'shadow-[0_3px_0_#4C1D95]',
    accent: '#DDD6FE',
    label: '紫蝴蝶结',
  },
  orange: {
    bg: 'from-orange-400 to-orange-700',
    border: 'border-orange-200/60',
    shadow: 'shadow-[0_3px_0_#7C2D12]',
    accent: '#FED7AA',
    label: '琥珀提灯',
  },
};

export const GemGlyph: React.FC<{ color: GemColor; className?: string }> = ({
  color,
  className = 'w-7 h-7',
}) => {
  switch (color) {
    case 'red':
      // Red Teacup
      return (
        <svg viewBox="0 0 36 36" className={className} fill="none">
          <path
            d="M8 14h16v7a8 8 0 0 1-16 0v-7Z"
            fill="#FFF1F2"
            stroke="#9F1239"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M24 15.5h2.5a3 3 0 0 1 0 6H24"
            stroke="#FFF1F2"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path d="M6 29h20" stroke="#FFE4E6" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M13 8.5c0-1.5 1.5-2 1.5-3.5M18 8.5c0-1.5 1.5-2 1.5-3.5" stroke="#FECDD3" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'blue':
      // Sapphire Faceted Gem
      return (
        <svg viewBox="0 0 36 36" className={className} fill="none">
          <polygon
            points="11,7 25,7 31,15 18,30 5,15"
            fill="#E0F2FE"
            stroke="#1D4ED8"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <polygon points="11,7 25,7 22,15 14,15" fill="#93C5FD" />
          <polygon points="14,15 22,15 18,30" fill="#60A5FA" />
          <line x1="5" y1="15" x2="31" y2="15" stroke="#1E40AF" strokeWidth="1.4" />
        </svg>
      );
    case 'green':
      // Emerald Manor Leaf
      return (
        <svg viewBox="0 0 36 36" className={className} fill="none">
          <path
            d="M28 8C16 8 9 15 9 25c0 1.2.2 2.2.5 3 8.8 0 18.5-7 18.5-20Z"
            fill="#ECFDF5"
            stroke="#15803D"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M9 27c4-4 9-9 15-14" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" />
          <path d="M14 22l4.5-.5M18 18l4-.5" stroke="#16A34A" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'yellow':
      // Golden Butler Bell
      return (
        <svg viewBox="0 0 36 36" className={className} fill="none">
          <path
            d="M18 6a2.2 2.2 0 0 1 2.2 2.2V9c4.5.9 7.3 4.8 7.3 9.7v4.3l2.3 2.5H6.2l2.3-2.5v-4.3c0-4.9 2.8-8.8 7.3-9.7v-.8A2.2 2.2 0 0 1 18 6Z"
            fill="#FEF9C3"
            stroke="#92400E"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="18" cy="28" r="2.7" fill="#FDE047" stroke="#92400E" strokeWidth="1.8" />
        </svg>
      );
    case 'purple':
      // Amethyst Bowtie
      return (
        <svg viewBox="0 0 36 36" className={className} fill="none">
          <path
            d="M6 11l10 7-10 7V11ZM30 11l-10 7 10 7V11Z"
            fill="#F3E8FF"
            stroke="#5B21B6"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <rect x="14.5" y="14" width="7" height="8" rx="2.5" fill="#DDD6FE" stroke="#5B21B6" strokeWidth="2" />
        </svg>
      );
    case 'orange':
      // Warm Amber Lantern
      return (
        <svg viewBox="0 0 36 36" className={className} fill="none">
          <path d="M14 7h8M18 5v2" stroke="#FFF7ED" strokeWidth="2.2" strokeLinecap="round" />
          <rect
            x="10"
            y="10"
            width="16"
            height="17"
            rx="5"
            fill="#FFEDD5"
            stroke="#9A3412"
            strokeWidth="2"
          />
          <path d="M18 14c1.8 2 2.5 3.6 2.5 5a2.5 2.5 0 0 1-5 0c0-1.4.7-3 2.5-5Z" fill="#F97316" />
          <path d="M13 29h10" stroke="#FED7AA" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
  }
};

export const PowerUpArtwork: React.FC<{ powerUp: PowerUpType; color: GemColor | null }> = ({
  powerUp,
  color,
}) => {
  if (powerUp === 'rainbow') {
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <div className="w-[84%] h-[84%] rounded-full bg-[conic-gradient(from_0deg,#f43f5e,#f59e0b,#10b981,#3b82f6,#8b5cf6,#f43f5e)] p-[3px] shadow-[0_3px_0_#1e1b4b] animate-rainbow-spin">
          <div className="w-full h-full rounded-full bg-[#1F172A]/85 flex items-center justify-center">
            <div className="w-3.5 h-3.5 rounded-full bg-white shadow-[0_0_10px_#fff]" />
          </div>
        </div>
        <span className="absolute -bottom-0.5 px-1 rounded bg-black/75 text-[9px] font-bold text-amber-200 leading-tight">
          彩虹
        </span>
      </div>
    );
  }

  if (powerUp === 'bomb') {
    return (
      <div className="relative w-[86%] h-[86%] rounded-2xl bg-gradient-to-br from-slate-700 via-slate-800 to-slate-950 border border-amber-300/80 shadow-[0_3px_0_#020617] flex items-center justify-center">
        <svg viewBox="0 0 36 36" className="w-7 h-7" fill="none">
          <circle cx="17" cy="20" r="9.5" fill="#1E293B" stroke="#F59E0B" strokeWidth="2" />
          <path d="M23 13l4-4" stroke="#FBBF24" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="28" cy="8" r="2.6" fill="#EF4444" />
          <circle cx="14" cy="17" r="2" fill="#94A3B8" opacity="0.6" />
        </svg>
        <span className="absolute -bottom-1 px-1 rounded bg-amber-500 text-[9px] font-extrabold text-slate-950 leading-tight">
          炸弹
        </span>
      </div>
    );
  }

  if (powerUp === 'plane') {
    const palette = color ? GEM_STYLES[color] : GEM_STYLES.blue;
    return (
      <div
        className={`relative w-[86%] h-[86%] rounded-xl bg-gradient-to-br ${palette.bg} border-2 border-white/80 ${palette.shadow} flex items-center justify-center`}
      >
        <svg viewBox="0 0 36 36" className="w-7 h-7" fill="none">
          <path
            d="M30 7L6 17l9 3.5L26 11l-7.5 11.5L23 29l7-22Z"
            fill="#FFFFFF"
            stroke="#1E293B"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
        <span className="absolute -bottom-1 px-1 rounded bg-white text-[9px] font-extrabold text-slate-900 leading-tight shadow">
          纸飞机
        </span>
      </div>
    );
  }

  // Rocket H or V
  const isH = powerUp === 'rocket_h';
  const palette = color ? GEM_STYLES[color] : GEM_STYLES.red;
  return (
    <div
      className={`relative w-[86%] h-[86%] rounded-xl bg-gradient-to-br ${palette.bg} border-2 border-amber-200/90 ${palette.shadow} flex items-center justify-center`}
    >
      <svg
        viewBox="0 0 36 36"
        className={`w-7 h-7 ${isH ? '' : 'rotate-90'}`}
        fill="none"
      >
        <path
          d="M6 18h24M11 13l-5 5 5 5M25 13l5 5-5 5"
          stroke="#FFFFFF"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="13" y="14" width="10" height="8" rx="4" fill="#FDE047" stroke="#78350F" strokeWidth="1.6" />
      </svg>
    </div>
  );
};

export const GoalIcon: React.FC<{ type: GoalType; className?: string }> = ({
  type,
  className = 'w-6 h-6',
}) => {
  switch (type) {
    case 'collect_red':
      return (
        <div className={`${className} rounded-lg bg-gradient-to-br ${GEM_STYLES.red.bg} flex items-center justify-center p-0.5`}>
          <GemGlyph color="red" className="w-full h-full" />
        </div>
      );
    case 'collect_blue':
      return (
        <div className={`${className} rounded-lg bg-gradient-to-br ${GEM_STYLES.blue.bg} flex items-center justify-center p-0.5`}>
          <GemGlyph color="blue" className="w-full h-full" />
        </div>
      );
    case 'collect_green':
      return (
        <div className={`${className} rounded-lg bg-gradient-to-br ${GEM_STYLES.green.bg} flex items-center justify-center p-0.5`}>
          <GemGlyph color="green" className="w-full h-full" />
        </div>
      );
    case 'collect_yellow':
      return (
        <div className={`${className} rounded-lg bg-gradient-to-br ${GEM_STYLES.yellow.bg} flex items-center justify-center p-0.5`}>
          <GemGlyph color="yellow" className="w-full h-full" />
        </div>
      );
    case 'collect_purple':
      return (
        <div className={`${className} rounded-lg bg-gradient-to-br ${GEM_STYLES.purple.bg} flex items-center justify-center p-0.5`}>
          <GemGlyph color="purple" className="w-full h-full" />
        </div>
      );
    case 'collect_orange':
      return (
        <div className={`${className} rounded-lg bg-gradient-to-br ${GEM_STYLES.orange.bg} flex items-center justify-center p-0.5`}>
          <GemGlyph color="orange" className="w-full h-full" />
        </div>
      );
    case 'clear_crate':
      return (
        <div className={`${className} rounded-lg bg-amber-800 border border-amber-500/80 flex items-center justify-center`}>
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="#FDE68A" strokeWidth="2" />
            <path d="M3 3l18 18M21 3L3 21" stroke="#F59E0B" strokeWidth="1.8" />
          </svg>
        </div>
      );
    case 'clear_ice':
      return (
        <div className={`${className} rounded-lg bg-cyan-500/30 border border-cyan-300 flex items-center justify-center`}>
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
            <path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19" stroke="#BAE6FD" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      );
    case 'clear_chain':
      return (
        <div className={`${className} rounded-lg bg-slate-700 border border-slate-400 flex items-center justify-center`}>
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
            <path d="M9 15l6-6M7.5 11.5l-2 2a3.5 3.5 0 0 0 5 5l2-2M16.5 12.5l2-2a3.5 3.5 0 0 0-5-5l-2 2" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      );
    case 'clear_honey':
      return (
        <div className={`${className} rounded-lg bg-amber-500 border border-amber-200 flex items-center justify-center`}>
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
            <path d="M12 3l6 4v7l-6 4-6-4V7l6-4Z" fill="#FEF08A" stroke="#92400E" strokeWidth="1.8" />
          </svg>
        </div>
      );
    case 'spread_carpet':
      return (
        <div className={`${className} rounded-lg bg-emerald-600 border border-emerald-300 flex items-center justify-center`}>
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
            <rect x="4" y="5" width="16" height="14" rx="2" fill="#34D399" stroke="#ECFDF5" strokeWidth="1.8" />
            <path d="M8 9h8M8 15h8" stroke="#065F46" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </div>
      );
  }
};
