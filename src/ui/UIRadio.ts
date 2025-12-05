/**
 * UI 单选框组件
 */

import { UIElement, type UIElementProps } from './UIElement';
import { getNavigationManager } from './UINavigationManager';

/** 单选框属性 */
export interface UIRadioProps extends UIElementProps {
  checked?: boolean;
  label?: string;
  group?: string; // 单选组名称
  fontSize?: number;
  fontFamily?: string;
  textColor?: string;
  circleSize?: number;
  circleColor?: string;
  checkColor?: string;
  borderColor?: string;
  borderWidth?: number;
  spacing?: number;
  onChange?: (checked: boolean) => void;
  /** 是否自动注册到导航系统 */
  autoRegisterNavigation?: boolean;
}

// 全局单选组管理
const radioGroups: Map<string, UIRadio[]> = new Map();

/**
 * UI 单选框
 */
export class UIRadio extends UIElement {
  checked = false;
  label = '';
  group = 'default';
  fontSize = 16;
  fontFamily = 'sans-serif';
  textColor = '#ffffff';
  circleSize = 20;
  circleColor = '#333333';
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

  constructor(props: UIRadioProps = {}) {
    super(props);
    Object.assign(this, props);

    // 自动计算尺寸
    if (!this.width) {
      this.width = this.circleSize;
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
      this.height = Math.max(this.circleSize, this.fontSize);
    }

    // 注册到单选组
    this.registerToGroup();

    // 自动注册到全局导航管理器
    if (this.autoRegisterNavigation) {
      getNavigationManager().register(this);
      this._registered = true;
    }
  }

  /**
   * 注册到单选组
   */
  private registerToGroup(): void {
    if (!radioGroups.has(this.group)) {
      radioGroups.set(this.group, []);
    }
    radioGroups.get(this.group)!.push(this);
  }

  /**
   * 从单选组移除
   */
  private unregisterFromGroup(): void {
    const group = radioGroups.get(this.group);
    if (group) {
      const index = group.indexOf(this);
      if (index !== -1) {
        group.splice(index, 1);
      }
    }
  }

  /**
   * 选中此单选框（取消同组其他单选框）
   */
  select(): this {
    if (!this.enabled || this.checked) return this;

    // 取消同组其他单选框
    const group = radioGroups.get(this.group);
    if (group) {
      group.forEach((radio) => {
        if (radio !== this && radio.checked) {
          radio.checked = false;
          radio.onChange?.(false);
        }
      });
    }

    this.checked = true;
    this.onChange?.(true);
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
      this.select();
      return true;
    }
    return false;
  }

  /**
   * 触发点击（用于导航系统）
   */
  onClick(): void {
    this.select();
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

    // 计算圆形位置（垂直居中）
    const circleY = pos.y + this.height / 2;
    const circleX = pos.x + this.circleSize / 2;
    const radius = this.circleSize / 2;

    // 绘制圆形背景
    ctx.fillStyle = this.circleColor;
    ctx.beginPath();
    ctx.arc(circleX, circleY, radius, 0, Math.PI * 2);
    ctx.fill();

    // 绘制边框
    ctx.strokeStyle = this.checked ? this.checkColor : this.borderColor;
    ctx.lineWidth = this.borderWidth;
    ctx.beginPath();
    ctx.arc(circleX, circleY, radius, 0, Math.PI * 2);
    ctx.stroke();

    // 绘制选中标记（内圆）
    if (this.checked) {
      ctx.fillStyle = this.checkColor;
      ctx.beginPath();
      ctx.arc(circleX, circleY, radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
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
      ctx.fillText(this.label, pos.x + this.circleSize + this.spacing, circleY);
    }

    ctx.restore();
  }

  destroy(): void {
    // 从单选组移除
    this.unregisterFromGroup();

    // 从导航系统中移除
    if (this._registered) {
      getNavigationManager().unregister(this);
      this._registered = false;
    }
  }
}
