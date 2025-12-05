/**
 * UI 进度条元素
 */

import { UIElement, type UIElementProps } from './UIElement';

/** 进度条属性 */
export interface UIProgressBarProps extends UIElementProps {
  value?: number;
  maxValue?: number;
  backgroundColor?: string;
  fillColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  /** 填充方向 */
  direction?: 'horizontal' | 'vertical';
  /** 是否显示文本 */
  showText?: boolean;
  textColor?: string;
  fontSize?: number;
  /** 文本格式化函数 */
  formatText?: (value: number, max: number) => string;
}

/**
 * UI 进度条
 */
export class UIProgressBar extends UIElement {
  value = 0;
  maxValue = 100;
  backgroundColor = '#333333';
  fillColor = '#4a90d9';
  borderColor?: string;
  borderWidth = 0;
  borderRadius = 0;
  direction: 'horizontal' | 'vertical' = 'horizontal';
  showText = false;
  textColor = '#ffffff';
  fontSize = 12;
  formatText?: (value: number, max: number) => string;

  constructor(props: UIProgressBarProps = {}) {
    super(props);
    Object.assign(this, props);
    if (!this.width) this.width = 200;
    if (!this.height) this.height = 20;
  }

  /**
   * 设置进度值
   */
  setValue(value: number): this {
    this.value = Math.max(0, Math.min(value, this.maxValue));
    return this;
  }

  /**
   * 设置最大值
   */
  setMaxValue(max: number): this {
    this.maxValue = max;
    this.value = Math.min(this.value, max);
    return this;
  }

  /**
   * 获取进度百分比 (0-1)
   */
  getProgress(): number {
    return this.maxValue > 0 ? this.value / this.maxValue : 0;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const pos = this.getGlobalPosition();
    const progress = this.getProgress();

    // 绘制背景
    ctx.beginPath();
    this.roundRect(ctx, pos.x, pos.y, this.width, this.height, this.borderRadius);
    ctx.fillStyle = this.backgroundColor;
    ctx.fill();

    // 绘制填充
    if (progress > 0) {
      ctx.save();
      ctx.beginPath();
      this.roundRect(ctx, pos.x, pos.y, this.width, this.height, this.borderRadius);
      ctx.clip();

      ctx.fillStyle = this.fillColor;
      if (this.direction === 'horizontal') {
        ctx.fillRect(pos.x, pos.y, this.width * progress, this.height);
      } else {
        const fillHeight = this.height * progress;
        ctx.fillRect(pos.x, pos.y + this.height - fillHeight, this.width, fillHeight);
      }
      ctx.restore();
    }

    // 绘制边框
    if (this.borderColor && this.borderWidth > 0) {
      ctx.beginPath();
      this.roundRect(ctx, pos.x, pos.y, this.width, this.height, this.borderRadius);
      ctx.strokeStyle = this.borderColor;
      ctx.lineWidth = this.borderWidth;
      ctx.stroke();
    }

    // 绘制文本
    if (this.showText) {
      const text = this.formatText
        ? this.formatText(this.value, this.maxValue)
        : `${Math.round(progress * 100)}%`;

      ctx.font = `${this.fontSize}px sans-serif`;
      ctx.fillStyle = this.textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, pos.x + this.width / 2, pos.y + this.height / 2);
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
