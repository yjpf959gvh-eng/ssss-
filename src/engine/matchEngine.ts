import {
  Board,
  Cell,
  ClearedTileBurst,
  FlyingGoalOrb,
  GemColor,
  GoalType,
  LevelConfig,
  LevelGoal,
  PowerUpType,
  TileItem,
  VisualEffect,
} from '../types/game';

export const ALL_COLORS: GemColor[] = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];

let tileSeq = 1;
export function nextTileId(): string {
  tileSeq += 1;
  return `t_${tileSeq}_${Math.random().toString(36).slice(2, 6)}`;
}

export function getPalette(colorCount: 4 | 5 | 6): GemColor[] {
  return ALL_COLORS.slice(0, colorCount);
}

export function randomColor(palette: GemColor[]): GemColor {
  return palette[Math.floor(Math.random() * palette.length)];
}

export function cloneBoard(board: Board): Board {
  return board.map((row) =>
    row.map((cell) => ({
      ...cell,
      tile: cell.tile ? { ...cell.tile } : null,
    }))
  );
}

export function cellCanHoldTile(cell: Cell): boolean {
  return cell.active && cell.crateHp === 0 && !cell.honey;
}

export function cellCanSwap(cell: Cell): boolean {
  return (
    cell.active &&
    cell.crateHp === 0 &&
    !cell.honey &&
    !cell.chained &&
    cell.tile !== null
  );
}

export function createInitialBoard(level: LevelConfig): Board {
  const palette = getPalette(level.colorCount);
  const board: Board = [];

  for (let r = 0; r < level.rows; r++) {
    const rowCells: Cell[] = [];
    const layoutRow = level.layout[r] || '.'.repeat(level.cols);
    for (let c = 0; c < level.cols; c++) {
      const ch = layoutRow[c] || '.';
      const active = ch !== '#';
      const crateHp = ch === 'C' ? 2 : ch === 'c' ? 1 : 0;
      const iceHp = ch === 'I' ? 2 : ch === 'i' ? 1 : 0;
      const chained = ch === 'x';
      const honey = ch === 'h';
      const carpet = ch === 'g';

      const cell: Cell = {
        row: r,
        col: c,
        active,
        tile: null,
        crateHp,
        iceHp,
        chained,
        honey,
        carpet,
      };

      if (active && crateHp === 0 && !honey) {
        const forbidden = new Set<GemColor>();
        if (
          c >= 2 &&
          rowCells[c - 1].tile?.color &&
          rowCells[c - 2].tile?.color &&
          rowCells[c - 1].tile?.color === rowCells[c - 2].tile?.color
        ) {
          forbidden.add(rowCells[c - 1].tile!.color!);
        }
        if (
          r >= 2 &&
          board[r - 1][c].tile?.color &&
          board[r - 2][c].tile?.color &&
          board[r - 1][c].tile?.color === board[r - 2][c].tile?.color
        ) {
          forbidden.add(board[r - 1][c].tile!.color!);
        }
        if (
          r >= 1 &&
          c >= 1 &&
          board[r - 1][c].tile?.color &&
          board[r - 1][c - 1].tile?.color &&
          rowCells[c - 1].tile?.color &&
          board[r - 1][c].tile?.color === board[r - 1][c - 1].tile?.color &&
          board[r - 1][c].tile?.color === rowCells[c - 1].tile?.color
        ) {
          forbidden.add(board[r - 1][c].tile!.color!);
        }

        const candidates = palette.filter((col) => !forbidden.has(col));
        const chosen = candidates.length > 0 ? randomColor(candidates) : randomColor(palette);
        cell.tile = { id: nextTileId(), color: chosen, spawnOffsetRows: r + 2 };
      }

      rowCells.push(cell);
    }
    board.push(rowCells);
  }

  if (!findValidMove(board)) {
    return shuffleBoard(board, palette);
  }
  return board;
}

export interface MatchCluster {
  cells: Array<{ row: number; col: number }>;
  color: GemColor;
  spawnPowerUp?: PowerUpType;
  spawnAt: { row: number; col: number };
}

export function findMatchClusters(
  board: Board,
  preferPos?: { row: number; col: number }[]
): MatchCluster[] {
  const rows = board.length;
  const cols = board[0]?.length || 0;

  interface Run {
    cells: Array<{ row: number; col: number }>;
    dir: 'h' | 'v' | 'sq';
    color: GemColor;
  }

  const runs: Run[] = [];

  for (let r = 0; r < rows; r++) {
    let c = 0;
    while (c < cols) {
      const color = board[r][c].tile?.color;
      if (!color || !board[r][c].active || board[r][c].crateHp > 0 || board[r][c].honey) {
        c++;
        continue;
      }
      let end = c + 1;
      while (
        end < cols &&
        board[r][end].active &&
        board[r][end].crateHp === 0 &&
        !board[r][end].honey &&
        board[r][end].tile?.color === color
      ) {
        end++;
      }
      if (end - c >= 3) {
        const cells = [];
        for (let k = c; k < end; k++) cells.push({ row: r, col: k });
        runs.push({ cells, dir: 'h', color });
      }
      c = end;
    }
  }

  for (let c = 0; c < cols; c++) {
    let r = 0;
    while (r < rows) {
      const color = board[r][c].tile?.color;
      if (!color || !board[r][c].active || board[r][c].crateHp > 0 || board[r][c].honey) {
        r++;
        continue;
      }
      let end = r + 1;
      while (
        end < rows &&
        board[end][c].active &&
        board[end][c].crateHp === 0 &&
        !board[end][c].honey &&
        board[end][c].tile?.color === color
      ) {
        end++;
      }
      if (end - r >= 3) {
        const cells = [];
        for (let k = r; k < end; k++) cells.push({ row: k, col: c });
        runs.push({ cells, dir: 'v', color });
      }
      r = end;
    }
  }

  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const c00 = board[r][c];
      const c01 = board[r][c + 1];
      const c10 = board[r + 1][c];
      const c11 = board[r + 1][c + 1];
      const color = c00.tile?.color;
      if (
        color &&
        cellCanHoldTile(c00) &&
        cellCanHoldTile(c01) &&
        cellCanHoldTile(c10) &&
        cellCanHoldTile(c11) &&
        c01.tile?.color === color &&
        c10.tile?.color === color &&
        c11.tile?.color === color
      ) {
        runs.push({
          cells: [
            { row: r, col: c },
            { row: r, col: c + 1 },
            { row: r + 1, col: c },
            { row: r + 1, col: c + 1 },
          ],
          dir: 'sq',
          color,
        });
      }
    }
  }

  if (runs.length === 0) return [];

  const used = new Array(runs.length).fill(false);
  const clusters: MatchCluster[] = [];

  for (let i = 0; i < runs.length; i++) {
    if (used[i]) continue;
    used[i] = true;
    const queue = [runs[i]];
    const groupRuns = [runs[i]];
    const cellKeySet = new Set(runs[i].cells.map((p) => `${p.row},${p.col}`));

    while (queue.length > 0) {
      const curr = queue.shift()!;
      for (let j = 0; j < runs.length; j++) {
        if (used[j] || runs[j].color !== curr.color) continue;
        const sharesCell = runs[j].cells.some((p) => cellKeySet.has(`${p.row},${p.col}`));
        if (sharesCell) {
          used[j] = true;
          queue.push(runs[j]);
          groupRuns.push(runs[j]);
          runs[j].cells.forEach((p) => cellKeySet.add(`${p.row},${p.col}`));
        }
      }
    }

    const allCells = Array.from(cellKeySet).map((key) => {
      const [row, col] = key.split(',').map(Number);
      return { row, col };
    });

    const maxH = Math.max(0, ...groupRuns.filter((r) => r.dir === 'h').map((r) => r.cells.length));
    const maxV = Math.max(0, ...groupRuns.filter((r) => r.dir === 'v').map((r) => r.cells.length));
    const hasSq = groupRuns.some((r) => r.dir === 'sq');

    let spawnPowerUp: PowerUpType | undefined;
    if (maxH >= 5 || maxV >= 5) {
      spawnPowerUp = 'rainbow';
    } else if (maxH >= 3 && maxV >= 3) {
      spawnPowerUp = 'bomb';
    } else if (maxH === 4) {
      spawnPowerUp = 'rocket_v';
    } else if (maxV === 4) {
      spawnPowerUp = 'rocket_h';
    } else if (hasSq) {
      spawnPowerUp = 'plane';
    }

    let spawnAt = allCells[Math.floor(allCells.length / 2)];
    if (preferPos) {
      const hit = preferPos.find((p) => allCells.some((c) => c.row === p.row && c.col === p.col));
      if (hit) spawnAt = hit;
    }

    clusters.push({
      cells: allCells,
      color: runs[i].color,
      spawnPowerUp,
      spawnAt,
    });
  }

  return clusters;
}

export function findValidMove(
  board: Board
): { r1: number; c1: number; r2: number; c2: number } | null {
  const rows = board.length;
  const cols = board[0]?.length || 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = board[r][c];
      if (!cellCanSwap(cell)) continue;

      const neighbors = [
        { r2: r, c2: c + 1 },
        { r2: r + 1, c2: c },
      ];

      for (const { r2, c2 } of neighbors) {
        if (r2 >= rows || c2 >= cols) continue;
        const other = board[r2][c2];
        if (!cellCanSwap(other)) continue;

        if (cell.tile?.powerUp || other.tile?.powerUp) {
          return { r1: r, c1: c, r2, c2 };
        }

        const tmp = cell.tile;
        cell.tile = other.tile;
        other.tile = tmp;

        const matches = findMatchClusters(board);

        other.tile = cell.tile;
        cell.tile = tmp;

        if (matches.length > 0) {
          return { r1: r, c1: c, r2, c2 };
        }
      }
    }
  }
  return null;
}

export function shuffleBoard(board: Board, palette: GemColor[]): Board {
  const next = cloneBoard(board);
  const rows = next.length;
  const cols = next[0]?.length || 0;

  for (let attempt = 0; attempt < 20; attempt++) {
    const movableTiles: TileItem[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = next[r][c];
        if (cellCanSwap(cell) && cell.tile) {
          movableTiles.push(cell.tile);
        }
      }
    }

    for (let i = movableTiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = movableTiles[i];
      movableTiles[i] = movableTiles[j];
      movableTiles[j] = tmp;
    }

    let idx = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = next[r][c];
        if (cellCanSwap(cell) && cell.tile) {
          cell.tile = { ...movableTiles[idx++], isNew: true, spawnOffsetRows: undefined };
        }
      }
    }

    if (findMatchClusters(next).length === 0 && findValidMove(next)) {
      return next;
    }
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = next[r][c];
      if (cellCanSwap(cell) && cell.tile && !cell.tile.powerUp) {
        cell.tile = { id: nextTileId(), color: randomColor(palette), isNew: true };
      }
    }
  }
  return next;
}

export function applyGravityAndRefill(board: Board, palette: GemColor[]): Board {
  const next = cloneBoard(board);
  const rows = next.length;
  const cols = next[0]?.length || 0;

  // Clear old spawn flags on existing tiles
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (next[r][c].tile) {
        next[r][c].tile!.isNew = false;
        next[r][c].tile!.spawnOffsetRows = undefined;
      }
    }
  }

  const colSpawnCounts = new Array(cols).fill(0);

  let moved = true;
  let guard = 0;
  while (moved && guard < 40) {
    moved = false;
    guard++;

    // 1. Vertical drops from bottom to top
    for (let r = rows - 1; r >= 1; r--) {
      for (let c = 0; c < cols; c++) {
        const dest = next[r][c];
        if (!cellCanHoldTile(dest) || dest.tile !== null || dest.chained || dest.iceHp > 0) {
          continue;
        }
        const above = next[r - 1][c];
        if (
          above.active &&
          above.tile !== null &&
          !above.chained &&
          above.iceHp === 0 &&
          above.crateHp === 0 &&
          !above.honey
        ) {
          dest.tile = above.tile;
          above.tile = null;
          moved = true;
        }
      }
    }

    // 2. Spawn new gems at top-most open slots of each column with realistic above-board spawnOffsetRows!
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const cell = next[r][c];
        if (!cell.active) continue;
        const hasOpenAbove = r > 0 && next[r - 1][c].active;
        if (
          !hasOpenAbove &&
          cellCanHoldTile(cell) &&
          cell.tile === null &&
          !cell.chained &&
          cell.iceHp === 0
        ) {
          colSpawnCounts[c] += 1;
          cell.tile = {
            id: nextTileId(),
            color: randomColor(palette),
            isNew: true,
            spawnOffsetRows: r + colSpawnCounts[c], // drops smoothly from above row 0
          };
          moved = true;
        }
      }
    }

    // 3. Diagonal slide around crates/honey/chains/holes
    if (!moved) {
      for (let r = rows - 1; r >= 1; r--) {
        for (let c = 0; c < cols; c++) {
          const dest = next[r][c];
          if (!cellCanHoldTile(dest) || dest.tile !== null || dest.chained || dest.iceHp > 0) {
            continue;
          }
          const diagOffsets = Math.random() < 0.5 ? [-1, 1] : [1, -1];
          for (const dc of diagOffsets) {
            const sc = c + dc;
            if (sc < 0 || sc >= cols) continue;
            const src = next[r - 1][sc];
            if (
              src.active &&
              src.tile !== null &&
              !src.chained &&
              src.iceHp === 0 &&
              src.crateHp === 0 &&
              !src.honey
            ) {
              dest.tile = src.tile;
              src.tile = null;
              moved = true;
              break;
            }
          }
        }
      }
    }
  }

  return next;
}

export function pickPlaneTarget(
  board: Board,
  goals: LevelGoal[],
  progress: Record<GoalType, number>,
  excludeKeys: Set<string>
): { row: number; col: number } | null {
  const rows = board.length;
  const cols = board[0]?.length || 0;

  const needGoals = new Set(
    goals.filter((g) => (progress[g.type] || 0) < g.target).map((g) => g.type)
  );

  const candidates: Array<{ row: number; col: number; weight: number }> = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const key = `${r},${c}`;
      if (excludeKeys.has(key)) continue;
      const cell = board[r][c];
      if (!cell.active) continue;

      let weight = 0;
      if (cell.honey && needGoals.has('clear_honey')) weight += 100;
      if (cell.chained && needGoals.has('clear_chain')) weight += 90;
      if (cell.crateHp > 0 && needGoals.has('clear_crate')) weight += 85;
      if (cell.iceHp > 0 && needGoals.has('clear_ice')) weight += 80;
      if (!cell.carpet && needGoals.has('spread_carpet')) weight += 55;
      if (cell.tile?.color) {
        const goalKey = `collect_${cell.tile.color}` as GoalType;
        if (needGoals.has(goalKey)) weight += 65;
      }
      if (cell.honey) weight += 30;
      if (cell.crateHp > 0) weight += 25;
      if (cell.iceHp > 0) weight += 20;
      if (cell.chained) weight += 20;
      if (cell.tile) weight += 5;

      if (weight > 0) {
        candidates.push({ row: r, col: c, weight });
      }
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.weight - a.weight);
  const topWeight = candidates[0].weight;
  const topTier = candidates.filter((x) => x.weight >= topWeight - 5);
  const picked = topTier[Math.floor(Math.random() * topTier.length)];
  return { row: picked.row, col: picked.col };
}

export interface StepDelta {
  board: Board;
  scoreDelta: number;
  goalIncrements: Partial<Record<GoalType, number>>;
  goalOrbs: FlyingGoalOrb[];
  effects: VisualEffect[];
  clearedBursts: ClearedTileBurst[];
  spawnedPowerUps: number;
  triggeredPowerUps: PowerUpType[];
  hitObstacle: boolean;
  clearedHoneyCount: number;
}

export function resolveMatchClustersStep(
  board: Board,
  clusters: MatchCluster[],
  goals: LevelGoal[],
  progress: Record<GoalType, number>
): StepDelta {
  const next = cloneBoard(board);
  const rows = next.length;
  const cols = next[0]?.length || 0;

  let scoreDelta = 0;
  const goalIncrements: Partial<Record<GoalType, number>> = {};
  const goalOrbs: FlyingGoalOrb[] = [];
  const effects: VisualEffect[] = [];
  const clearedBursts: ClearedTileBurst[] = [];
  const triggeredPowerUps: PowerUpType[] = [];
  let spawnedPowerUps = 0;
  let hitObstacle = false;
  let clearedHoneyCount = 0;

  const incGoal = (type: GoalType, amt = 1, row = 0, col = 0) => {
    goalIncrements[type] = (goalIncrements[type] || 0) + amt;
    const idx = goals.findIndex((g) => g.type === type);
    if (idx !== -1 && (progress[type] || 0) < goals[idx].target && goalOrbs.length < 14) {
      goalOrbs.push({
        id: `orb_${row}_${col}_${Math.random().toString(36).slice(2, 6)}`,
        row,
        col,
        goalType: type,
        targetIdx: idx,
      });
    }
  };

  const blastedKeys = new Set<string>();
  const triggeredPowerIds = new Set<string>();
  const powerQueue: Array<{ row: number; col: number; powerUp: PowerUpType; color: GemColor | null }> = [];

  for (const cluster of clusters) {
    const touchesCarpet = cluster.cells.some((p) => next[p.row][p.col].carpet);
    scoreDelta +=
      cluster.cells.length * 30 + (cluster.cells.length > 3 ? (cluster.cells.length - 3) * 40 : 0);

    for (const { row, col } of cluster.cells) {
      const cell = next[row][col];

      if (touchesCarpet && !cell.carpet && cell.active) {
        cell.carpet = true;
        incGoal('spread_carpet', 1, row, col);
      }

      if (cell.iceHp > 0) {
        cell.iceHp -= 1;
        hitObstacle = true;
        if (cell.iceHp === 0) incGoal('clear_ice', 1, row, col);
      }

      if (cell.chained) {
        cell.chained = false;
        hitObstacle = true;
        incGoal('clear_chain', 1, row, col);
      }

      if (cell.tile?.powerUp && !triggeredPowerIds.has(cell.tile.id)) {
        triggeredPowerIds.add(cell.tile.id);
        powerQueue.push({ row, col, powerUp: cell.tile.powerUp, color: cell.tile.color });
      }

      if (cell.tile?.color) {
        incGoal(`collect_${cell.tile.color}` as GoalType, 1, row, col);
      }

      const isSpawn =
        cluster.spawnPowerUp &&
        cluster.spawnAt.row === row &&
        cluster.spawnAt.col === col;

      if (cell.tile) {
        clearedBursts.push({
          id: cell.tile.id,
          row,
          col,
          color: cell.tile.color,
          powerUp: cell.tile.powerUp,
        });
      }

      if (isSpawn && cluster.spawnPowerUp) {
        cell.tile = {
          id: nextTileId(),
          color: cluster.spawnPowerUp === 'rainbow' ? null : cluster.color,
          powerUp: cluster.spawnPowerUp,
          isNew: true,
        };
        spawnedPowerUps++;
      } else {
        cell.tile = null;
      }

      const adj = [
        [row - 1, col],
        [row + 1, col],
        [row, col - 1],
        [row, col + 1],
      ];
      for (const [ar, ac] of adj) {
        if (ar < 0 || ar >= rows || ac < 0 || ac >= cols) continue;
        const adjCell = next[ar][ac];
        if (!adjCell.active) continue;
        const adjKey = `${ar},${ac}`;
        if (blastedKeys.has(`adj_${adjKey}`)) continue;

        if (adjCell.crateHp > 0) {
          blastedKeys.add(`adj_${adjKey}`);
          adjCell.crateHp -= 1;
          hitObstacle = true;
          scoreDelta += 60;
          clearedBursts.push({ id: `crate_${ar}_${ac}_${Date.now()}`, row: ar, col: ac, color: 'orange' });
          if (adjCell.crateHp === 0) incGoal('clear_crate', 1, ar, ac);
        } else if (adjCell.honey) {
          blastedKeys.add(`adj_${adjKey}`);
          adjCell.honey = false;
          hitObstacle = true;
          clearedHoneyCount++;
          scoreDelta += 80;
          clearedBursts.push({ id: `honey_${ar}_${ac}_${Date.now()}`, row: ar, col: ac, color: 'yellow' });
          incGoal('clear_honey', 1, ar, ac);
        }
      }
    }
  }

  const applyBlastToCell = (r: number, c: number, spreadCarpetFlag: boolean) => {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return;
    const cell = next[r][c];
    if (!cell.active) return;

    if (spreadCarpetFlag && !cell.carpet) {
      cell.carpet = true;
      incGoal('spread_carpet', 1, r, c);
    }

    if (cell.crateHp > 0) {
      cell.crateHp -= 1;
      hitObstacle = true;
      scoreDelta += 60;
      clearedBursts.push({ id: `crate_${r}_${c}_${Math.random()}`, row: r, col: c, color: 'orange' });
      if (cell.crateHp === 0) incGoal('clear_crate', 1, r, c);
      return;
    }

    if (cell.honey) {
      cell.honey = false;
      hitObstacle = true;
      clearedHoneyCount++;
      scoreDelta += 80;
      clearedBursts.push({ id: `honey_${r}_${c}_${Math.random()}`, row: r, col: c, color: 'yellow' });
      incGoal('clear_honey', 1, r, c);
      return;
    }

    if (cell.iceHp > 0) {
      cell.iceHp -= 1;
      hitObstacle = true;
      if (cell.iceHp === 0) incGoal('clear_ice', 1, r, c);
    }

    if (cell.chained) {
      cell.chained = false;
      hitObstacle = true;
      incGoal('clear_chain', 1, r, c);
    }

    if (cell.tile) {
      if (cell.tile.powerUp && !triggeredPowerIds.has(cell.tile.id)) {
        triggeredPowerIds.add(cell.tile.id);
        powerQueue.push({ row: r, col: c, powerUp: cell.tile.powerUp, color: cell.tile.color });
      }
      if (cell.tile.color) {
        incGoal(`collect_${cell.tile.color}` as GoalType, 1, r, c);
      }
      scoreDelta += 40;
      clearedBursts.push({
        id: cell.tile.id,
        row: r,
        col: c,
        color: cell.tile.color,
        powerUp: cell.tile.powerUp,
      });
      cell.tile = null;
    }
  };

  const planeReserved = new Set<string>();
  while (powerQueue.length > 0) {
    const item = powerQueue.shift()!;
    triggeredPowerUps.push(item.powerUp);
    const { row, col, powerUp } = item;

    if (powerUp === 'rocket_h') {
      let hasCarpet = next[row][col].carpet;
      for (let c = 0; c < cols; c++) if (next[row][c].carpet) hasCarpet = true;
      for (let c = 0; c < cols; c++) applyBlastToCell(row, c, hasCarpet);
      effects.push({ id: `fx_${Math.random()}`, kind: 'beam_h', row, col });
    } else if (powerUp === 'rocket_v') {
      let hasCarpet = next[row][col].carpet;
      for (let r = 0; r < rows; r++) if (next[r][col].carpet) hasCarpet = true;
      for (let r = 0; r < rows; r++) applyBlastToCell(r, col, hasCarpet);
      effects.push({ id: `fx_${Math.random()}`, kind: 'beam_v', row, col });
    } else if (powerUp === 'bomb') {
      let hasCarpet = next[row][col].carpet;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = row + dr;
          const nc = col + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && next[nr][nc].carpet) {
            hasCarpet = true;
          }
        }
      }
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          applyBlastToCell(row + dr, col + dc, hasCarpet);
        }
      }
      effects.push({ id: `fx_${Math.random()}`, kind: 'shockwave', row, col });
    } else if (powerUp === 'plane') {
      const originCarpet = next[row][col].carpet;
      const takeoffNeighbors = [
        [row - 1, col],
        [row + 1, col],
        [row, col - 1],
        [row, col + 1],
      ];
      for (const [nr, nc] of takeoffNeighbors) {
        applyBlastToCell(nr, nc, originCarpet);
      }

      const target = pickPlaneTarget(next, goals, progress, planeReserved);
      if (target) {
        planeReserved.add(`${target.row},${target.col}`);
        applyBlastToCell(target.row, target.col, originCarpet || next[target.row][target.col].carpet);
        effects.push({
          id: `fx_${Math.random()}`,
          kind: 'plane_fly',
          row,
          col,
          targetRow: target.row,
          targetCol: target.col,
        });
      }
    } else if (powerUp === 'rainbow') {
      const counts: Partial<Record<GemColor, number>> = {};
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const colr = next[r][c].tile?.color;
          if (colr) counts[colr] = (counts[colr] || 0) + 1;
        }
      }
      const bestColor = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as GemColor) || 'red';
      const originCarpet = next[row][col].carpet;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (next[r][c].tile?.color === bestColor) {
            applyBlastToCell(r, c, originCarpet);
            effects.push({
              id: `fx_${Math.random()}`,
              kind: 'rainbow_zap',
              row,
              col,
              targetRow: r,
              targetCol: c,
              color: bestColor,
            });
          }
        }
      }
    }
  }

  return {
    board: next,
    scoreDelta,
    goalIncrements,
    goalOrbs,
    effects,
    clearedBursts,
    spawnedPowerUps,
    triggeredPowerUps,
    hitObstacle,
    clearedHoneyCount,
  };
}

export function resolvePowerUpActivationOrCombo(
  board: Board,
  r1: number,
  c1: number,
  r2: number | null,
  c2: number | null,
  goals: LevelGoal[],
  progress: Record<GoalType, number>
): StepDelta {
  const next = cloneBoard(board);
  const rows = next.length;
  const cols = next[0]?.length || 0;

  let scoreDelta = 0;
  const goalIncrements: Partial<Record<GoalType, number>> = {};
  const goalOrbs: FlyingGoalOrb[] = [];
  const effects: VisualEffect[] = [];
  const clearedBursts: ClearedTileBurst[] = [];
  const triggeredPowerUps: PowerUpType[] = [];
  let hitObstacle = false;
  let clearedHoneyCount = 0;

  const incGoal = (type: GoalType, amt = 1, row = 0, col = 0) => {
    goalIncrements[type] = (goalIncrements[type] || 0) + amt;
    const idx = goals.findIndex((g) => g.type === type);
    if (idx !== -1 && (progress[type] || 0) < goals[idx].target && goalOrbs.length < 14) {
      goalOrbs.push({
        id: `orb_${row}_${col}_${Math.random().toString(36).slice(2, 6)}`,
        row,
        col,
        goalType: type,
        targetIdx: idx,
      });
    }
  };

  const triggeredPowerIds = new Set<string>();
  const chainQueue: Array<{ row: number; col: number; powerUp: PowerUpType; color: GemColor | null }> = [];

  const applyBlast = (r: number, c: number, spreadCarpetFlag: boolean) => {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return;
    const cell = next[r][c];
    if (!cell.active) return;

    if (spreadCarpetFlag && !cell.carpet) {
      cell.carpet = true;
      incGoal('spread_carpet', 1, r, c);
    }

    if (cell.crateHp > 0) {
      cell.crateHp -= 1;
      hitObstacle = true;
      scoreDelta += 65;
      clearedBursts.push({ id: `crate_${r}_${c}_${Math.random()}`, row: r, col: c, color: 'orange' });
      if (cell.crateHp === 0) incGoal('clear_crate', 1, r, c);
      return;
    }

    if (cell.honey) {
      cell.honey = false;
      hitObstacle = true;
      clearedHoneyCount++;
      scoreDelta += 85;
      clearedBursts.push({ id: `honey_${r}_${c}_${Math.random()}`, row: r, col: c, color: 'yellow' });
      incGoal('clear_honey', 1, r, c);
      return;
    }

    if (cell.iceHp > 0) {
      cell.iceHp -= 1;
      hitObstacle = true;
      if (cell.iceHp === 0) incGoal('clear_ice', 1, r, c);
    }

    if (cell.chained) {
      cell.chained = false;
      hitObstacle = true;
      incGoal('clear_chain', 1, r, c);
    }

    if (cell.tile) {
      if (cell.tile.powerUp && !triggeredPowerIds.has(cell.tile.id)) {
        triggeredPowerIds.add(cell.tile.id);
        chainQueue.push({ row: r, col: c, powerUp: cell.tile.powerUp, color: cell.tile.color });
      }
      if (cell.tile.color) {
        incGoal(`collect_${cell.tile.color}` as GoalType, 1, r, c);
      }
      scoreDelta += 45;
      clearedBursts.push({
        id: cell.tile.id,
        row: r,
        col: c,
        color: cell.tile.color,
        powerUp: cell.tile.powerUp,
      });
      cell.tile = null;
    }
  };

  const cell1 = next[r1][c1];
  const cell2 = r2 !== null && c2 !== null ? next[r2][c2] : null;

  const p1 = cell1.tile?.powerUp;
  const p2 = cell2?.tile?.powerUp;

  if (cell1.tile) triggeredPowerIds.add(cell1.tile.id);
  if (cell2?.tile) triggeredPowerIds.add(cell2.tile.id);

  if (p1 && p2 && cell2) {
    const centerR = cell2.row;
    const centerC = cell2.col;
    const carpetSpread = cell1.carpet || cell2.carpet;
    cell1.tile = null;
    cell2.tile = null;
    scoreDelta += 250;

    if (p1 === 'rainbow' && p2 === 'rainbow') {
      triggeredPowerUps.push('rainbow', 'rainbow');
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          applyBlast(r, c, carpetSpread);
        }
      }
      effects.push({ id: `fx_${Math.random()}`, kind: 'shockwave', row: centerR, col: centerC });
    } else if (p1 === 'rainbow' || p2 === 'rainbow') {
      const otherPower = p1 === 'rainbow' ? p2 : p1;
      triggeredPowerUps.push('rainbow', otherPower);
      const counts: Partial<Record<GemColor, number>> = {};
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const colr = next[r][c].tile?.color;
          if (colr) counts[colr] = (counts[colr] || 0) + 1;
        }
      }
      const targetColor = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as GemColor) || 'red';
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (next[r][c].tile?.color === targetColor) {
            const assigned: PowerUpType =
              otherPower === 'rocket_h' || otherPower === 'rocket_v'
                ? Math.random() < 0.5
                  ? 'rocket_h'
                  : 'rocket_v'
                : otherPower;
            chainQueue.push({ row: r, col: c, powerUp: assigned, color: targetColor });
            effects.push({
              id: `fx_${Math.random()}`,
              kind: 'rainbow_zap',
              row: centerR,
              col: centerC,
              targetRow: r,
              targetCol: c,
              color: targetColor,
            });
          }
        }
      }
    } else if (p1 === 'bomb' && p2 === 'bomb') {
      triggeredPowerUps.push('bomb', 'bomb');
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          applyBlast(centerR + dr, centerC + dc, carpetSpread);
        }
      }
      effects.push({ id: `fx_${Math.random()}`, kind: 'shockwave', row: centerR, col: centerC });
    } else if (
      (p1 === 'bomb' && (p2 === 'rocket_h' || p2 === 'rocket_v')) ||
      (p2 === 'bomb' && (p1 === 'rocket_h' || p1 === 'rocket_v'))
    ) {
      triggeredPowerUps.push('bomb', 'rocket_h');
      for (let dr = -1; dr <= 1; dr++) {
        for (let c = 0; c < cols; c++) applyBlast(centerR + dr, c, carpetSpread);
        effects.push({ id: `fx_${Math.random()}`, kind: 'beam_h', row: centerR + dr, col: centerC });
      }
      for (let dc = -1; dc <= 1; dc++) {
        for (let r = 0; r < rows; r++) applyBlast(r, centerC + dc, carpetSpread);
        effects.push({ id: `fx_${Math.random()}`, kind: 'beam_v', row: centerR, col: centerC + dc });
      }
    } else if (
      (p1 === 'rocket_h' || p1 === 'rocket_v') &&
      (p2 === 'rocket_h' || p2 === 'rocket_v')
    ) {
      triggeredPowerUps.push('rocket_h', 'rocket_v');
      for (let c = 0; c < cols; c++) applyBlast(centerR, c, carpetSpread);
      for (let r = 0; r < rows; r++) applyBlast(r, centerC, carpetSpread);
      effects.push({ id: `fx_${Math.random()}`, kind: 'beam_h', row: centerR, col: centerC });
      effects.push({ id: `fx_${Math.random()}`, kind: 'beam_v', row: centerR, col: centerC });
    } else if (p1 === 'plane' && p2 === 'plane') {
      triggeredPowerUps.push('plane', 'plane');
      const reserved = new Set<string>();
      for (let k = 0; k < 3; k++) {
        const tgt = pickPlaneTarget(next, goals, progress, reserved);
        if (tgt) {
          reserved.add(`${tgt.row},${tgt.col}`);
          applyBlast(tgt.row, tgt.col, carpetSpread || next[tgt.row][tgt.col].carpet);
          effects.push({
            id: `fx_${Math.random()}`,
            kind: 'plane_fly',
            row: centerR,
            col: centerC,
            targetRow: tgt.row,
            targetCol: tgt.col,
          });
        }
      }
    } else if (p1 === 'plane' || p2 === 'plane') {
      const payload = p1 === 'plane' ? p2 : p1;
      triggeredPowerUps.push('plane', payload);
      const reserved = new Set<string>();
      const tgt = pickPlaneTarget(next, goals, progress, reserved);
      if (tgt) {
        effects.push({
          id: `fx_${Math.random()}`,
          kind: 'plane_fly',
          row: centerR,
          col: centerC,
          targetRow: tgt.row,
          targetCol: tgt.col,
        });
        chainQueue.push({ row: tgt.row, col: tgt.col, powerUp: payload, color: null });
      }
    }
  } else if ((p1 === 'rainbow' || p2 === 'rainbow') && cell2) {
    const rainbowCell = p1 === 'rainbow' ? cell1 : cell2;
    const gemCell = p1 === 'rainbow' ? cell2 : cell1;
    const targetColor = gemCell.tile?.color;
    const originCarpet = rainbowCell.carpet || gemCell.carpet;
    rainbowCell.tile = null;
    triggeredPowerUps.push('rainbow');
    scoreDelta += 180;

    if (targetColor) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (next[r][c].tile?.color === targetColor) {
            applyBlast(r, c, originCarpet);
            effects.push({
              id: `fx_${Math.random()}`,
              kind: 'rainbow_zap',
              row: rainbowCell.row,
              col: rainbowCell.col,
              targetRow: r,
              targetCol: c,
              color: targetColor,
            });
          }
        }
      }
    }
  } else {
    if (p1) {
      const colr = cell1.tile?.color || null;
      cell1.tile = null;
      chainQueue.push({ row: cell1.row, col: cell1.col, powerUp: p1, color: colr });
    }
    if (p2 && cell2) {
      const colr = cell2.tile?.color || null;
      cell2.tile = null;
      chainQueue.push({ row: cell2.row, col: cell2.col, powerUp: p2, color: colr });
    }
  }

  const planeReserved = new Set<string>();
  while (chainQueue.length > 0) {
    const item = chainQueue.shift()!;
    triggeredPowerUps.push(item.powerUp);
    const { row, col, powerUp } = item;

    if (powerUp === 'rocket_h') {
      let hasCarpet = next[row][col].carpet;
      for (let c = 0; c < cols; c++) if (next[row][c].carpet) hasCarpet = true;
      for (let c = 0; c < cols; c++) applyBlast(row, c, hasCarpet);
      effects.push({ id: `fx_${Math.random()}`, kind: 'beam_h', row, col });
    } else if (powerUp === 'rocket_v') {
      let hasCarpet = next[row][col].carpet;
      for (let r = 0; r < rows; r++) if (next[r][col].carpet) hasCarpet = true;
      for (let r = 0; r < rows; r++) applyBlast(r, col, hasCarpet);
      effects.push({ id: `fx_${Math.random()}`, kind: 'beam_v', row, col });
    } else if (powerUp === 'bomb') {
      let hasCarpet = next[row][col].carpet;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = row + dr;
          const nc = col + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && next[nr][nc].carpet) {
            hasCarpet = true;
          }
        }
      }
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          applyBlast(row + dr, col + dc, hasCarpet);
        }
      }
      effects.push({ id: `fx_${Math.random()}`, kind: 'shockwave', row, col });
    } else if (powerUp === 'plane') {
      const originCarpet = next[row][col].carpet;
      const adj = [
        [row - 1, col],
        [row + 1, col],
        [row, col - 1],
        [row, col + 1],
      ];
      for (const [nr, nc] of adj) applyBlast(nr, nc, originCarpet);
      const tgt = pickPlaneTarget(next, goals, progress, planeReserved);
      if (tgt) {
        planeReserved.add(`${tgt.row},${tgt.col}`);
        applyBlast(tgt.row, tgt.col, originCarpet || next[tgt.row][tgt.col].carpet);
        effects.push({
          id: `fx_${Math.random()}`,
          kind: 'plane_fly',
          row,
          col,
          targetRow: tgt.row,
          targetCol: tgt.col,
        });
      }
    } else if (powerUp === 'rainbow') {
      const counts: Partial<Record<GemColor, number>> = {};
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const colr = next[r][c].tile?.color;
          if (colr) counts[colr] = (counts[colr] || 0) + 1;
        }
      }
      const bestColor = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as GemColor) || 'red';
      const originCarpet = next[row][col].carpet;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (next[r][c].tile?.color === bestColor) {
            applyBlast(r, c, originCarpet);
            effects.push({
              id: `fx_${Math.random()}`,
              kind: 'rainbow_zap',
              row,
              col,
              targetRow: r,
              targetCol: c,
              color: bestColor,
            });
          }
        }
      }
    }
  }

  return {
    board: next,
    scoreDelta,
    goalIncrements,
    goalOrbs,
    effects,
    clearedBursts,
    spawnedPowerUps: 0,
    triggeredPowerUps,
    hitObstacle,
    clearedHoneyCount,
  };
}

export function spreadHoneyStep(board: Board): { board: Board; spreadAt?: { row: number; col: number } } {
  const next = cloneBoard(board);
  const rows = next.length;
  const cols = next[0]?.length || 0;

  const honeyCells: Array<{ row: number; col: number }> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (next[r][c].honey) honeyCells.push({ row: r, col: c });
    }
  }
  if (honeyCells.length === 0) return { board: next };

  const candidates: Array<{ row: number; col: number }> = [];
  for (const h of honeyCells) {
    const dirs = [
      [h.row - 1, h.col],
      [h.row + 1, h.col],
      [h.row, h.col - 1],
      [h.row, h.col + 1],
    ];
    for (const [nr, nc] of dirs) {
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
      const c = next[nr][nc];
      if (c.active && c.crateHp === 0 && !c.honey && !c.chained && c.iceHp === 0 && !c.tile?.powerUp) {
        candidates.push({ row: nr, col: nc });
      }
    }
  }

  if (candidates.length === 0) return { board: next };
  const target = candidates[Math.floor(Math.random() * candidates.length)];
  next[target.row][target.col].honey = true;
  next[target.row][target.col].tile = null;
  return { board: next, spreadAt: target };
}

export function computeInitialGoalProgress(board: Board): Record<GoalType, number> {
  const progress: Record<GoalType, number> = {
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
  };

  for (const row of board) {
    for (const cell of row) {
      if (cell.carpet) progress.spread_carpet += 1;
    }
  }

  return progress;
}
