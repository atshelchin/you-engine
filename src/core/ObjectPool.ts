/**
 * 高性能对象池
 * 用于复用频繁创建/销毁的对象（如粒子、子弹）
 */

export interface ObjectPoolOptions<T> {
  /** 创建新对象的工厂函数 */
  create: () => T;
  /** 重置对象的函数 */
  reset?: (obj: T) => void;
  /** 初始池大小 */
  initialSize?: number;
  /** 最大池大小（防止内存泄漏） */
  maxSize?: number;
}

export class ObjectPool<T> {
  private pool: T[] = [];
  private activeObjects = new Set<T>();
  private createFn: () => T;
  private resetFn?: (obj: T) => void;
  private maxSize: number;

  constructor(createOrOptions: (() => T) | ObjectPoolOptions<T>) {
    if (typeof createOrOptions === 'function') {
      this.createFn = createOrOptions;
      this.maxSize = 1000;
    } else {
      this.createFn = createOrOptions.create;
      this.resetFn = createOrOptions.reset;
      this.maxSize = createOrOptions.maxSize ?? 1000;

      // 预创建对象
      const initialSize = createOrOptions.initialSize ?? 0;
      for (let i = 0; i < initialSize; i++) {
        const obj = this.createFn();
        this.pool.push(obj);
      }
    }
  }

  /**
   * 从池中获取对象
   */
  acquire(): T {
    let obj = this.pool.pop();

    if (!obj) {
      obj = this.createFn();
    }

    this.activeObjects.add(obj);
    return obj;
  }

  /**
   * 将对象归还池中
   */
  release(obj: T): void {
    if (!this.activeObjects.has(obj)) {
      return; // 对象不属于此池或已归还
    }

    this.activeObjects.delete(obj);

    // 重置对象
    if (this.resetFn) {
      this.resetFn(obj);
    }

    // 如果池未满，归还对象
    if (this.pool.length < this.maxSize) {
      this.pool.push(obj);
    }
  }

  /**
   * 释放所有活跃对象
   */
  releaseAll(): void {
    for (const obj of this.activeObjects) {
      this.release(obj);
    }
  }

  /**
   * 遍历所有活跃对象
   */
  forEach(callback: (obj: T) => void): void {
    for (const obj of this.activeObjects) {
      callback(obj);
    }
  }

  /**
   * 获取活跃对象数量
   */
  get activeCount(): number {
    return this.activeObjects.size;
  }

  /**
   * 获取池中可用对象数量
   */
  get availableCount(): number {
    return this.pool.length;
  }

  /**
   * 清空池
   */
  clear(): void {
    this.pool.length = 0;
    this.activeObjects.clear();
  }
}
