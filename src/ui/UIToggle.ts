/**
 * UI 开关组件（Switch）
 */

import { UIElement, type UIElementProps } from './UIElement';
import { getNavigationManager } from './UINavigationManager';

/** 开关属性 */
export interface UIToggleProps extends UIElementProps {
  checked?: boolean;
  label?: string;
  fontSize?: number;
  fontFamily?: string;
  textColor?: string;
  switchWidth?: number;
  switchHeight?: number;
  onColor?: string;
  offColor?: string;
  thumbColor?: string;
  spacing?: number;
  onChange?: (checked: boolean) => void;
  /** 是否自动注册到导航系统 */
  autoRegisterNavigation?: boolean;
}

/**
 * UI 开关（Switch）
 */
export class UIToggle extends UIElement {
  checked = false;
  label = '';
  fontSize = 16;
  fontFamily = 'sans-serif';
  textColor = '#ffffff';
  switchWidth = 50;
  switchHeight = 26;
  onColor = '#4a90d9';
  offColor = '#333333';
  thumbColor = '#ffffff';
  spacing = 8;
  onChange?: (checked: boolean) => void;

  /** 导航焦点状态 */
  private navFocused = false;
  /** 焦点动画进度 */
  private focusAnim = 0;
  /** 滑块动画进度 (0-1) */
  private thumbAnim = 0;
  /** 是否启用 */
  enabled = true;
  /** 是否自动注册到导航 */
  private autoRegisterNavigation = true;
  /** 是否已注册 */
  private _registered = false;

  constructor(props: UIToggleProps = {}) {
    super(props);
    Object.assign(this, props);

    // 初始化滑块位置
    this.thumbAnim = this.checked ? 1 : 0;

    // 自动计算尺寸
    if (!this.width) {
      this.width = this.switchWidth;
      if (this.label) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.font = `${this.fontSize}px ${this.fontFamily}`;
          this.width += this.spacing + ctx.measureText(this.label).width;
        }
      }
    }
    if (!this.height) {
      this.height = Math.max(this.switchHeight, this.fontSize);
    }

    // 自动注册到全局导航管理器
    if (this.autoRegisterNavigation) {
      getNavigationManager().register(this);
      this._registered = true;
    }
  }

  /**
   * 切换开关状态
   */
  toggle(): this {
    if (!this.enabled) return this;
    this.checked = !this.checked;
    this.onChange?.(this.checked);
    return this;
  }

  /**
   * 设置开关状态
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
    const focusSpeed = dt / 200;

    if (this.focusAnim < targetFocus) {
      this.focusAnim = Math.min(1, this.focusAnim + focusSpeed);
    } else if (this.focusAnim > targetFocus) {
      this.focusAnim = Math.max(0, this.focusAnim - focusSpeed);
    }

    // 滑块动画
    const targetThumb = this.checked ? 1 : 0;
    const thumbSpeed = dt / 150; // 150ms 动画

    if (this.thumbAnim < targetThumb) {
      this.thumbAnim = Math.min(1, this.thumbAnim + thumbSpeed);
    } else if (this.thumbAnim > targetThumb) {
      this.thumbAnim = Math.max(0, this.thumbAnim - thumbSpeed);
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

    // 计算开关位置（垂直居中）
    const switchY = pos.y + (this.height - this.switchHeight) / 2;

    // 绘制开关轨道（圆角矩形）
    const radius = this.switchHeight / 2;
    const bgColor = this.interpolateColor(this.offColor, this.onColor, this.thumbAnim);

    ctx.fillStyle = this.enabled ? bgColor : '#222222';
    ctx.beginPath();
    ctx.arc(pos.x + radius, switchY + radius, radius, Math.PI / 2, (Math.PI * 3) / 2);
    ctx.arc(
      pos.x + this.switchWidth - radius,
      switchY + radius,
      radius,
      (Math.PI * 3) / 2,
      Math.PI / 2
    );
    ctx.closePath();
    ctx.fill();

    // 绘制滑块（圆形）
    const thumbRadius = radius - 3;
    const thumbX = pos.x + radius + this.thumbAnim * (this.switchWidth - this.switchHeight);
    const thumbY = switchY + radius;

    ctx.fillStyle = this.enabled ? this.thumbColor : '#555555';
    ctx.beginPath();
    ctx.arc(thumbX, thumbY, thumbRadius, 0, Math.PI * 2);
    ctx.fill();

    // 重置阴影
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // 绘制标签文本
    if (this.label) {
      ctx.fillStyle = this.enabled ? this.textColor : 'rgba(255, 255, 255, 0.5)';
      ctx.font = `${this.fontSize}px ${this.fontFamily}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.label, pos.x + this.switchWidth + this.spacing, pos.y + this.height / 2);
    }

    ctx.restore();
  }

  /**
   * 颜色插值
   */
  private interpolateColor(color1: string, color2: string, t: number): string {
    // 简单的 RGB 插值
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);

    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);

    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * 十六进制转 RGB
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  }

  destroy(): void {
    // 从导航系统中移除
    if (this._registered) {
      getNavigationManager().unregister(this);
      this._registered = false;
    }
  }
}
