/**
 * UI 导航管理器（全局单例）
 * 自动管理所有可导航元素，无需手动注册
 */

import type { INavigable } from './UINavigationSystem';

/** 导航作用域（用于场景隔离） */
export class NavigationScope {
  private navigables: INavigable[] = [];
  private currentIndex = -1;

  /** 是否启用此作用域 */
  enabled = true;

  /**
   * 注册可导航元素
   */
  register(element: INavigable): void {
    if (!this.navigables.includes(element)) {
      this.navigables.push(element);

      // 如果是第一个元素，自动聚焦
      if (this.navigables.length === 1 && this.currentIndex === -1) {
        this.setFocus(0);
      }
    }
  }

  /**
   * 取消注册
   */
  unregister(element: INavigable): void {
    const index = this.navigables.indexOf(element);
    if (index !== -1) {
      if (index === this.currentIndex) {
        element.setFocused(false);
        this.currentIndex = -1;
      }
      this.navigables.splice(index, 1);
    }
  }

  /**
   * 清空所有元素
   */
  clear(): void {
    for (const nav of this.navigables) {
      nav.setFocused(false);
    }
    this.navigables.length = 0;
    this.currentIndex = -1;
  }

  /**
   * 设置焦点
   */
  setFocus(index: number): void {
    if (index < 0 || index >= this.navigables.length) return;

    // 移除旧焦点
    if (this.currentIndex >= 0 && this.currentIndex < this.navigables.length) {
      this.navigables[this.currentIndex].setFocused(false);
    }

    // 设置新焦点
    this.currentIndex = index;
    this.navigables[index].setFocused(true);
  }

  /**
   * 获取当前焦点元素
   */
  getFocused(): INavigable | null {
    if (this.currentIndex >= 0 && this.currentIndex < this.navigables.length) {
      return this.navigables[this.currentIndex];
    }
    return null;
  }

  /**
   * 获取所有可导航元素
   */
  getNavigables(): INavigable[] {
    return this.navigables;
  }

  /**
   * 导航到指定方向
   */
  navigate(direction: 'up' | 'down' | 'left' | 'right'): boolean {
    if (!this.enabled || this.navigables.length === 0) return false;

    // 如果没有焦点，聚焦第一个
    if (this.currentIndex === -1) {
      this.setFocus(0);
      return true;
    }

    const current = this.navigables[this.currentIndex];
    const currentBounds = current.getBounds();
    const currentCenter = {
      x: currentBounds.x + currentBounds.width / 2,
      y: currentBounds.y + currentBounds.height / 2,
    };

    // 找到指定方向最近的可用元素
    let bestIndex = -1;
    let bestScore = Infinity;

    for (let i = 0; i < this.navigables.length; i++) {
      if (i === this.currentIndex) continue;

      const nav = this.navigables[i];
      if (!nav.visible || (nav.enabled !== undefined && !nav.enabled)) continue;

      const bounds = nav.getBounds();
      const center = {
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2,
      };

      const dx = center.x - currentCenter.x;
      const dy = center.y - currentCenter.y;

      let inDirection = false;
      let primaryDist = 0;
      let secondaryDist = 0;

      switch (direction) {
        case 'up':
          inDirection = dy < -10;
          primaryDist = -dy;
          secondaryDist = Math.abs(dx);
          break;
        case 'down':
          inDirection = dy > 10;
          primaryDist = dy;
          secondaryDist = Math.abs(dx);
          break;
        case 'left':
          inDirection = dx < -10;
          primaryDist = -dx;
          secondaryDist = Math.abs(dy);
          break;
        case 'right':
          inDirection = dx > 10;
          primaryDist = dx;
          secondaryDist = Math.abs(dy);
          break;
      }

      if (!inDirection) continue;

      const score = primaryDist + secondaryDist * 0.5;
      if (score < bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    if (bestIndex !== -1) {
      this.setFocus(bestIndex);
      return true;
    }

    return false;
  }

  /**
   * 触发确认
   */
  confirm(): void {
    const focused = this.getFocused();
    if (focused?.onClick) {
      focused.onClick();
    }
  }
}

/**
 * 全局 UI 导航管理器（单例）
 */
export class UINavigationManager {
  private static instance: UINavigationManager | null = null;

  /** 全局作用域 */
  private globalScope = new NavigationScope();

  /** 场景作用域映射 */
  private sceneScopes = new Map<string, NavigationScope>();

  /** 当前活动场景 ID */
  private currentSceneId: string | null = null;

  /** 是否启用全局导航 */
  enabled = true;

  private constructor() {
    // 私有构造函数，防止外部实例化
  }

  /**
   * 获取单例实例
   */
  static getInstance(): UINavigationManager {
    if (!UINavigationManager.instance) {
      UINavigationManager.instance = new UINavigationManager();
    }
    return UINavigationManager.instance;
  }

  /**
   * 注册元素到当前活动作用域
   */
  register(element: INavigable, sceneId?: string): void {
    const scope = this.getActiveScope(sceneId);
    scope.register(element);
  }

  /**
   * 取消注册元素
   */
  unregister(element: INavigable, sceneId?: string): void {
    const scope = this.getActiveScope(sceneId);
    scope.unregister(element);
  }

  /**
   * 设置当前场景
   */
  setCurrentScene(sceneId: string | null): void {
    this.currentSceneId = sceneId;

    // 创建场景作用域（如果不存在）
    if (sceneId && !this.sceneScopes.has(sceneId)) {
      this.sceneScopes.set(sceneId, new NavigationScope());
    }
  }

  /**
   * 清理场景作用域
   */
  clearScene(sceneId: string): void {
    const scope = this.sceneScopes.get(sceneId);
    if (scope) {
      scope.clear();
      this.sceneScopes.delete(sceneId);
    }
  }

  /**
   * 获取活动作用域
   */
  private getActiveScope(sceneId?: string): NavigationScope {
    const targetSceneId = sceneId ?? this.currentSceneId;

    if (targetSceneId) {
      let scope = this.sceneScopes.get(targetSceneId);
      if (!scope) {
        scope = new NavigationScope();
        this.sceneScopes.set(targetSceneId, scope);
      }
      return scope;
    }

    return this.globalScope;
  }

  /**
   * 导航
   */
  navigate(direction: 'up' | 'down' | 'left' | 'right'): boolean {
    if (!this.enabled) return false;
    const scope = this.getActiveScope();
    return scope.navigate(direction);
  }

  /**
   * 确认
   */
  confirm(): void {
    if (!this.enabled) return;
    const scope = this.getActiveScope();
    scope.confirm();
  }

  /**
   * 获取当前焦点元素
   */
  getFocused(): INavigable | null {
    const scope = this.getActiveScope();
    return scope.getFocused();
  }

  /**
   * 手动设置焦点
   */
  setFocus(element: INavigable): void {
    const scope = this.getActiveScope();
    const navigables = scope.getNavigables();
    const index = navigables.indexOf(element);
    if (index !== -1) {
      scope.setFocus(index);
    }
  }

  /**
   * 重置管理器（用于测试）
   */
  reset(): void {
    this.globalScope.clear();
    for (const scope of this.sceneScopes.values()) {
      scope.clear();
    }
    this.sceneScopes.clear();
    this.currentSceneId = null;
  }
}

/**
 * 获取全局导航管理器实例（便捷方法）
 */
export function getNavigationManager(): UINavigationManager {
  return UINavigationManager.getInstance();
}
