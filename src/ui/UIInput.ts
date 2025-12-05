/**
 * UI 输入框元素
 * 使用隐藏的 HTML input 元素处理实际输入
 */

import { UIElement, type UIElementProps } from './UIElement';

/** 输入框属性 */
export interface UIInputProps extends UIElementProps {
  text?: string;
  placeholder?: string;
  maxLength?: number;
  fontSize?: number;
  fontFamily?: string;
  textColor?: string;
  placeholderColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  focusBorderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  padding?: number;
  /** 输入类型 */
  type?: 'text' | 'password' | 'number';
  /** 值改变回调 */
  onChange?: (value: string) => void;
  /** 提交回调（回车键） */
  onSubmit?: (value: string) => void;
}

/**
 * UI 输入框
 */
export class UIInput extends UIElement {
  text = '';
  placeholder = '';
  maxLength = 100;
  fontSize = 16;
  fontFamily = 'sans-serif';
  textColor = '#ffffff';
  placeholderColor = '#888888';
  backgroundColor = '#222222';
  borderColor = '#444444';
  focusBorderColor = '#4a90d9';
  borderWidth = 2;
  borderRadius = 4;
  padding = 8;
  type: 'text' | 'password' | 'number' = 'text';
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;

  private focused = false;
  private cursorVisible = true;
  private cursorTimer = 0;
  private cursorPosition = 0; // 光标位置（字符索引）
  private selectionStart = 0; // 选区开始
  private selectionEnd = 0; // 选区结束
  private hiddenInput: HTMLInputElement | null = null;
  private measureCanvas: HTMLCanvasElement | null = null;
  private measureCtx: CanvasRenderingContext2D | null = null;

  constructor(props: UIInputProps = {}) {
    super(props);
    Object.assign(this, props);

    if (!this.width) this.width = 200;
    if (!this.height) this.height = this.fontSize + this.padding * 2;
  }

  /**
   * 初始化隐藏输入框（需要 canvas 已挂载）
   */
  init(container: HTMLElement): this {
    if (this.hiddenInput) return this;

    this.hiddenInput = document.createElement('input');
    this.hiddenInput.type = this.type;
    this.hiddenInput.maxLength = this.maxLength;
    this.hiddenInput.value = this.text;
    this.hiddenInput.placeholder = this.placeholder;

    // 隐藏但保持可聚焦
    Object.assign(this.hiddenInput.style, {
      position: 'absolute',
      left: '-9999px',
      top: '-9999px',
      opacity: '0',
      pointerEvents: 'none',
    });

    this.hiddenInput.addEventListener('input', this.onInput);
    this.hiddenInput.addEventListener('keydown', this.onKeyDown);
    this.hiddenInput.addEventListener('blur', this.onBlur);

    container.appendChild(this.hiddenInput);
    return this;
  }

  /**
   * 销毁隐藏输入框
   */
  destroy(): void {
    if (this.hiddenInput) {
      this.hiddenInput.removeEventListener('input', this.onInput);
      this.hiddenInput.removeEventListener('keydown', this.onKeyDown);
      this.hiddenInput.removeEventListener('blur', this.onBlur);
      this.hiddenInput.remove();
      this.hiddenInput = null;
    }
  }

  private onInput = (): void => {
    if (!this.hiddenInput) return;
    this.text = this.hiddenInput.value;
    this.onChange?.(this.text);
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Enter') {
      this.onSubmit?.(this.text);
    } else if (e.key === 'Escape') {
      this.blur();
    }
  };

  private onBlur = (): void => {
    this.focused = false;
  };

  /**
   * 获取文本值
   */
  getValue(): string {
    return this.text;
  }

  /**
   * 设置文本值
   */
  setValue(value: string): this {
    this.text = value;
    if (this.hiddenInput) {
      this.hiddenInput.value = value;
    }
    return this;
  }

  /**
   * 聚焦输入框
   */
  focus(): this {
    if (this.hiddenInput) {
      this.hiddenInput.focus();
      this.focused = true;
      this.cursorVisible = true;
      this.cursorTimer = 0;
    }
    return this;
  }

  /**
   * 失去焦点
   */
  blur(): this {
    if (this.hiddenInput) {
      this.hiddenInput.blur();
    }
    this.focused = false;
    return this;
  }

  /**
   * 检查是否聚焦
   */
  isFocused(): boolean {
    return this.focused;
  }

  /**
   * 处理点击
   */
  handleClick(x: number, y: number): boolean {
    if (!this.visible) return false;

    if (this.containsPoint(x, y)) {
      this.focus();
      return true;
    } else {
      this.blur();
    }
    return false;
  }

  update(dt: number): void {
    super.update(dt);

    // 光标闪烁
    if (this.focused) {
      this.cursorTimer += dt;
      if (this.cursorTimer >= 530) {
        this.cursorTimer = 0;
        this.cursorVisible = !this.cursorVisible;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return;

    const pos = this.getGlobalPosition();

    ctx.save();

    // 绘制背景
    ctx.beginPath();
    this.roundRect(ctx, pos.x, pos.y, this.width, this.height, this.borderRadius);
    ctx.fillStyle = this.backgroundColor;
    ctx.fill();

    // 绘制边框
    ctx.strokeStyle = this.focused ? this.focusBorderColor : this.borderColor;
    ctx.lineWidth = this.borderWidth;
    ctx.stroke();

    // 设置裁剪区域（防止文本溢出）
    ctx.beginPath();
    ctx.rect(pos.x + this.padding, pos.y, this.width - this.padding * 2, this.height);
    ctx.clip();

    // 绘制文本或占位符
    ctx.font = `${this.fontSize}px ${this.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const textY = pos.y + this.height / 2;
    const textX = pos.x + this.padding;

    // 计算光标高度（基于字体大小，而非整个高度）
    const cursorHeight = this.fontSize * 1.2;
    const cursorY = pos.y + (this.height - cursorHeight) / 2;

    if (this.text) {
      ctx.fillStyle = this.textColor;
      const displayText = this.type === 'password' ? '•'.repeat(this.text.length) : this.text;
      ctx.fillText(displayText, textX, textY);

      // 绘制光标（在文本末尾）
      if (this.focused && this.cursorVisible) {
        const textWidth = ctx.measureText(displayText).width;
        ctx.fillStyle = this.textColor;
        ctx.fillRect(textX + textWidth + 2, cursorY, 2, cursorHeight);
      }
    } else {
      // 占位符
      ctx.fillStyle = this.placeholderColor;
      ctx.fillText(this.placeholder, textX, textY);

      // 空输入时的光标
      if (this.focused && this.cursorVisible) {
        ctx.fillStyle = this.textColor;
        ctx.fillRect(textX, cursorY, 2, cursorHeight);
      }
    }

    ctx.restore();
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
