/**
 * UI 滑块组件
 */

import { UIElement, type UIElementProps } from './UIElement';
import { getNavigationManager } from './UINavigationManager';

/** 滑块属性 */
export interface UISliderProps extends UIElementProps {
  value?: number;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  showValue?: boolean;
  fontSize?: number;
  fontFamily?: string;
  textColor?: string;
  trackHeight?: number;
  trackColor?: string;
  fillColor?: string;
  thumbSize?: number;
  thumbColor?: string;
  spacing?: number;
  onChange?: (value: number) => void;
  /** 是否自动注册到导航系统 */
  autoRegisterNavigation?: boolean;
}

/**
 * UI 滑块
 */
export class UISlider extends UIElement {
  value = 0;
  min = 0;
  max = 100;
  step = 1;
  label = '';
  showValue = true;
  fontSize = 16;
  fontFamily = 'sans-serif';
  textColor = '#ffffff';
  trackHeight = 6;
  trackColor = '#333333';
  fillColor = '#4a90d9';
  thumbSize = 18;
  thumbColor = '#ffffff';
  spacing = 8;
  onChange?: (value: number) => void;

  /** 导航焦点状态 */
  private navFocused = false;
  /** 焦点动画进度 */
  private focusAnim = 0;
  /** 是否正在拖动 */
  private dragging = false;
  /** 是否启用 */
  enabled = true;
  /** 是否自动注册到导航 */
  private autoRegisterNavigation = true;
  /** 是否已注册 */
  private _registered = false;

  constructor(props: UISliderProps = {}) {
    super(props);
    Object.assign(this, props);

    // 确保值在范围内
    this.value = Math.max(this.min, Math.min(this.max, this.value));

    // 自动计算尺寸
    if (!this.width) {
      this.width = 200;
    }
    if (!this.height) {
      this.height = Math.max(this.thumbSize, this.fontSize);
    }

    // 自动注册到全局导航管理器
    if (this.autoRegisterNavigation) {
      getNavigationManager().register(this);
      this._registered = true;
    }
  }

  /**
   * 设置值
   */
  setValue(value: number): this {
    const newValue = Math.max(this.min, Math.min(this.max, value));
    // 应用步进
    const steppedValue = Math.round((newValue - this.min) / this.step) * this.step + this.min;

    if (this.value !== steppedValue) {
      this.value = steppedValue;
      this.onChange?.(this.value);
    }
    return this;
  }

  /**
   * 根据 x 坐标设置值
   */
  private setValueByPosition(x: number): void {
    const pos = this.getGlobalPosition();
    const trackWidth = this.getTrackWidth();
    const trackX = this.getTrackX();

    const relativeX = x - (pos.x + trackX);
    const ratio = Math.max(0, Math.min(1, relativeX / trackWidth));
    const newValue = this.min + ratio * (this.max - this.min);
    this.setValue(newValue);
  }

  /**
   * 获取轨道宽度
   */
  private getTrackWidth(): number {
    let availableWidth = this.width;

    // 减去标签宽度
    if (this.label) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.font = `${this.fontSize}px ${this.fontFamily}`;
        availableWidth -= ctx.measureText(this.label).width + this.spacing;
      }
    }

    // 减去数值显示宽度
    if (this.showValue) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.font = `${this.fontSize}px ${this.fontFamily}`;
        const valueText = this.value.toFixed(this.step < 1 ? 1 : 0);
        availableWidth -= ctx.measureText(valueText).width + this.spacing;
      }
    }

    return availableWidth;
  }

  /**
   * 获取轨道 X 偏移
   */
  private getTrackX(): number {
    if (this.label) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.font = `${this.fontSize}px ${this.fontFamily}`;
        return ctx.measureText(this.label).width + this.spacing;
      }
    }
    return 0;
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
   * 处理点击/拖动
   */
  handleClick(x: number, y: number, pressed = false): boolean {
    if (!this.visible || !this.enabled) return false;

    const pos = this.getGlobalPosition();
    const trackX = pos.x + this.getTrackX();
    const trackWidth = this.getTrackWidth();
    const trackY = pos.y + (this.height - this.trackHeight) / 2;

    // 检查是否点击在轨道区域
    const inTrack =
      x >= trackX &&
      x <= trackX + trackWidth &&
      y >= trackY - this.thumbSize / 2 &&
      y <= trackY + this.trackHeight + this.thumbSize / 2;

    if (pressed && inTrack) {
      this.dragging = true;
      this.setValueByPosition(x);
      return true;
    } else if (!pressed) {
      this.dragging = false;
    }

    if (this.dragging) {
      this.setValueByPosition(x);
      return true;
    }

    return false;
  }

  /**
   * 处理鼠标拖动
   */
  handleDrag(x: number, _y: number): void {
    if (this.dragging && this.enabled) {
      this.setValueByPosition(x);
    }
  }

  /**
   * 触发点击（用于导航系统）- 增加/减少值
   */
  onClick(): void {
    // 导航系统确认键：增加一步
    const newValue = Math.min(this.max, this.value + this.step * 10);
    this.setValue(newValue);
  }

  /**
   * 导航系统方向键处理
   */
  navigate(direction: 'left' | 'right'): void {
    if (!this.enabled) return;

    if (direction === 'left') {
      const newValue = Math.max(this.min, this.value - this.step);
      this.setValue(newValue);
    } else if (direction === 'right') {
      const newValue = Math.min(this.max, this.value + this.step);
      this.setValue(newValue);
    }
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

    // 绘制标签
    let currentX = pos.x;
    if (this.label) {
      ctx.fillStyle = this.enabled ? this.textColor : 'rgba(255, 255, 255, 0.5)';
      ctx.font = `${this.fontSize}px ${this.fontFamily}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.label, currentX, pos.y + this.height / 2);
      currentX += ctx.measureText(this.label).width + this.spacing;
    }

    // 计算轨道位置和宽度
    const trackWidth = this.getTrackWidth();
    const trackY = pos.y + (this.height - this.trackHeight) / 2;

    // 绘制轨道背景
    ctx.fillStyle = this.trackColor;
    ctx.fillRect(currentX, trackY, trackWidth, this.trackHeight);

    // 绘制已填充部分
    const ratio = (this.value - this.min) / (this.max - this.min);
    const fillWidth = trackWidth * ratio;
    ctx.fillStyle = this.fillColor;
    ctx.fillRect(currentX, trackY, fillWidth, this.trackHeight);

    // 绘制滑块
    const thumbX = currentX + fillWidth;
    const thumbY = pos.y + this.height / 2;
    ctx.fillStyle = this.enabled ? this.thumbColor : '#555555';
    ctx.beginPath();
    ctx.arc(thumbX, thumbY, this.thumbSize / 2, 0, Math.PI * 2);
    ctx.fill();

    // 绘制滑块边框
    ctx.strokeStyle = this.fillColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(thumbX, thumbY, this.thumbSize / 2, 0, Math.PI * 2);
    ctx.stroke();

    // 重置阴影
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // 绘制数值
    if (this.showValue) {
      const valueText = this.value.toFixed(this.step < 1 ? 1 : 0);
      ctx.fillStyle = this.enabled ? this.textColor : 'rgba(255, 255, 255, 0.5)';
      ctx.font = `${this.fontSize}px ${this.fontFamily}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(valueText, pos.x + this.width, pos.y + this.height / 2);
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
