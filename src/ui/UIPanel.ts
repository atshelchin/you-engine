/**
 * UI 面板元素
 * 支持背景色、边框、圆角
 */

import { UIElement, type UIElementProps } from './UIElement';

/** 面板属性 */
export interface UIPanelProps extends UIElementProps {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  padding?: number | { top: number; right: number; bottom: number; left: number };
  shadow?: { color: string; blur: number; offsetX: number; offsetY: number };
}

/**
 * UI 面板
 */
export class UIPanel extends UIElement {
  backgroundColor = 'rgba(0, 0, 0, 0.7)';
  borderColor?: string;
  borderWidth = 0;
  borderRadius = 0;
  padding: { top: number; right: number; bottom: number; left: number } = {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  };
  shadow?: { color: string; blur: number; offsetX: number; offsetY: number };

  constructor(props: UIPanelProps = {}) {
    super(props);

    if (props.backgroundColor !== undefined) this.backgroundColor = props.backgroundColor;
    if (props.borderColor !== undefined) this.borderColor = props.borderColor;
    if (props.borderWidth !== undefined) this.borderWidth = props.borderWidth;
    if (props.borderRadius !== undefined) this.borderRadius = props.borderRadius;
    if (props.shadow !== undefined) this.shadow = props.shadow;

    if (props.padding !== undefined) {
      if (typeof props.padding === 'number') {
        this.padding = {
          top: props.padding,
          right: props.padding,
          bottom: props.padding,
          left: props.padding,
        };
      } else {
        this.padding = props.padding;
      }
    }
  }

  /**
   * 获取内容区域边界
   */
  getContentBounds(): { x: number; y: number; width: number; height: number } {
    const pos = this.getGlobalPosition();
    return {
      x: pos.x + this.padding.left,
      y: pos.y + this.padding.top,
      width: this.width - this.padding.left - this.padding.right,
      height: this.height - this.padding.top - this.padding.bottom,
    };
  }

  render(ctx: CanvasRenderingContext2D): void {
    const pos = this.getGlobalPosition();

    // 阴影
    if (this.shadow) {
      ctx.shadowColor = this.shadow.color;
      ctx.shadowBlur = this.shadow.blur;
      ctx.shadowOffsetX = this.shadow.offsetX;
      ctx.shadowOffsetY = this.shadow.offsetY;
    }

    // 绘制圆角矩形
    ctx.beginPath();
    if (this.borderRadius > 0) {
      this.roundRect(ctx, pos.x, pos.y, this.width, this.height, this.borderRadius);
    } else {
      ctx.rect(pos.x, pos.y, this.width, this.height);
    }

    // 填充背景
    if (this.backgroundColor) {
      ctx.fillStyle = this.backgroundColor;
      ctx.fill();
    }

    // 重置阴影（边框不需要阴影）
    if (this.shadow) {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    // 边框
    if (this.borderColor && this.borderWidth > 0) {
      ctx.strokeStyle = this.borderColor;
      ctx.lineWidth = this.borderWidth;
      ctx.stroke();
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
