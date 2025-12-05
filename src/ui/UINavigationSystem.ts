/**
 * UI 导航系统
 * 支持方向键、摇杆在 UI 元素（如按钮）间导航
 * 提供类似 iPad 的焦点视觉效果
 */

import { System } from '../core/System';
import { SystemPhase } from '../core/SystemPhase';
import { InputSystem } from '../systems/InputSystem';

/** 可导航的 UI 元素接口 */
export interface INavigable {
  /** 设置焦点状态 */
  setFocused(focused: boolean): void;
  /** 获取焦点状态 */
  isFocused(): boolean;
  /** 获取元素位置和尺寸 */
  getBounds(): { x: number; y: number; width: number; height: number };
  /** 是否可见且可交互 */
  visible: boolean;
  enabled?: boolean;
  /** 触发点击 */
  onClick?: () => void;
}

/** 导航方向 */
type Direction = 'up' | 'down' | 'left' | 'right';

/**
 * UI 导航系统
 * 在场景中使用：scene.addSystem(new UINavigationSystem())
 */
export class UINavigationSystem extends System {
  static phase = SystemPhase.PostUpdate; // 后期执行：UI 导航

  private inputSystem: InputSystem | null = null;
  private navigables: INavigable[] = [];
  private currentIndex = -1;

  /** 导航重复延迟（毫秒） */
  repeatDelay = 150;
  private lastNavTime = 0;

  /** 摇杆死区 */
  axisThreshold = 0.5;
  private lastAxisX = 0;
  private lastAxisY = 0;

  /** 是否自动聚焦第一个元素 */
  autoFocus = true;

  onCreate(): void {
    this.inputSystem = this.engine.system(InputSystem);
  }

  /**
   * 注册可导航元素
   */
  register(element: INavigable): void {
    if (!this.navigables.includes(element)) {
      this.navigables.push(element);

      // 自动聚焦第一个元素
      if (this.autoFocus && this.navigables.length === 1 && this.currentIndex === -1) {
        this.setFocus(0);
      }
    }
  }

  /**
   * 取消注册可导航元素
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
   * 清空所有注册的元素
   */
  clear(): void {
    for (const nav of this.navigables) {
      nav.setFocused(false);
    }
    this.navigables.length = 0;
    this.currentIndex = -1;
  }

  /**
   * 设置焦点到指定索引
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
   * 设置焦点到指定元素
   */
  setFocusElement(element: INavigable): void {
    const index = this.navigables.indexOf(element);
    if (index !== -1) {
      this.setFocus(index);
    }
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
   * 移动焦点到指定方向
   */
  navigate(direction: Direction): void {
    if (this.navigables.length === 0) return;

    // 如果没有焦点，聚焦第一个
    if (this.currentIndex === -1) {
      this.setFocus(0);
      return;
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

      // 计算方向向量
      const dx = center.x - currentCenter.x;
      const dy = center.y - currentCenter.y;

      // 检查是否在正确的方向
      let inDirection = false;
      let primaryDist = 0;
      let secondaryDist = 0;

      switch (direction) {
        case 'up':
          inDirection = dy < -10; // 至少向上 10 像素
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

      // 计算分数：主方向距离 + 次方向距离的一半
      const score = primaryDist + secondaryDist * 0.5;

      if (score < bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    // 如果找到了，切换焦点
    if (bestIndex !== -1) {
      this.setFocus(bestIndex);
      this.lastNavTime = Date.now();
    }
  }

  /**
   * 触发当前焦点元素的点击事件
   */
  confirm(): void {
    const focused = this.getFocused();
    if (focused?.onClick) {
      focused.onClick();
    }
  }

  onUpdate(_dt: number): void {
    if (!this.inputSystem || this.navigables.length === 0) return;

    const now = Date.now();
    const canNavigate = now - this.lastNavTime >= this.repeatDelay;

    // 检查方向键 / D-Pad
    if (canNavigate) {
      if (this.inputSystem.isPressed('dpadUp') || this.inputSystem.isPressed('up')) {
        this.navigate('up');
      } else if (this.inputSystem.isPressed('dpadDown') || this.inputSystem.isPressed('down')) {
        this.navigate('down');
      } else if (this.inputSystem.isPressed('dpadLeft') || this.inputSystem.isPressed('left')) {
        this.navigate('left');
      } else if (this.inputSystem.isPressed('dpadRight') || this.inputSystem.isPressed('right')) {
        this.navigate('right');
      }
    }

    // 检查左摇杆（使用阈值检测方向切换）
    if (canNavigate) {
      const axisX = this.inputSystem.axisX();
      const axisY = this.inputSystem.axisY();

      // 检测从中立位置到倾斜的变化（边缘触发）
      const wasNeutralX = Math.abs(this.lastAxisX) < this.axisThreshold;
      const wasNeutralY = Math.abs(this.lastAxisY) < this.axisThreshold;

      if (wasNeutralX && axisX > this.axisThreshold) {
        this.navigate('right');
      } else if (wasNeutralX && axisX < -this.axisThreshold) {
        this.navigate('left');
      }

      if (wasNeutralY && axisY > this.axisThreshold) {
        this.navigate('down');
      } else if (wasNeutralY && axisY < -this.axisThreshold) {
        this.navigate('up');
      }

      this.lastAxisX = axisX;
      this.lastAxisY = axisY;
    }

    // 检查确认按钮（A 键 / Enter / Space）
    if (this.inputSystem.isPressed('confirm')) {
      this.confirm();
    }
  }
}
