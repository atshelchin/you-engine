/**
 * UI 按钮元素
 * 支持普通、悬停、按下三种状态
 */

import { UIElement, type UIElementProps } from './UIElement';
import { getNavigationManager } from './UINavigationManager';

/** 按钮状态 */
export type ButtonState = 'normal' | 'hover' | 'pressed' | 'disabled' | 'focused';

/** 按钮样式 */
export interface ButtonStyle {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  textColor?: string;
}

/** 按钮属性 */
export interface UIButtonProps extends UIElementProps {
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  borderRadius?: number;
  padding?: number;
  normal?: ButtonStyle;
  hover?: ButtonStyle;
  pressed?: ButtonStyle;
  disabled?: ButtonStyle;
  focused?: ButtonStyle;
  onClick?: () => void;
  /** iPad 风格焦点效果 */
  focusStyle?: 'outline' | 'glow' | 'scale';
  /** 焦点动画时长 */
  focusAnimDuration?: number;
  /** 是否自动注册到导航系统 */
  autoRegisterNavigation?: boolean;
}

/**
 * UI 按钮
 */
export class UIButton extends UIElement {
  text = '';
  fontSize = 16;
  fontFamily = 'sans-serif';
  borderRadius = 4;
  padding = 10;

  normal: ButtonStyle = {
    backgroundColor: '#4a90d9',
    borderColor: '#3a7bc8',
    borderWidth: 2,
    textColor: '#ffffff',
  };
  hover: ButtonStyle = {
    backgroundColor: '#5aa0e9',
    borderColor: '#4a90d9',
    borderWidth: 2,
    textColor: '#ffffff',
  };
  pressed: ButtonStyle = {
    backgroundColor: '#3a7bc8',
    borderColor: '#2a6bb8',
    borderWidth: 2,
    textColor: '#ffffff',
  };
  disabled: ButtonStyle = {
    backgroundColor: '#666666',
    borderColor: '#555555',
    borderWidth: 2,
    textColor: '#999999',
  };
  focused: ButtonStyle = {
    backgroundColor: '#4a90d9',
    borderColor: '#ffffff',
    borderWidth: 3,
    textColor: '#ffffff',
  };

  state: ButtonState = 'normal';
  onClick?: () => void;

  private isEnabled = true;
  private isFocusedState = false;

  /** 焦点视觉效果类型 */
  focusStyle: 'outline' | 'glow' | 'scale' = 'glow';
  /** 焦点动画进度 (0-1) */
  private focusAnim = 0;
  /** 焦点动画时长（毫秒） */
  focusAnimDuration = 200;
  /** 是否自动注册到导航 */
  private autoRegisterNavigation = true;
  /** 是否已注册 */
  private _registered = false;

  constructor(props: UIButtonProps = {}) {
    super(props);
    Object.assign(this, props);

    // 自动计算尺寸
    if (!props.width || !props.height) {
      this.autoSize();
    }

    // 自动注册到全局导航管理器
    if (this.autoRegisterNavigation) {
      getNavigationManager().register(this);
      this._registered = true;
    }
  }

  /**
   * 自动计算尺寸
   */
  private autoSize(): void {
    // 创建临时 canvas 来测量文本
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    ctx.font = `${this.fontSize}px ${this.fontFamily}`;
    const metrics = ctx.measureText(this.text);
    if (!this.width) this.width = metrics.width + this.padding * 2;
    if (!this.height) this.height = this.fontSize + this.padding * 2;
  }

  /**
   * 设置文本
   */
  setText(text: string): this {
    this.text = text;
    return this;
  }

  /**
   * 启用/禁用按钮
   */
  setEnabled(enabled: boolean): this {
    this.isEnabled = enabled;
    this.state = enabled ? 'normal' : 'disabled';
    return this;
  }

  /**
   * 检查是否启用
   */
  get enabled(): boolean {
    return this.isEnabled;
  }

  /**
   * 设置焦点状态（用于导航系统）
   */
  setFocused(focused: boolean): this {
    this.isFocusedState = focused;
    return this;
  }

  /**
   * 获取焦点状态
   */
  isFocused(): boolean {
    return this.isFocusedState;
  }

  /**
   * 处理鼠标/触摸输入
   */
  handleInput(x: number, y: number, isDown: boolean, wasDown: boolean): boolean {
    if (!this.visible || !this.isEnabled) return false;

    const contains = this.containsPoint(x, y);

    if (contains) {
      if (isDown) {
        this.state = 'pressed';
      } else if (wasDown && this.state === 'pressed') {
        // 点击完成
        this.state = this.isFocusedState ? 'focused' : 'hover';
        this.onClick?.();
        return true;
      } else {
        this.state = this.isFocusedState ? 'focused' : 'hover';
      }
    } else {
      this.state = this.isFocusedState ? 'focused' : 'normal';
    }

    return false;
  }

  update(dt: number): void {
    super.update(dt);

    // 焦点动画
    const targetFocus = this.isFocusedState ? 1 : 0;
    const animSpeed = dt / this.focusAnimDuration;

    if (this.focusAnim < targetFocus) {
      this.focusAnim = Math.min(1, this.focusAnim + animSpeed);
    } else if (this.focusAnim > targetFocus) {
      this.focusAnim = Math.max(0, this.focusAnim - animSpeed);
    }

    // 更新状态
    if (this.isFocusedState && this.state === 'normal') {
      this.state = 'focused';
    } else if (!this.isFocusedState && this.state === 'focused') {
      this.state = 'normal';
    }
  }

  /**
   * 获取当前样式
   */
  private getCurrentStyle(): ButtonStyle {
    switch (this.state) {
      case 'hover':
        return this.hover;
      case 'pressed':
        return this.pressed;
      case 'disabled':
        return this.disabled;
      case 'focused':
        return this.focused;
      default:
        return this.normal;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    const pos = this.getGlobalPosition();
    const style = this.getCurrentStyle();

    ctx.save();

    // iPad 风格焦点效果
    if (this.focusAnim > 0) {
      const padding = 8 * this.focusAnim;

      if (this.focusStyle === 'glow') {
        // 发光效果
        ctx.shadowColor = `rgba(74, 144, 217, ${this.focusAnim})`;
        ctx.shadowBlur = 20 * this.focusAnim;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      } else if (this.focusStyle === 'outline') {
        // 外轮廓效果
        ctx.strokeStyle = `rgba(74, 144, 217, ${this.focusAnim})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        this.roundRect(
          ctx,
          pos.x - padding,
          pos.y - padding,
          this.width + padding * 2,
          this.height + padding * 2,
          this.borderRadius + padding
        );
        ctx.stroke();
      } else if (this.focusStyle === 'scale') {
        // 缩放效果
        const scale = 1 + 0.05 * this.focusAnim;
        ctx.translate(pos.x + this.width / 2, pos.y + this.height / 2);
        ctx.scale(scale, scale);
        ctx.translate(-(pos.x + this.width / 2), -(pos.y + this.height / 2));
      }
    }

    // 绘制背景
    ctx.beginPath();
    this.roundRect(ctx, pos.x, pos.y, this.width, this.height, this.borderRadius);

    if (style.backgroundColor) {
      ctx.fillStyle = style.backgroundColor;
      ctx.fill();
    }

    if (style.borderColor && style.borderWidth) {
      ctx.strokeStyle = style.borderColor;
      ctx.lineWidth = style.borderWidth;
      ctx.stroke();
    }

    // 绘制文本
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.font = `${this.fontSize}px ${this.fontFamily}`;
    ctx.fillStyle = style.textColor ?? '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.text, pos.x + this.width / 2, pos.y + this.height / 2);

    ctx.restore();
  }

  /**
   * 销毁按钮（从导航系统中移除）
   */
  destroy(): void {
    if (this._registered) {
      getNavigationManager().unregister(this);
      this._registered = false;
    }
  }

  /**
   * 绘制圆角矩形路径
   */
  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    r = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
}
