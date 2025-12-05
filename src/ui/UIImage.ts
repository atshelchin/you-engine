/**
 * UI 图片元素
 */

import { UIElement, type UIElementProps } from './UIElement';

/** 图片属性 */
export interface UIImageProps extends UIElementProps {
  image?: HTMLImageElement | null;
  /** 精灵图源区域 */
  sourceX?: number;
  sourceY?: number;
  sourceWidth?: number;
  sourceHeight?: number;
  /** 是否保持宽高比 */
  preserveAspect?: boolean;
  /** 图片适配模式 */
  fit?: 'fill' | 'contain' | 'cover';
  /** 色调（用于覆盖颜色） */
  tint?: string;
}

/**
 * UI 图片
 */
export class UIImage extends UIElement {
  image: HTMLImageElement | null = null;
  sourceX?: number;
  sourceY?: number;
  sourceWidth?: number;
  sourceHeight?: number;
  preserveAspect = false;
  fit: 'fill' | 'contain' | 'cover' = 'fill';
  tint?: string;

  constructor(props: UIImageProps = {}) {
    super(props);
    Object.assign(this, props);
  }

  /**
   * 设置图片
   */
  setImage(image: HTMLImageElement): this {
    this.image = image;
    if (!this.width) this.width = image.width;
    if (!this.height) this.height = image.height;
    return this;
  }

  /**
   * 设置精灵图源区域
   */
  setSourceRect(x: number, y: number, width: number, height: number): this {
    this.sourceX = x;
    this.sourceY = y;
    this.sourceWidth = width;
    this.sourceHeight = height;
    return this;
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.image) return;

    const pos = this.getGlobalPosition();

    // 计算源区域
    const sx = this.sourceX ?? 0;
    const sy = this.sourceY ?? 0;
    const sw = this.sourceWidth ?? this.image.width;
    const sh = this.sourceHeight ?? this.image.height;

    // 计算目标区域
    let dx = pos.x;
    let dy = pos.y;
    let dw = this.width;
    let dh = this.height;

    if (this.fit !== 'fill') {
      const aspectRatio = sw / sh;
      const targetRatio = this.width / this.height;

      if (this.fit === 'contain') {
        if (aspectRatio > targetRatio) {
          dh = this.width / aspectRatio;
          dy += (this.height - dh) / 2;
        } else {
          dw = this.height * aspectRatio;
          dx += (this.width - dw) / 2;
        }
      } else if (this.fit === 'cover') {
        if (aspectRatio > targetRatio) {
          dw = this.height * aspectRatio;
          dx -= (dw - this.width) / 2;
        } else {
          dh = this.width / aspectRatio;
          dy -= (dh - this.height) / 2;
        }
      }
    }

    // 绘制图片
    ctx.drawImage(this.image, sx, sy, sw, sh, dx, dy, dw, dh);

    // 应用色调
    if (this.tint) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = this.tint;
      ctx.fillRect(dx, dy, dw, dh);
      ctx.globalCompositeOperation = 'source-over';
    }
  }
}
