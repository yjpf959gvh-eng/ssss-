import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Hammer,
  Hand,
  Lightbulb,
  RotateCcw,
  Shuffle,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  applyGravityAndRefill,
  cellCanSwap,
  cloneBoard,
  computeInitialGoalProgress,
  findMatchClusters,
  findValidMove,
  getPalette,
  resolveMatchClustersStep,
  resolvePowerUpActivationOrCombo,
  shuffleBoard,
  spreadHoneyStep,
} from '../engine/matchEngine';
import {
  Board,
  BoostersInventory,
  ClearedTileBurst,
  FloatingPopup,
  GemColor,
  GoalType,
  LevelConfig,
  TileItem,
  VisualEffect,
} from '../types/game';
import { sound } from '../utils/sound';
import { GEM_STYLES, GemGlyph, GoalIcon, PowerUpArtwork } from './TileArtwork';

interface GameBoardProps {
  level: LevelConfig;
  boosters: BoostersInventory;
  muted: boolean;
  onToggleMute: () => void;
  onConsumeBooster: (type: keyof BoostersInventory) => void;
  onExitToMap: () => void;
  onLevelComplete: (result: {
    won: boolean;
    score: number;
    stars: number;
    remainingMoves: number;
    coinsEarned: number;
  }) => void;
  coins: number;
  onSpendCoinsForMoves: (cost: number) => boolean;
}

type ActiveBooster = 'hammer' | 'glove' | null;

const PRAISE_LABELS = ['漂亮!', '好球!', '连消佳作!', '梦幻爆破!', '大师手笔!', '不可思议!'];

const SHARD_HEX: Record<GemColor, string> = {
  red: '#FB7185',
  blue: '#60A5FA',
  green: '#34D399',
  yellow: '#FBBF24',
  purple: '#C084FC',
  orange: '#FB923C',
};

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

export const GameBoard: React.FC<GameBoardProps> = ({
  level,
  boosters,
  muted,
  onToggleMute,
  onConsumeBooster,
  onExitToMap,
  onLevelComplete,
  coins,
  onSpendCoinsForMoves,
}) => {
  const [board, setBoard] = useState<Board>(() => []);
  const [movesLeft, setMovesLeft] = useState(level.moves);
  const [score, setScore] = useState(0);
  const [goalProgress, setGoalProgress] = useState<Record<GoalType, number>>(() => ({
    collect_red: 0,
    collect_blue: 0,
    collect_green: 0,
    collect_yellow: 0,
    collect_purple: 0,
    collect_orange: 0,
    clear_crate: 0,
    clear_ice: 0,
    clear_chain: 0,
    clear_honey: 0,
    spread_carpet: 0,
  }));
  const [selected, setSelected] = useState<{ row: number; col: number } | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [activeBooster, setActiveBooster] = useState<ActiveBooster>(null);
  const [effects, setEffects] = useState<VisualEffect[]>([]);
  const [clearedBursts, setClearedBursts] = useState<ClearedTileBurst[]>([]);
  const [popups, setPopups] = useState<FloatingPopup[]>([]);
  const [shaking, setShaking] = useState(false);
  const [invalidPair, setInvalidPair] = useState<string | null>(null);
  const [hintPair, setHintPair] = useState<{ r1: number; c1: number; r2: number; c2: number } | null>(
    null
  );
  const [bannerMsg, setBannerMsg] = useState<string | null>(null);
  const [outOfMovesModal, setOutOfMovesModal] = useState(false);

  const dragStartRef = useRef<{ row: number; col: number; x: number; y: number } | null>(null);
  const idleTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const boardRef = useRef<Board>(board);
  const progressRef = useRef(goalProgress);
  const scoreRef = useRef(score);
  const movesRef = useRef(movesLeft);

  boardRef.current = board;
  progressRef.current = goalProgress;
  scoreRef.current = score;
  movesRef.current = movesLeft;

  const palette = useMemo(() => getPalette(level.colorCount), [level.colorCount]);

  // Flatten all active tiles with their current (row, col) so Motion animates them smoothly across drops & swaps!
  const activeSprites = useMemo(() => {
    const list: Array<{
      tile: TileItem;
      row: number;
      col: number;
      iceHp: number;
      chained: boolean;
    }> = [];
    for (let r = 0; r < board.length; r++) {
      for (let c = 0; c < (board[r]?.length || 0); c++) {
        const cell = board[r][c];
        if (cell.active && cell.tile && cell.crateHp === 0 && !cell.honey) {
          list.push({
            tile: cell.tile,
            row: r,
            col: c,
            iceHp: cell.iceHp,
            chained: cell.chained,
          });
        }
      }
    }
    return list;
  }, [board]);

  const initLevel = useCallback(async () => {
    const { createInitialBoard } = await import('../engine/matchEngine');
    const fresh = createInitialBoard(level);
    const initProgress = computeInitialGoalProgress(fresh);
    setBoard(fresh);
    setMovesLeft(level.moves);
    setScore(0);
    setGoalProgress(initProgress);
    setSelected(null);
    setIsBusy(false);
    setActiveBooster(null);
    setEffects([]);
    setClearedBursts([]);
    setPopups([]);
    setHintPair(null);
    setOutOfMovesModal(false);
    setBannerMsg(null);
  }, [level]);

  useEffect(() => {
    mountedRef.current = true;
    initLevel();
    return () => {
      mountedRef.current = false;
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    };
  }, [initLevel]);

  useEffect(() => {
    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    setHintPair(null);
    if (isBusy || outOfMovesModal || board.length === 0) return;

    idleTimerRef.current = window.setTimeout(() => {
      const move = findValidMove(boardRef.current);
      if (move && mountedRef.current) {
        setHintPair(move);
      }
    }, 4200);

    return () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    };
  }, [board, isBusy, selected, outOfMovesModal]);

  const showBanner = (text: string) => {
    setBannerMsg(text);
    window.setTimeout(() => {
      if (mountedRef.current) setBannerMsg((curr) => (curr === text ? null : curr));
    }, 1800);
  };

  const pushEffect = (newEffects: VisualEffect[]) => {
    if (newEffects.length === 0) return;
    setEffects((prev) => [...prev, ...newEffects]);
    const ids = new Set(newEffects.map((e) => e.id));
    window.setTimeout(() => {
      if (mountedRef.current) {
        setEffects((prev) => prev.filter((e) => !ids.has(e.id)));
      }
    }, 480);
  };

  const pushClearedBursts = (bursts: ClearedTileBurst[]) => {
    if (bursts.length === 0) return;
    const stamped = bursts.map((b) => ({
      ...b,
      id: `${b.id}_${Math.random().toString(36).slice(2, 6)}`,
    }));
    setClearedBursts((prev) => [...prev, ...stamped]);
    const ids = new Set(stamped.map((b) => b.id));
    window.setTimeout(() => {
      if (mountedRef.current) {
        setClearedBursts((prev) => prev.filter((b) => !ids.has(b.id)));
      }
    }, 340);
  };

  const pushPopup = (row: number, col: number, text: string, tone: FloatingPopup['tone']) => {
    const id = `pop_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setPopups((prev) => [...prev, { id, row, col, text, tone }]);
    window.setTimeout(() => {
      if (mountedRef.current) {
        setPopups((prev) => prev.filter((p) => p.id !== id));
      }
    }, 920);
  };

  const triggerShake = () => {
    setShaking(true);
    window.setTimeout(() => {
      if (mountedRef.current) setShaking(false);
    }, 260);
  };

  const checkAllGoalsComplete = (prog: Record<GoalType, number>) => {
    return level.goals.every((g) => (prog[g.type] || 0) >= g.target);
  };

  const computeStars = (finalScore: number) => {
    const [s1, s2, s3] = level.starThresholds;
    if (finalScore >= s3) return 3;
    if (finalScore >= s2) return 2;
    if (finalScore >= s1) return 1;
    return 1;
  };

  const applyDeltaToProgress = (
    prev: Record<GoalType, number>,
    inc: Partial<Record<GoalType, number>>
  ) => {
    const updated = { ...prev };
    (Object.keys(inc) as GoalType[]).forEach((k) => {
      updated[k] = (updated[k] || 0) + (inc[k] || 0);
    });
    return updated;
  };

  const playSoundsForStep = (
    triggered: string[],
    hitObstacle: boolean,
    spawnedPower: number,
    comboStep: number
  ) => {
    if (triggered.includes('rainbow')) {
      sound.playRainbow();
      triggerShake();
    } else if (triggered.includes('bomb')) {
      sound.playBomb();
      triggerShake();
    } else if (triggered.includes('rocket_h') || triggered.includes('rocket_v')) {
      sound.playRocket();
    } else if (triggered.includes('plane')) {
      sound.playPlane();
    } else {
      sound.playMatch(comboStep);
    }
    if (spawnedPower > 0) sound.playPowerCreate();
    if (hitObstacle) sound.playObstacleHit();
  };

  const runCascadeAndFinalize = async (
    initialBoard: Board,
    initialProgress: Record<GoalType, number>,
    initialScore: number,
    initialClearedHoney: number,
    newMovesLeft: number
  ) => {
    let currBoard = initialBoard;
    let currProg = initialProgress;
    let currScore = initialScore;
    let totalClearedHoney = initialClearedHoney;
    let combo = 1;

    // Wait for shatter burst before dropping tiles down
    await sleep(170);
    if (!mountedRef.current) return;

    // Drop existing tiles & drop new tiles from above top edge
    currBoard = applyGravityAndRefill(currBoard, palette);
    setBoard(currBoard);
    await sleep(270);
    if (!mountedRef.current) return;

    while (true) {
      const clusters = findMatchClusters(currBoard);
      if (clusters.length === 0) break;

      combo += 1;
      const step = resolveMatchClustersStep(currBoard, clusters, level.goals, currProg);
      const comboMult = 1 + (combo - 1) * 0.25;
      const gained = Math.round(step.scoreDelta * comboMult);
      currScore += gained;
      currBoard = step.board;
      currProg = applyDeltaToProgress(currProg, step.goalIncrements);
      totalClearedHoney += step.clearedHoneyCount;

      setBoard(currBoard);
      setScore(currScore);
      setGoalProgress(currProg);
      pushEffect(step.effects);
      pushClearedBursts(step.clearedBursts);
      playSoundsForStep(step.triggeredPowerUps, step.hitObstacle, step.spawnedPowerUps, combo);

      const anchor = clusters[0].cells[0];
      if (combo >= 2) {
        const praise = PRAISE_LABELS[Math.min(combo - 2, PRAISE_LABELS.length - 1)];
        pushPopup(anchor.row, anchor.col, `${praise} ×${combo}`, 'combo');
      } else {
        pushPopup(anchor.row, anchor.col, `+${gained}`, 'score');
      }

      await sleep(175);
      if (!mountedRef.current) return;

      currBoard = applyGravityAndRefill(currBoard, palette);
      setBoard(currBoard);
      await sleep(265);
      if (!mountedRef.current) return;
    }

    if (totalClearedHoney === 0) {
      const hasHoney = currBoard.some((row) => row.some((cell) => cell.honey));
      if (hasHoney && !checkAllGoalsComplete(currProg)) {
        const spreadRes = spreadHoneyStep(currBoard);
        if (spreadRes.spreadAt) {
          currBoard = spreadRes.board;
          setBoard(currBoard);
          sound.playObstacleHit();
          pushPopup(spreadRes.spreadAt.row, spreadRes.spreadAt.col, '蜂蜜蔓延!', 'praise');
          await sleep(160);
          if (!mountedRef.current) return;
        }
      }
    }

    if (checkAllGoalsComplete(currProg)) {
      const moveBonus = newMovesLeft * 250;
      const finalScore = currScore + moveBonus;
      if (moveBonus > 0) {
        setScore(finalScore);
        showBanner(`通关成功！剩余 ${newMovesLeft} 步转化 +${moveBonus} 分`);
      }
      sound.playWin();
      await sleep(550);
      if (!mountedRef.current) return;

      const stars = computeStars(finalScore);
      const coinsEarned = 60 + stars * 30 + newMovesLeft * 10;
      onLevelComplete({
        won: true,
        score: finalScore,
        stars,
        remainingMoves: newMovesLeft,
        coinsEarned,
      });
      return;
    }

    if (newMovesLeft <= 0) {
      sound.playLose();
      setIsBusy(false);
      setOutOfMovesModal(true);
      return;
    }

    if (!findValidMove(currBoard)) {
      showBanner('无可消除组合，正在重新洗牌');
      await sleep(320);
      if (!mountedRef.current) return;
      currBoard = shuffleBoard(currBoard, palette);
      setBoard(currBoard);
    }

    setIsBusy(false);
  };

  const executeSwap = async (r1: number, c1: number, r2: number, c2: number, freeMove = false) => {
    if (isBusy || outOfMovesModal) return;
    const curr = boardRef.current;
    const cellA = curr[r1]?.[c1];
    const cellB = curr[r2]?.[c2];
    if (!cellA || !cellB) return;

    const isAdjacent = Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
    if (!isAdjacent) return;

    if (!cellCanSwap(cellA) || !cellCanSwap(cellB)) {
      sound.playInvalid();
      setInvalidPair(`${r1},${c1}|${r2},${c2}`);
      window.setTimeout(() => setInvalidPair(null), 260);
      return;
    }

    setSelected(null);
    setHintPair(null);
    setIsBusy(true);
    sound.playSwap();

    const swapped = cloneBoard(curr);
    const tmp = swapped[r1][c1].tile;
    swapped[r1][c1].tile = swapped[r2][c2].tile;
    swapped[r2][c2].tile = tmp;

    const p1 = swapped[r1][c1].tile?.powerUp;
    const p2 = swapped[r2][c2].tile?.powerUp;

    if (p1 || p2) {
      setBoard(swapped);
      const nextMoves = freeMove ? movesRef.current : movesRef.current - 1;
      if (!freeMove) setMovesLeft(nextMoves);

      await sleep(165);
      if (!mountedRef.current) return;

      const step = resolvePowerUpActivationOrCombo(
        swapped,
        r1,
        c1,
        r2,
        c2,
        level.goals,
        progressRef.current
      );
      const newScore = scoreRef.current + step.scoreDelta;
      const newProg = applyDeltaToProgress(progressRef.current, step.goalIncrements);
      setBoard(step.board);
      setScore(newScore);
      setGoalProgress(newProg);
      pushEffect(step.effects);
      pushClearedBursts(step.clearedBursts);
      playSoundsForStep(step.triggeredPowerUps, step.hitObstacle, 0, 1);

      if (p1 && p2) {
        pushPopup(r2, c2, '超级组合!', 'praise');
      } else {
        pushPopup(r2, c2, `+${step.scoreDelta}`, 'score');
      }

      await runCascadeAndFinalize(step.board, newProg, newScore, step.clearedHoneyCount, nextMoves);
      return;
    }

    const clusters = findMatchClusters(swapped, [
      { row: r2, col: c2 },
      { row: r1, col: c1 },
    ]);

    if (clusters.length === 0 && !freeMove) {
      // Visually glide toward each other, then bounce back!
      setBoard(swapped);
      sound.playInvalid();
      setInvalidPair(`${r1},${c1}|${r2},${c2}`);
      await sleep(200);
      if (!mountedRef.current) return;
      setBoard(curr);
      await sleep(160);
      if (!mountedRef.current) return;
      setInvalidPair(null);
      setIsBusy(false);
      return;
    }

    setBoard(swapped);
    const nextMoves = freeMove ? movesRef.current : movesRef.current - 1;
    if (!freeMove) setMovesLeft(nextMoves);

    if (clusters.length === 0 && freeMove) {
      await sleep(170);
      setIsBusy(false);
      return;
    }

    await sleep(165);
    if (!mountedRef.current) return;

    const step = resolveMatchClustersStep(swapped, clusters, level.goals, progressRef.current);
    const newScore = scoreRef.current + step.scoreDelta;
    const newProg = applyDeltaToProgress(progressRef.current, step.goalIncrements);

    setBoard(step.board);
    setScore(newScore);
    setGoalProgress(newProg);
    pushEffect(step.effects);
    pushClearedBursts(step.clearedBursts);
    playSoundsForStep(step.triggeredPowerUps, step.hitObstacle, step.spawnedPowerUps, 1);

    const anchor = clusters[0].cells[0];
    pushPopup(anchor.row, anchor.col, `+${step.scoreDelta}`, 'score');

    await runCascadeAndFinalize(step.board, newProg, newScore, step.clearedHoneyCount, nextMoves);
  };

  const triggerSinglePowerUp = async (row: number, col: number) => {
    if (isBusy || outOfMovesModal) return;
    const cell = boardRef.current[row]?.[col];
    if (!cell || !cell.tile?.powerUp || cell.chained || cell.honey) return;

    setSelected(null);
    setHintPair(null);
    setIsBusy(true);

    const nextMoves = movesRef.current - 1;
    setMovesLeft(nextMoves);

    const step = resolvePowerUpActivationOrCombo(
      boardRef.current,
      row,
      col,
      null,
      null,
      level.goals,
      progressRef.current
    );
    const newScore = scoreRef.current + step.scoreDelta;
    const newProg = applyDeltaToProgress(progressRef.current, step.goalIncrements);

    setBoard(step.board);
    setScore(newScore);
    setGoalProgress(newProg);
    pushEffect(step.effects);
    pushClearedBursts(step.clearedBursts);
    playSoundsForStep(step.triggeredPowerUps, step.hitObstacle, 0, 1);
    pushPopup(row, col, `+${step.scoreDelta}`, 'score');

    await runCascadeAndFinalize(step.board, newProg, newScore, step.clearedHoneyCount, nextMoves);
  };

  const handleHammerClick = async (row: number, col: number) => {
    if (isBusy || boosters.hammer <= 0) return;
    const curr = cloneBoard(boardRef.current);
    const cell = curr[row]?.[col];
    if (!cell || !cell.active) return;

    const hasAnything =
      cell.tile !== null || cell.crateHp > 0 || cell.iceHp > 0 || cell.chained || cell.honey;
    if (!hasAnything) return;

    setActiveBooster(null);
    onConsumeBooster('hammer');
    setIsBusy(true);

    const gained = 80;
    const inc: Partial<Record<GoalType, number>> = {};
    let clearedHoney = 0;

    if (cell.crateHp > 0) {
      cell.crateHp -= 1;
      if (cell.crateHp === 0) inc.clear_crate = 1;
      pushClearedBursts([{ id: `hammer_c_${Date.now()}`, row, col, color: 'orange' }]);
      sound.playObstacleHit();
    } else if (cell.honey) {
      cell.honey = false;
      clearedHoney = 1;
      inc.clear_honey = 1;
      pushClearedBursts([{ id: `hammer_h_${Date.now()}`, row, col, color: 'yellow' }]);
      sound.playObstacleHit();
    } else if (cell.chained) {
      cell.chained = false;
      inc.clear_chain = 1;
      sound.playObstacleHit();
    } else if (cell.iceHp > 0) {
      cell.iceHp -= 1;
      if (cell.iceHp === 0) inc.clear_ice = 1;
      sound.playObstacleHit();
    } else if (cell.tile?.powerUp) {
      const step = resolvePowerUpActivationOrCombo(
        curr,
        row,
        col,
        null,
        null,
        level.goals,
        progressRef.current
      );
      const newScore = scoreRef.current + step.scoreDelta;
      const newProg = applyDeltaToProgress(progressRef.current, step.goalIncrements);
      setBoard(step.board);
      setScore(newScore);
      setGoalProgress(newProg);
      pushEffect(step.effects);
      pushClearedBursts(step.clearedBursts);
      playSoundsForStep(step.triggeredPowerUps, step.hitObstacle, 0, 1);
      await runCascadeAndFinalize(step.board, newProg, newScore, step.clearedHoneyCount, movesRef.current);
      return;
    } else if (cell.tile) {
      if (cell.tile.color) {
        inc[`collect_${cell.tile.color}` as GoalType] = 1;
      }
      pushClearedBursts([{ id: cell.tile.id, row, col, color: cell.tile.color }]);
      cell.tile = null;
      sound.playMatch(2);
    }

    const newScore = scoreRef.current + gained;
    const newProg = applyDeltaToProgress(progressRef.current, inc);
    setBoard(curr);
    setScore(newScore);
    setGoalProgress(newProg);
    pushEffect([{ id: `fx_${Math.random()}`, kind: 'shockwave', row, col }]);
    pushPopup(row, col, '强力锤击!', 'praise');

    await runCascadeAndFinalize(curr, newProg, newScore, clearedHoney, movesRef.current);
  };

  const handleShuffleBooster = () => {
    if (isBusy || boosters.shuffle <= 0) return;
    onConsumeBooster('shuffle');
    sound.playPowerCreate();
    const reshuffled = shuffleBoard(boardRef.current, palette);
    setBoard(reshuffled);
    showBanner('棋盘已重新洗牌！');
  };

  const handleCellClick = (row: number, col: number) => {
    if (isBusy || outOfMovesModal) return;

    if (activeBooster === 'hammer') {
      handleHammerClick(row, col);
      return;
    }

    const cell = board[row]?.[col];
    if (!cell || !cell.active || !cellCanSwap(cell)) {
      setSelected(null);
      return;
    }

    if (!selected) {
      sound.playSelect();
      setSelected({ row, col });
      return;
    }

    if (selected.row === row && selected.col === col) {
      if (cell.tile?.powerUp) {
        triggerSinglePowerUp(row, col);
      } else {
        setSelected(null);
      }
      return;
    }

    const isAdjacent = Math.abs(selected.row - row) + Math.abs(selected.col - col) === 1;
    if (isAdjacent) {
      const useGlove = activeBooster === 'glove';
      if (useGlove) {
        setActiveBooster(null);
        onConsumeBooster('glove');
      }
      executeSwap(selected.row, selected.col, row, col, useGlove);
    } else {
      sound.playSelect();
      setSelected({ row, col });
    }
  };

  const handlePointerDown = (e: React.PointerEvent, row: number, col: number) => {
    if (isBusy || outOfMovesModal || activeBooster === 'hammer') return;
    dragStartRef.current = { row, col, x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartRef.current || isBusy || outOfMovesModal) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const threshold = 18;

    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

    const { row, col } = dragStartRef.current;
    dragStartRef.current = null;

    let tr = row;
    let tc = col;
    if (Math.abs(dx) > Math.abs(dy)) {
      tc += dx > 0 ? 1 : -1;
    } else {
      tr += dy > 0 ? 1 : -1;
    }

    const useGlove = activeBooster === 'glove';
    if (useGlove) {
      setActiveBooster(null);
      onConsumeBooster('glove');
    }
    executeSwap(row, col, tr, tc, useGlove);
  };

  const handlePointerUp = () => {
    dragStartRef.current = null;
  };

  const handleBuyExtraMoves = () => {
    if (onSpendCoinsForMoves(150)) {
      setOutOfMovesModal(false);
      setMovesLeft(5);
      sound.playPowerCreate();
      showBanner('+5 步已补充，继续加油！');
    }
  };

  const rows = level.rows;
  const cols = level.cols;

  return (
    <div className="h-full w-full bg-[#1C1613] text-[#FAF5EF] flex flex-col justify-between overflow-hidden relative">
      {/* Subtle atmospheric manor backdrop */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20 bg-cover bg-center"
        style={{
          backgroundImage: 'url("/src/assets/images/manor_foyer_backdrop_1795008110014.jpg")',
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#1C1613]/90 via-[#1C1613]/75 to-[#140F0D]" />

      {/* Mobile-First Compact Top HUD */}
      <header className="relative z-20 shrink-0 w-full px-3 pt-2.5">
        <div className="bg-[#2A201B]/95 border border-amber-200/15 rounded-2xl px-3 py-2 shadow-lg space-y-2">
          {/* Row 1: Nav, Level Title, Moves, Controls */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={onExitToMap}
              aria-label="返回庄园"
              className="w-10 h-10 rounded-xl bg-[#3A2C25] active:scale-95 text-amber-100 flex items-center justify-center shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="min-w-0 text-center flex-1">
              <div className="text-[11px] text-amber-200/75 truncate">
                第 {level.id} 关 · {level.chapterName}
              </div>
              <div className="font-display font-bold text-sm text-[#FAF5EF] truncate">
                {level.title}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <div
                className={`px-2.5 py-1 rounded-xl border text-center min-w-[50px] ${
                  movesLeft <= 5
                    ? 'bg-rose-950/90 border-rose-400/60 text-rose-100'
                    : 'bg-[#1D1512] border-amber-200/20 text-amber-50'
                }`}
              >
                <div className="text-[9px] text-amber-200/70 leading-none">步数</div>
                <div className="text-base font-extrabold tabular-nums leading-tight">{movesLeft}</div>
              </div>

              <button
                onClick={onToggleMute}
                aria-label={muted ? '开启音效' : '关闭音效'}
                className="w-10 h-10 rounded-xl bg-[#3A2C25] active:scale-95 text-amber-100 flex items-center justify-center cursor-pointer"
              >
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <button
                onClick={initLevel}
                aria-label="重新开始"
                className="w-10 h-10 rounded-xl bg-[#3A2C25] active:scale-95 text-amber-100 flex items-center justify-center cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Row 2: Compact Goals + Score */}
          <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-amber-200/10">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {level.goals.map((g) => {
                const current = Math.min(g.target, goalProgress[g.type] || 0);
                const done = current >= g.target;
                return (
                  <div
                    key={g.type}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-xl border shrink-0 transition-colors ${
                      done
                        ? 'bg-emerald-950/80 border-emerald-400/50 text-emerald-200'
                        : 'bg-[#1D1512] border-amber-200/15 text-amber-50'
                    }`}
                  >
                    <GoalIcon type={g.type} className="w-5 h-5 shrink-0" />
                    <span className="text-xs font-bold tabular-nums whitespace-nowrap">
                      {done ? '完成' : `${current}/${g.target}`}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="text-right shrink-0 pl-1">
              <span className="text-[10px] text-amber-200/60 mr-1">得分</span>
              <span className="text-xs font-bold tabular-nums text-amber-300">
                {score.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Center Play Workspace */}
      <main className="relative z-10 flex-1 min-h-0 w-full flex flex-col items-center justify-center px-2.5 py-2">
        {/* Responsive Square-Cell Match-3 Board */}
        <div className="relative flex flex-col items-center justify-center w-full">
          {bannerMsg && (
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-40 px-3 py-1 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-lg whitespace-nowrap">
              {bannerMsg}
            </div>
          )}

          {activeBooster && (
            <div className="mb-1.5 px-3 py-1 rounded-xl bg-amber-400/20 border border-amber-300/50 text-amber-200 text-xs font-medium flex items-center gap-2">
              <span>
                {activeBooster === 'hammer'
                  ? '小锤模式：点击任意棋子或障碍直接敲击'
                  : '手套模式：任意交换两枚相邻棋子'}
              </span>
              <button
                onClick={() => setActiveBooster(null)}
                className="underline text-amber-100 cursor-pointer"
              >
                取消
              </button>
            </div>
          )}

          <div
            className={`relative p-2 rounded-3xl bg-[#34261F] border-2 border-[#5C4438] shadow-[0_18px_40px_rgba(0,0,0,0.65)] ${
              shaking ? 'animate-board-shake' : ''
            }`}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            {/* Inner board container with exact aspect ratio and overflow-hidden for waterfall drops */}
            <div
              className="relative overflow-hidden rounded-2xl touch-none"
              style={{
                width: `min(calc(100vw - 36px), 384px, calc(52dvh * ${cols / rows}))`,
                aspectRatio: `${cols} / ${rows}`,
              }}
            >
              {/* Layer 1: Static Board Grid (cells, holes, carpet, crates, honey, tap targets) */}
              <div
                className="absolute inset-0 grid"
                style={{
                  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
                }}
              >
                {board.map((rowArr) =>
                  rowArr.map((cell) => {
                    if (!cell.active) {
                      return <div key={`${cell.row}-${cell.col}`} className="w-full h-full" />;
                    }

                    const isSelected =
                      selected?.row === cell.row && selected?.col === cell.col;
                    const isInvalid =
                      invalidPair && invalidPair.includes(`${cell.row},${cell.col}`);

                    return (
                      <button
                        key={`${cell.row}-${cell.col}`}
                        type="button"
                        onClick={() => handleCellClick(cell.row, cell.col)}
                        onPointerDown={(e) => handlePointerDown(e, cell.row, cell.col)}
                        className="relative w-full h-full p-[2.5px] focus-visible:outline-2 focus-visible:outline-amber-400 cursor-pointer"
                      >
                        <div
                          className={`w-full h-full rounded-xl flex items-center justify-center transition-colors ${
                            cell.carpet
                              ? 'bg-emerald-700/85 ring-2 ring-inset ring-emerald-300/75'
                              : 'bg-[#231915]/92 ring-1 ring-inset ring-amber-100/10'
                          } ${isSelected ? 'ring-2 ring-amber-300 bg-amber-500/20' : ''} ${
                            isInvalid ? 'ring-2 ring-rose-500 bg-rose-500/20' : ''
                          }`}
                        >
                          {cell.carpet && (
                            <div className="pointer-events-none absolute inset-1.5 rounded-lg border border-dashed border-emerald-200/40" />
                          )}

                          {/* Wooden Crate */}
                          {cell.crateHp > 0 && (
                            <div
                              className={`relative w-[90%] h-[90%] rounded-xl flex items-center justify-center border-2 ${
                                cell.crateHp === 2
                                  ? 'bg-gradient-to-br from-amber-700 to-amber-950 border-slate-300/80 shadow-[0_3px_0_#451a03]'
                                  : 'bg-gradient-to-br from-amber-600 to-amber-800 border-amber-300/70 shadow-[0_3px_0_#451a03]'
                              }`}
                            >
                              <svg viewBox="0 0 32 32" className="w-[70%] h-[70%]" fill="none">
                                <rect
                                  x="4"
                                  y="4"
                                  width="24"
                                  height="24"
                                  rx="3"
                                  stroke={cell.crateHp === 2 ? '#E2E8F0' : '#FDE68A'}
                                  strokeWidth="2.2"
                                />
                                <path
                                  d="M5 5l22 22M27 5L5 27"
                                  stroke={cell.crateHp === 2 ? '#94A3B8' : '#F59E0B'}
                                  strokeWidth="2"
                                />
                              </svg>
                              {cell.crateHp === 2 && (
                                <span className="absolute bottom-0.5 right-1 text-[10px] font-extrabold text-white bg-black/65 px-1 rounded">
                                  2
                                </span>
                              )}
                            </div>
                          )}

                          {/* Sticky Honey */}
                          {cell.honey && (
                            <div className="w-[90%] h-[90%] rounded-xl bg-gradient-to-br from-amber-300 via-amber-500 to-amber-600 border-2 border-yellow-100/80 shadow-[0_3px_0_#78350F] flex items-center justify-center">
                              <svg viewBox="0 0 32 32" className="w-[65%] h-[65%]" fill="none">
                                <path
                                  d="M16 4l8 5v10l-8 5-8-5V9l8-5Z"
                                  fill="#FEF08A"
                                  stroke="#92400E"
                                  strokeWidth="2"
                                />
                                <circle cx="13" cy="14" r="1.8" fill="#B45309" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Layer 2: Physics-Animated Tile Sprite Layer (glides on swap & falls with spring gravity!) */}
              <div className="pointer-events-none absolute inset-0 z-10">
                {activeSprites.map(({ tile, row, col, iceHp, chained }) => {
                  const isSelected = selected?.row === row && selected?.col === col;
                  const isHint =
                    hintPair &&
                    ((hintPair.r1 === row && hintPair.c1 === col) ||
                      (hintPair.r2 === row && hintPair.c2 === col));
                  const colorStyle = tile.color ? GEM_STYLES[tile.color] : null;
                  const startY =
                    tile.spawnOffsetRows !== undefined
                      ? `${(row - tile.spawnOffsetRows) * 100}%`
                      : `${row * 100}%`;

                  return (
                    <motion.div
                      key={tile.id}
                      initial={
                        tile.spawnOffsetRows !== undefined
                          ? {
                              x: `${col * 100}%`,
                              y: startY,
                              scale: 0.92,
                              opacity: 0.8,
                            }
                          : {
                              x: `${col * 100}%`,
                              y: `${row * 100}%`,
                              scale: 0.5,
                              opacity: 0,
                            }
                      }
                      animate={{
                        x: `${col * 100}%`,
                        y: `${row * 100}%`,
                        scale: isSelected ? 1.09 : 1,
                        opacity: 1,
                      }}
                      transition={{
                        type: 'spring',
                        stiffness: 430,
                        damping: 26,
                        mass: 0.85,
                      }}
                      style={{
                        width: `${100 / cols}%`,
                        height: `${100 / rows}%`,
                      }}
                      className="absolute top-0 left-0 p-[4.5px] sm:p-[5px] flex items-center justify-center"
                    >
                      <div
                        className={`relative w-full h-full flex items-center justify-center ${
                          isHint ? 'animate-hint-pulse' : ''
                        }`}
                      >
                        {tile.powerUp ? (
                          <PowerUpArtwork powerUp={tile.powerUp} color={tile.color} />
                        ) : (
                          colorStyle && (
                            <div
                              className={`w-full h-full rounded-xl bg-gradient-to-br ${colorStyle.bg} border ${colorStyle.border} ${colorStyle.shadow} flex items-center justify-center p-1`}
                            >
                              <GemGlyph color={tile.color!} className="w-[82%] h-[82%]" />
                            </div>
                          )
                        )}

                        {/* Frost Ice Overlay */}
                        {iceHp > 0 && (
                          <div
                            className={`absolute inset-0 rounded-xl border-2 flex items-end justify-end p-0.5 ${
                              iceHp === 2
                                ? 'bg-sky-300/45 border-sky-100/90'
                                : 'bg-cyan-200/25 border-cyan-100/75'
                            }`}
                          >
                            <span className="text-[8px] font-bold px-1 rounded bg-sky-950/80 text-sky-100 leading-tight">
                              {iceHp === 2 ? '厚冰' : '冰'}
                            </span>
                          </div>
                        )}

                        {/* Iron Chain Overlay */}
                        {chained && (
                          <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-slate-900/25">
                            <svg viewBox="0 0 36 36" className="w-full h-full" fill="none">
                              <path
                                d="M5 5l26 26M31 5L5 31"
                                stroke="#CBD5E1"
                                strokeWidth="3.2"
                                strokeDasharray="4 3"
                                strokeLinecap="round"
                              />
                              <circle
                                cx="18"
                                cy="18"
                                r="5"
                                fill="#334155"
                                stroke="#E2E8F0"
                                strokeWidth="2"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Layer 3: Match-Clear Shatter Bursts & Particle Confetti */}
              <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
                {clearedBursts.map((b) => {
                  const shardColor = b.color ? SHARD_HEX[b.color] : '#FDE047';
                  const angles = [0, 60, 120, 180, 240, 300];
                  return (
                    <div
                      key={b.id}
                      style={{
                        width: `${100 / cols}%`,
                        height: `${100 / rows}%`,
                        left: `${(b.col / cols) * 100}%`,
                        top: `${(b.row / rows) * 100}%`,
                      }}
                      className="absolute flex items-center justify-center"
                    >
                      {/* Expanding bright flash ring */}
                      <motion.div
                        initial={{ scale: 0.5, opacity: 0.95 }}
                        animate={{ scale: 1.55, opacity: 0 }}
                        transition={{ duration: 0.28, ease: 'easeOut' }}
                        style={{ borderColor: shardColor }}
                        className="absolute w-[82%] h-[82%] rounded-2xl border-4 bg-white/35"
                      />
                      {/* Popping core */}
                      <motion.div
                        initial={{ scale: 1, opacity: 1 }}
                        animate={{ scale: 1.35, opacity: 0 }}
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                        style={{ backgroundColor: shardColor }}
                        className="w-[65%] h-[65%] rounded-xl opacity-80"
                      />
                      {/* 6 Radial burst shards */}
                      {angles.map((deg) => {
                        const rad = (deg * Math.PI) / 180;
                        const tx = Math.cos(rad) * 28;
                        const ty = Math.sin(rad) * 28;
                        return (
                          <motion.span
                            key={deg}
                            initial={{ x: 0, y: 0, scale: 1, opacity: 1, rotate: 0 }}
                            animate={{ x: tx, y: ty, scale: 0.2, opacity: 0, rotate: 140 }}
                            transition={{ duration: 0.32, ease: 'easeOut' }}
                            style={{ backgroundColor: shardColor }}
                            className="absolute w-2.5 h-2.5 rounded-sm shadow-sm"
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {/* Layer 4: Rocket Beams, Bomb Shockwaves, Flying Paper Planes & Rainbow Zaps */}
              <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
                {effects.map((fx) => {
                  const topPct = ((fx.row + 0.5) / rows) * 100;
                  const leftPct = ((fx.col + 0.5) / cols) * 100;
                  if (fx.kind === 'beam_h') {
                    return (
                      <div
                        key={fx.id}
                        style={{ top: `${topPct}%` }}
                        className="absolute left-0 right-0 h-5 -translate-y-1/2 bg-gradient-to-r from-amber-100/20 via-amber-300 to-amber-100/20 animate-beam-h"
                      />
                    );
                  }
                  if (fx.kind === 'beam_v') {
                    return (
                      <div
                        key={fx.id}
                        style={{ left: `${leftPct}%` }}
                        className="absolute top-0 bottom-0 w-5 -translate-x-1/2 bg-gradient-to-b from-amber-100/20 via-amber-300 to-amber-100/20 animate-beam-v"
                      />
                    );
                  }
                  if (fx.kind === 'shockwave') {
                    return (
                      <div
                        key={fx.id}
                        style={{ top: `${topPct}%`, left: `${leftPct}%` }}
                        className="absolute w-24 h-24 rounded-full border-4 border-amber-300 bg-amber-400/35 animate-shockwave"
                      />
                    );
                  }
                  if (
                    fx.kind === 'plane_fly' &&
                    fx.targetRow !== undefined &&
                    fx.targetCol !== undefined
                  ) {
                    const tTop = ((fx.targetRow + 0.5) / rows) * 100;
                    const tLeft = ((fx.targetCol + 0.5) / cols) * 100;
                    return (
                      <React.Fragment key={fx.id}>
                        <motion.div
                          initial={{ left: `${leftPct}%`, top: `${topPct}%`, scale: 0.9, opacity: 1 }}
                          animate={{ left: `${tLeft}%`, top: `${tTop}%`, scale: 1.25, opacity: 0.2 }}
                          transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
                          className="absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8"
                        >
                          <svg viewBox="0 0 36 36" className="w-full h-full drop-shadow-lg" fill="none">
                            <path
                              d="M30 7L6 17l9 3.5L26 11l-7.5 11.5L23 29l7-22Z"
                              fill="#FFFFFF"
                              stroke="#0284C7"
                              strokeWidth="2"
                            />
                          </svg>
                        </motion.div>
                        <div
                          style={{ top: `${tTop}%`, left: `${tLeft}%` }}
                          className="absolute w-14 h-14 rounded-full border-2 border-sky-200 bg-sky-300/40 animate-shockwave"
                        />
                      </React.Fragment>
                    );
                  }
                  if (
                    fx.kind === 'rainbow_zap' &&
                    fx.targetRow !== undefined &&
                    fx.targetCol !== undefined
                  ) {
                    const tTop = ((fx.targetRow + 0.5) / rows) * 100;
                    const tLeft = ((fx.targetCol + 0.5) / cols) * 100;
                    return (
                      <React.Fragment key={fx.id}>
                        <svg className="absolute inset-0 w-full h-full">
                          <motion.line
                            x1={`${leftPct}%`}
                            y1={`${topPct}%`}
                            x2={`${tLeft}%`}
                            y2={`${tTop}%`}
                            stroke="#FDE047"
                            strokeWidth="3"
                            strokeLinecap="round"
                            initial={{ opacity: 1 }}
                            animate={{ opacity: 0 }}
                            transition={{ duration: 0.32 }}
                          />
                        </svg>
                        <div
                          style={{ top: `${tTop}%`, left: `${tLeft}%` }}
                          className="absolute w-11 h-11 rounded-full bg-fuchsia-300/60 border-2 border-white animate-shockwave"
                        />
                      </React.Fragment>
                    );
                  }
                  return null;
                })}

                {/* Floating Score & Praise Popups */}
                {popups.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      top: `${((p.row + 0.3) / rows) * 100}%`,
                      left: `${((p.col + 0.5) / cols) * 100}%`,
                    }}
                    className={`absolute font-display font-extrabold whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] animate-float-up ${
                      p.tone === 'combo'
                        ? 'text-lg sm:text-xl text-amber-300'
                        : p.tone === 'praise'
                        ? 'text-base sm:text-lg text-emerald-300'
                        : 'text-sm text-white'
                    }`}
                  >
                    {p.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Mobile Thumb-Zone Booster Bar */}
      <footer className="relative z-20 shrink-0 w-full px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-1.5">
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-amber-100/70 px-2 truncate">
          <Lightbulb className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span className="truncate">{level.tip}</span>
        </div>

        <div className="bg-[#2A201B]/95 border border-amber-200/15 rounded-2xl p-2 shadow-lg grid grid-cols-3 gap-2">
          <button
            onClick={() =>
              setActiveBooster((curr) =>
                curr === 'hammer' ? null : boosters.hammer > 0 ? 'hammer' : null
              )
            }
            disabled={boosters.hammer <= 0 || isBusy}
            className={`min-h-[44px] flex items-center justify-center gap-1.5 px-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              activeBooster === 'hammer'
                ? 'bg-amber-400 text-slate-950 border-amber-200'
                : 'bg-[#3A2C25] active:scale-95 text-amber-100 border-amber-200/20'
            }`}
          >
            <Hammer className="w-4 h-4 shrink-0" />
            <span>小锤</span>
            <span className="tabular-nums opacity-80">×{boosters.hammer}</span>
          </button>

          <button
            onClick={() =>
              setActiveBooster((curr) =>
                curr === 'glove' ? null : boosters.glove > 0 ? 'glove' : null
              )
            }
            disabled={boosters.glove <= 0 || isBusy}
            className={`min-h-[44px] flex items-center justify-center gap-1.5 px-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              activeBooster === 'glove'
                ? 'bg-amber-400 text-slate-950 border-amber-200'
                : 'bg-[#3A2C25] active:scale-95 text-amber-100 border-amber-200/20'
            }`}
          >
            <Hand className="w-4 h-4 shrink-0" />
            <span>手套</span>
            <span className="tabular-nums opacity-80">×{boosters.glove}</span>
          </button>

          <button
            onClick={handleShuffleBooster}
            disabled={boosters.shuffle <= 0 || isBusy}
            className="min-h-[44px] flex items-center justify-center gap-1.5 px-2 rounded-xl text-xs font-semibold bg-[#3A2C25] active:scale-95 text-amber-100 border border-amber-200/20 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Shuffle className="w-4 h-4 shrink-0" />
            <span>洗牌</span>
            <span className="tabular-nums opacity-80">×{boosters.shuffle}</span>
          </button>
        </div>
      </footer>

      {/* Out of Moves Rescue Modal */}
      {outOfMovesModal && (
        <div className="absolute inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center">
          <div className="w-full bg-[#2A201B] border-t sm:border border-amber-200/25 rounded-t-3xl sm:rounded-3xl sm:mx-4 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-center shadow-2xl space-y-4">
            <div className="w-10 h-1 rounded-full bg-amber-200/25 mx-auto sm:hidden" />
            <h2 className="font-display text-2xl font-bold text-amber-100">步数已耗尽</h2>
            <p className="text-xs text-[#DED3C7] leading-relaxed">
              还差一点就能完成庄园目标了！可以使用金币补充 5 步，或者结束本局。
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleBuyExtraMoves}
                disabled={coins < 150}
                className="w-full h-12 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm transition-colors disabled:opacity-40 cursor-pointer"
              >
                150 金币加 5 步（现有 {coins}）
              </button>
              <button
                onClick={() => {
                  setOutOfMovesModal(false);
                  onLevelComplete({
                    won: false,
                    score: scoreRef.current,
                    stars: 0,
                    remainingMoves: 0,
                    coinsEarned: 0,
                  });
                }}
                className="w-full h-11 rounded-xl bg-[#3D2F28] hover:bg-[#4F3D34] text-amber-100 font-semibold text-xs transition-colors cursor-pointer"
              >
                结束本局
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
