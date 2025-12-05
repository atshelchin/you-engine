/**
 * UI 文本元素
 */

import { UIElement, type UIElementProps } from './UIElement';

/** 文本对齐方式 */
export type TextAlign = 'left' | 'center' | 'right';
export type TextBaseline = 'top' | 'middle' | 'bottom';

/** 文本属性 */
export interface UITextProps extends UIElementProps {
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  textAlign?: TextAlign;
  textBaseline?: TextBaseline;
  lineHeight?: number;
  maxWidth?: number;
  shadow?: { color: string; blur: number; offsetX: number; offsetY: number };
  stroke?: { color: string; width: number };
}

/**
 * UI 文本
 */
export class UIText extends UIElement {
  text = '';
  fontSize = 16;
  fontFamily = 'sans-serif';
  color = '#ffffff';
  textAlign: TextAlign = 'left';
  textBaseline: TextBaseline = 'top';
  lineHeight = 1.2;
  maxWidth?: number;
  shadow?: { color: string; blur: number; offsetX: number; offsetY: number };
  stroke?: { color: string; width: number };

  private lines: string[] = [];
  private dirty = true;

  constructor(props: UITextProps = {}) {
    super(props);
    Object.assign(this, props);
  }

  /**
   * 设置文本
   */
  setText(text: string): this {
    if (this.text !== text) {
      this.text = text;
      this.dirty = true;
    }
    return this;
  }

  /**
   * 计算文本行（自动换行）
   */
  private computeLines(ctx: CanvasRenderingContext2D): void {
    if (!this.dirty) return;
    this.dirty = false;

    ctx.font = `${this.fontSize}px ${this.fontFamily}`;

    if (!this.maxWidth) {
      this.lines = this.text.split('\n');
      const metrics = ctx.measureText(this.text);
      this.width = metrics.width;
    } else {
      this.lines = [];
      const paragraphs = this.text.split('\n');
      let maxLineWidth = 0;

      for (const paragraph of paragraphs) {
        const words = paragraph.split('');
        let line = '';

        for (const char of words) {
          const testLine = line + char;
          const metrics = ctx.measureText(testLine);
          if (metrics.width > this.maxWidth && line) {
            this.lines.push(line);
            maxLineWidth = Math.max(maxLineWidth, ctx.measureText(line).width);
            line = char;
          } else {
            line = testLine;
          }
        }
        if (line) {
          this.lines.push(line);
          maxLineWidth = Math.max(maxLineWidth, ctx.measureText(line).width);
        }
      }
      this.width = maxLineWidth;
    }

    this.height = this.lines.length * this.fontSize * this.lineHeight;
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.computeLines(ctx);

    const pos = this.getGlobalPosition();
    ctx.font = `${this.fontSize}px ${this.fontFamily}`;
    ctx.textAlign = this.textAlign;
    ctx.textBaseline = this.textBaseline;

    // 阴影
    if (this.shadow) {
      ctx.shadowColor = this.shadow.color;
      ctx.shadowBlur = this.shadow.blur;
      ctx.shadowOffsetX = this.shadow.offsetX;
      ctx.shadowOffsetY = this.shadow.offsetY;
    }

    const lineSpacing = this.fontSize * this.lineHeight;

    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];
      const y = pos.y + i * lineSpacing;

      // 描边
      if (this.stroke) {
        ctx.strokeStyle = this.stroke.color;
        ctx.lineWidth = this.stroke.width;
        ctx.strokeText(line, pos.x, y, this.maxWidth);
      }

      // 填充
      ctx.fillStyle = this.color;
      ctx.fillText(line, pos.x, y, this.maxWidth);
    }

    // 重置阴影
    if (this.shadow) {
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }
  }
}
