/**
 * A* 寻路算法
 * 高性能、支持多种启发式函数和对角线移动
 */

/** 网格节点 */
export interface PathNode {
  x: number;
  y: number;
  walkable: boolean;
  /** 移动成本权重（默认1，数值越高越难通过） */
  weight: number;
}

/** 路径点 */
export interface PathPoint {
  x: number;
  y: number;
}

/** 寻路选项 */
export interface PathfinderOptions {
  /** 是否允许对角线移动 */
  allowDiagonal?: boolean;
  /** 对角线移动时是否需要相邻格子可通行（避免穿墙角） */
  dontCrossCorners?: boolean;
  /** 启发式函数类型 */
  heuristic?: 'manhattan' | 'euclidean' | 'chebyshev' | 'octile';
  /** 启发式权重（>1 更快但可能不是最优路径） */
  heuristicWeight?: number;
}

/** 内部搜索节点 */
interface SearchNode {
  x: number;
  y: number;
  g: number; // 起点到当前节点的实际成本
  h: number; // 当前节点到终点的估计成本
  f: number; // g + h
  parent: SearchNode | null;
  opened: boolean;
  closed: boolean;
}

/**
 * 二叉堆（最小堆）- 用于高效的开放列表
 */
class BinaryHeap<T> {
  private heap: T[] = [];
  constructor(private compare: (a: T, b: T) => number) {}

  get size(): number {
    return this.heap.length;
  }

  push(item: T): void {
    this.heap.push(item);
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): T | undefined {
    if (this.heap.length === 0) return undefined;
    const result = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.sinkDown(0);
    }
    return result;
  }

  update(item: T): void {
    const index = this.heap.indexOf(item);
    if (index !== -1) {
      this.bubbleUp(index);
      this.sinkDown(index);
    }
  }

  clear(): void {
    this.heap.length = 0;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.compare(this.heap[index], this.heap[parentIndex]) >= 0) break;
      [this.heap[index], this.heap[parentIndex]] = [this.heap[parentIndex], this.heap[index]];
      index = parentIndex;
    }
  }

  private sinkDown(index: number): void {
    const length = this.heap.length;
    while (true) {
      const leftChild = 2 * index + 1;
      const rightChild = 2 * index + 2;
      let smallest = index;

      if (leftChild < length && this.compare(this.heap[leftChild], this.heap[smallest]) < 0) {
        smallest = leftChild;
      }
      if (rightChild < length && this.compare(this.heap[rightChild], this.heap[smallest]) < 0) {
        smallest = rightChild;
      }
      if (smallest === index) break;

      [this.heap[index], this.heap[smallest]] = [this.heap[smallest], this.heap[index]];
      index = smallest;
    }
  }
}

/**
 * 寻路网格
 */
export class PathGrid {
  private nodes: PathNode[][];
  readonly width: number;
  readonly height: number;

  constructor(width: number, height: number, walkableMatrix?: boolean[][]) {
    this.width = width;
    this.height = height;
    this.nodes = [];

    for (let y = 0; y < height; y++) {
      this.nodes[y] = [];
      for (let x = 0; x < width; x++) {
        this.nodes[y][x] = {
          x,
          y,
          walkable: walkableMatrix ? (walkableMatrix[y]?.[x] ?? true) : true,
          weight: 1,
        };
      }
    }
  }

  /**
   * 从二维数组创建网格
   * @param matrix 0=可通行, 1=障碍
   */
  static fromMatrix(matrix: number[][]): PathGrid {
    const height = matrix.length;
    const width = matrix[0]?.length ?? 0;
    const walkable = matrix.map((row) => row.map((v) => v === 0));
    return new PathGrid(width, height, walkable);
  }

  /**
   * 获取节点
   */
  getNode(x: number, y: number): PathNode | null {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return null;
    return this.nodes[y][x];
  }

  /**
   * 检查节点是否可通行
   */
  isWalkable(x: number, y: number): boolean {
    const node = this.getNode(x, y);
    return node?.walkable ?? false;
  }

  /**
   * 设置节点可通行性
   */
  setWalkable(x: number, y: number, walkable: boolean): void {
    const node = this.getNode(x, y);
    if (node) node.walkable = walkable;
  }

  /**
   * 设置节点权重
   */
  setWeight(x: number, y: number, weight: number): void {
    const node = this.getNode(x, y);
    if (node) node.weight = weight;
  }

  /**
   * 批量设置障碍
   */
  setObstacles(obstacles: Array<{ x: number; y: number }>): void {
    for (const { x, y } of obstacles) {
      this.setWalkable(x, y, false);
    }
  }

  /**
   * 清除所有障碍
   */
  clearObstacles(): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.nodes[y][x].walkable = true;
        this.nodes[y][x].weight = 1;
      }
    }
  }

  /**
   * 克隆网格
   */
  clone(): PathGrid {
    const walkable = this.nodes.map((row) => row.map((n) => n.walkable));
    const grid = new PathGrid(this.width, this.height, walkable);
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        grid.nodes[y][x].weight = this.nodes[y][x].weight;
      }
    }
    return grid;
  }
}

/**
 * A* 寻路器
 */
export class Pathfinder {
  private options: Required<PathfinderOptions>;

  // 方向常量
  private static readonly DIRS_4 = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0], // 上右下左
  ];
  private static readonly DIRS_8 = [
    [0, -1],
    [1, -1],
    [1, 0],
    [1, 1], // 上、右上、右、右下
    [0, 1],
    [-1, 1],
    [-1, 0],
    [-1, -1], // 下、左下、左、左上
  ];

  constructor(options: PathfinderOptions = {}) {
    this.options = {
      allowDiagonal: options.allowDiagonal ?? false,
      dontCrossCorners: options.dontCrossCorners ?? true,
      heuristic: options.heuristic ?? 'manhattan',
      heuristicWeight: options.heuristicWeight ?? 1,
    };
  }

  /**
   * 寻找路径
   * @returns 路径点数组（包含起点和终点），如果没找到返回空数组
   */
  findPath(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    grid: PathGrid
  ): PathPoint[] {
    // 验证起点终点
    if (!grid.isWalkable(startX, startY) || !grid.isWalkable(endX, endY)) {
      return [];
    }

    // 起点就是终点
    if (startX === endX && startY === endY) {
      return [{ x: startX, y: startY }];
    }

    // 创建搜索节点网格
    const searchNodes: SearchNode[][] = [];
    for (let y = 0; y < grid.height; y++) {
      searchNodes[y] = [];
      for (let x = 0; x < grid.width; x++) {
        searchNodes[y][x] = {
          x,
          y,
          g: 0,
          h: 0,
          f: 0,
          parent: null,
          opened: false,
          closed: false,
        };
      }
    }

    const getSearchNode = (x: number, y: number): SearchNode | null => {
      if (x < 0 || x >= grid.width || y < 0 || y >= grid.height) return null;
      return searchNodes[y][x];
    };

    // 开放列表（最小堆）
    const openList = new BinaryHeap<SearchNode>((a, b) => a.f - b.f);

    // 启发式函数
    const heuristic = this.getHeuristicFn();
    const weight = this.options.heuristicWeight;

    // 初始化起点
    const startNode = searchNodes[startY][startX];
    startNode.g = 0;
    startNode.h = heuristic(startX, startY, endX, endY) * weight;
    startNode.f = startNode.h;
    startNode.opened = true;
    openList.push(startNode);

    // 获取邻居的方向
    const dirs = this.options.allowDiagonal ? Pathfinder.DIRS_8 : Pathfinder.DIRS_4;

    // A* 主循环
    while (openList.size > 0) {
      const current = openList.pop()!;
      current.closed = true;

      // 找到终点
      if (current.x === endX && current.y === endY) {
        return this.backtrace(current);
      }

      // 遍历邻居
      for (let i = 0; i < dirs.length; i++) {
        const [dx, dy] = dirs[i];
        const nx = current.x + dx;
        const ny = current.y + dy;

        // 检查边界和可通行性
        if (!grid.isWalkable(nx, ny)) continue;

        const neighbor = getSearchNode(nx, ny);
        if (!neighbor || neighbor.closed) continue;

        // 对角线移动：检查角落
        if (this.options.allowDiagonal && this.options.dontCrossCorners) {
          if (dx !== 0 && dy !== 0) {
            // 对角线移动需要相邻两格都可通行
            if (
              !grid.isWalkable(current.x + dx, current.y) ||
              !grid.isWalkable(current.x, current.y + dy)
            ) {
              continue;
            }
          }
        }

        // 计算移动成本
        const isDiagonal = dx !== 0 && dy !== 0;
        const moveCost = isDiagonal ? Math.SQRT2 : 1;
        const gridNode = grid.getNode(nx, ny)!;
        const ng = current.g + moveCost * gridNode.weight;

        // 如果新路径更好或节点未被访问
        if (!neighbor.opened || ng < neighbor.g) {
          neighbor.g = ng;
          neighbor.h = heuristic(nx, ny, endX, endY) * weight;
          neighbor.f = neighbor.g + neighbor.h;
          neighbor.parent = current;

          if (!neighbor.opened) {
            neighbor.opened = true;
            openList.push(neighbor);
          } else {
            openList.update(neighbor);
          }
        }
      }
    }

    // 没找到路径
    return [];
  }

  /**
   * 回溯路径
   */
  private backtrace(node: SearchNode): PathPoint[] {
    const path: PathPoint[] = [];
    let current: SearchNode | null = node;
    while (current) {
      path.unshift({ x: current.x, y: current.y });
      current = current.parent;
    }
    return path;
  }

  /**
   * 获取启发式函数
   */
  private getHeuristicFn(): (x1: number, y1: number, x2: number, y2: number) => number {
    switch (this.options.heuristic) {
      case 'euclidean':
        return (x1, y1, x2, y2) => {
          const dx = Math.abs(x2 - x1);
          const dy = Math.abs(y2 - y1);
          return Math.sqrt(dx * dx + dy * dy);
        };
      case 'chebyshev':
        return (x1, y1, x2, y2) => Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
      case 'octile':
        return (x1, y1, x2, y2) => {
          const dx = Math.abs(x2 - x1);
          const dy = Math.abs(y2 - y1);
          return dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy);
        };
      default:
        // manhattan 或其他未指定的情况
        return (x1, y1, x2, y2) => Math.abs(x2 - x1) + Math.abs(y2 - y1);
    }
  }

  /**
   * 平滑路径（移除不必要的中间点）
   */
  smoothPath(path: PathPoint[], grid: PathGrid): PathPoint[] {
    if (path.length <= 2) return path;

    const result: PathPoint[] = [path[0]];
    let anchor = 0;

    for (let i = 2; i < path.length; i++) {
      // 检查从锚点到当前点是否有障碍
      if (!this.hasLineOfSight(path[anchor], path[i], grid)) {
        result.push(path[i - 1]);
        anchor = i - 1;
      }
    }

    result.push(path[path.length - 1]);
    return result;
  }

  /**
   * 检查两点之间是否有视线（使用 Bresenham 算法）
   */
  private hasLineOfSight(p1: PathPoint, p2: PathPoint, grid: PathGrid): boolean {
    let x0 = p1.x;
    let y0 = p1.y;
    const x1 = p2.x;
    const y1 = p2.y;

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      if (!grid.isWalkable(x0, y0)) return false;
      if (x0 === x1 && y0 === y1) return true;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
  }
}

/**
 * 将世界坐标转换为网格坐标
 */
export function worldToGrid(
  worldX: number,
  worldY: number,
  cellSize: number,
  offsetX = 0,
  offsetY = 0
): PathPoint {
  return {
    x: Math.floor((worldX - offsetX) / cellSize),
    y: Math.floor((worldY - offsetY) / cellSize),
  };
}

/**
 * 将网格坐标转换为世界坐标（格子中心）
 */
export function gridToWorld(
  gridX: number,
  gridY: number,
  cellSize: number,
  offsetX = 0,
  offsetY = 0
): PathPoint {
  return {
    x: gridX * cellSize + cellSize / 2 + offsetX,
    y: gridY * cellSize + cellSize / 2 + offsetY,
  };
}
