/**
 * UI 复选框组件
 */

import { UIElement, type UIElementProps } from './UIElement';
import { getNavigationManager } from './UINavigationManager';

/** 复选框属性 */
export interface UICheckboxProps extends UIElementProps {
  checked?: boolean;
  label?: string;
  fontSize?: number;
  fontFamily?: string;
  textColor?: string;
  boxSize?: number;
  boxColor?: string;
  checkColor?: string;
  borderColor?: string;
  borderWidth?: number;
  spacing?: number;
  onChange?: (checked: boolean) => void;
  /** 是否自动注册到导航系统 */
  autoRegisterNavigation?: boolean;
}

/**
 * UI 复选框
 */
export class UICheckbox extends UIElement {
  checked = false;
  label = '';
  fontSize = 16;
  fontFamily = 'sans-serif';
  textColor = '#ffffff';
  boxSize = 20;
  boxColor = '#333333';
  checkColor = '#4a90d9';
  borderColor = '#666666';
  borderWidth = 2;
  spacing = 8;
  onChange?: (checked: boolean) => void;

  /** 导航焦点状态 */
  private navFocused = false;
  /** 焦点动画进度 */
  private focusAnim = 0;
  /** 是否启用 */
  enabled = true;
  /** 是否自动注册到导航 */
  private autoRegisterNavigation = true;
  /** 是否已注册 */
  private _registered = false;

  constructor(props: UICheckboxProps = {}) {
    super(props);
    Object.assign(this, props);

    // 自动计算尺寸
    if (!this.width) {
      this.width = this.boxSize;
      if (this.label) {
        // 临时计算文本宽度
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.font = `${this.fontSize}px ${this.fontFamily}`;
          this.width += this.spacing + ctx.measureText(this.label).width;
        }
      }
    }
    if (!this.height) {
      this.height = Math.max(this.boxSize, this.fontSize);
    }

    // 自动注册到全局导航管理器
    if (this.autoRegisterNavigation) {
      getNavigationManager().register(this);
      this._registered = true;
    }
  }

  /**
   * 切换选中状态
   */
  toggle(): this {
    if (!this.enabled) return this;
    this.checked = !this.checked;
    this.onChange?.(this.checked);
    return this;
  }

  /**
   * 设置选中状态
   */
  setChecked(checked: boolean): this {
    if (this.checked !== checked) {
      this.checked = checked;
      this.onChange?.(this.checked);
    }
    return this;
  }

  /**
   * 设置导航焦点状态
   */
  setFocused(focused: boolean): this {
    this.navFocused = focused;
    return this;
  }

  /**
   * 获取导航焦点状态
   */
  isFocused(): boolean {
    return this.navFocused;
  }

  /**
   * 获取边界（用于导航系统）
   */
  getBounds(): { x: number; y: number; width: number; height: number } {
    const pos = this.getGlobalPosition();
    return {
      x: pos.x,
      y: pos.y,
      width: this.width,
      height: this.height,
    };
  }

  /**
   * 处理点击
   */
  handleClick(x: number, y: number): boolean {
    if (!this.visible || !this.enabled) return false;

    if (this.containsPoint(x, y)) {
      this.toggle();
      return true;
    }
    return false;
  }

  /**
   * 触发点击（用于导航系统）
   */
  onClick(): void {
    this.toggle();
  }

  update(dt: number): void {
    super.update(dt);

    // 焦点动画
    const targetFocus = this.navFocused ? 1 : 0;
    const animSpeed = dt / 200;

    if (this.focusAnim < targetFocus) {
      this.focusAnim = Math.min(1, this.focusAnim + animSpeed);
    } else if (this.focusAnim > targetFocus) {
      this.focusAnim = Math.max(0, this.focusAnim - animSpeed);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return;

    const pos = this.getGlobalPosition();

    ctx.save();

    // 导航焦点发光效果
    if (this.focusAnim > 0) {
      ctx.shadowColor = `rgba(74, 144, 217, ${this.focusAnim})`;
      ctx.shadowBlur = 15 * this.focusAnim;
    }

    // 计算复选框位置（垂直居中）
    const boxY = pos.y + (this.height - this.boxSize) / 2;

    // 绘制复选框背景
    ctx.fillStyle = this.boxColor;
    ctx.fillRect(pos.x, boxY, this.boxSize, this.boxSize);

    // 绘制边框
    ctx.strokeStyle = this.checked ? this.checkColor : this.borderColor;
    ctx.lineWidth = this.borderWidth;
    ctx.strokeRect(pos.x, boxY, this.boxSize, this.boxSize);

    // 绘制勾选标记
    if (this.checked) {
      ctx.strokeStyle = this.checkColor;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const padding = 4;
      ctx.beginPath();
      ctx.moveTo(pos.x + padding, boxY + this.boxSize / 2);
      ctx.lineTo(pos.x + this.boxSize / 2 - 1, boxY + this.boxSize - padding);
      ctx.lineTo(pos.x + this.boxSize - padding, boxY + padding);
      ctx.stroke();
    }

    // 重置阴影
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // 绘制标签文本
    if (this.label) {
      ctx.fillStyle = this.enabled ? this.textColor : 'rgba(255, 255, 255, 0.5)';
      ctx.font = `${this.fontSize}px ${this.fontFamily}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.label, pos.x + this.boxSize + this.spacing, pos.y + this.height / 2);
    }

    ctx.restore();
  }

  destroy(): void {
    // 从导航系统中移除
    if (this._registered) {
      getNavigationManager().unregister(this);
      this._registered = false;
    }
  }
}
