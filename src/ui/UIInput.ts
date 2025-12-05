/**
 * UI 输入框元素
 * 使用隐藏的 HTML input 元素处理实际输入
 */

import { UIElement, type UIElementProps } from './UIElement';
import { getNavigationManager } from './UINavigationManager';

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
  /** 是否自动注册到导航系统 */
  autoRegisterNavigation?: boolean;
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
  private scrollOffset = 0; // 文本滚动偏移量（像素）
  private hiddenInput: HTMLInputElement | null = null;
  private measureCanvas: HTMLCanvasElement | null = null;
  private measureCtx: CanvasRenderingContext2D | null = null;

  /** 导航焦点状态（与 focused 不同，这个是导航系统的焦点） */
  private navFocused = false;
  /** 焦点动画进度 */
  private focusAnim = 0;
  /** 是否启用 */
  enabled = true;
  /** 是否自动注册到导航 */
  private autoRegisterNavigation = true;
  /** 是否已注册 */
  private _registered = false;

  constructor(props: UIInputProps = {}) {
    super(props);
    Object.assign(this, props);

    if (!this.width) this.width = 200;
    if (!this.height) this.height = this.fontSize + this.padding * 2;

    // 自动注册到全局导航管理器
    if (this.autoRegisterNavigation) {
      getNavigationManager().register(this);
      this._registered = true;
    }
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
    this.hiddenInput.addEventListener('select', this.onSelect);

    container.appendChild(this.hiddenInput);

    // 创建测量用的 canvas
    this.measureCanvas = document.createElement('canvas');
    this.measureCtx = this.measureCanvas.getContext('2d');

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

    // 从导航系统中移除
    if (this._registered) {
      getNavigationManager().unregister(this);
      this._registered = false;
    }
  }

  private onInput = (): void => {
    if (!this.hiddenInput) return;
    this.text = this.hiddenInput.value;
    this.syncCursorFromInput();
    this.onChange?.(this.text);
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Enter') {
      this.onSubmit?.(this.text);
    } else if (e.key === 'Escape') {
      this.blur();
    }
    // 同步光标位置（方向键、Home/End 等）
    setTimeout(() => this.syncCursorFromInput(), 0);
  };

  private onBlur = (): void => {
    this.focused = false;
  };

  private onSelect = (): void => {
    this.syncCursorFromInput();
  };

  /**
   * 从隐藏输入框同步光标位置
   */
  private syncCursorFromInput(): void {
    if (!this.hiddenInput) return;
    this.cursorPosition = this.hiddenInput.selectionStart || 0;
    this.updateScrollOffset();
  }

  /**
   * 更新滚动偏移，确保光标可见
   */
  private updateScrollOffset(): void {
    if (!this.measureCtx) return;

    // 设置字体
    this.measureCtx.font = `${this.fontSize}px ${this.fontFamily}`;

    const displayText = this.type === 'password' ? '•'.repeat(this.text.length) : this.text;
    const textBeforeCursor = displayText.substring(0, this.cursorPosition);
    const cursorX = this.measureCtx.measureText(textBeforeCursor).width;

    // 可见区域宽度（减去内边距）
    const visibleWidth = this.width - this.padding * 2;

    // 光标在可见区域中的位置
    const cursorInView = cursorX - this.scrollOffset;

    // 如果光标在可见区域右侧外面，滚动使其可见
    if (cursorInView > visibleWidth - 10) {
      this.scrollOffset = cursorX - visibleWidth + 10;
    }
    // 如果光标在可见区域左侧外面，滚动使其可见
    else if (cursorInView < 10) {
      this.scrollOffset = Math.max(0, cursorX - 10);
    }

    // 如果文本总宽度小于可见宽度，重置滚动
    const totalTextWidth = this.measureCtx.measureText(displayText).width;
    if (totalTextWidth <= visibleWidth) {
      this.scrollOffset = 0;
    }
  }

  /**
   * 设置光标位置到隐藏输入框
   */
  private syncCursorToInput(): void {
    if (!this.hiddenInput) return;
    this.hiddenInput.setSelectionRange(this.cursorPosition, this.cursorPosition);
  }

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
      this.syncCursorFromInput();
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
   * 检查是否聚焦（输入焦点）
   */
  isFocused(): boolean {
    return this.focused;
  }

  /**
   * 设置导航焦点状态（用于导航系统）
   */
  setFocused(focused: boolean): this {
    this.navFocused = focused;
    if (focused && !this.focused) {
      // 当导航焦点到达时，自动激活输入焦点
      this.focus();
    }
    return this;
  }

  /**
   * 获取导航焦点状态
   */
  isNavFocused(): boolean {
    return this.navFocused;
  }

  /**
   * 处理点击
   */
  handleClick(x: number, y: number): boolean {
    if (!this.visible) return false;

    if (this.containsPoint(x, y)) {
      this.focus();
      // 根据点击位置设置光标
      this.setCursorByPosition(x);
      return true;
    } else {
      this.blur();
    }
    return false;
  }

  /**
   * 根据点击的 x 坐标设置光标位置
   */
  private setCursorByPosition(clickX: number): void {
    if (!this.text || !this.measureCtx) {
      this.cursorPosition = 0;
      this.syncCursorToInput();
      return;
    }

    const pos = this.getGlobalPosition();
    const textX = pos.x + this.padding;
    // 考虑滚动偏移
    const relativeX = clickX - textX + this.scrollOffset;

    // 设置字体
    this.measureCtx.font = `${this.fontSize}px ${this.fontFamily}`;

    const displayText = this.type === 'password' ? '•'.repeat(this.text.length) : this.text;

    // 找到最接近点击位置的字符
    let closestIndex = 0;
    let closestDistance = Infinity;

    for (let i = 0; i <= displayText.length; i++) {
      const textWidth = this.measureCtx.measureText(displayText.substring(0, i)).width;
      const distance = Math.abs(textWidth - relativeX);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = i;
      }
    }

    this.cursorPosition = closestIndex;
    this.syncCursorToInput();
    this.updateScrollOffset();
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

    // 焦点动画
    const targetFocus = this.navFocused ? 1 : 0;
    const animSpeed = dt / 200; // 200ms 动画时长

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
      ctx.shadowBlur = 20 * this.focusAnim;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    // 绘制背景
    ctx.beginPath();
    this.roundRect(ctx, pos.x, pos.y, this.width, this.height, this.borderRadius);
    ctx.fillStyle = this.backgroundColor;
    ctx.fill();

    // 绘制边框
    ctx.strokeStyle = this.focused ? this.focusBorderColor : this.borderColor;
    ctx.lineWidth = this.borderWidth;
    ctx.stroke();

    // 重置阴影
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

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
      // 应用滚动偏移
      ctx.fillText(displayText, textX - this.scrollOffset, textY);

      // 绘制光标（在指定位置，考虑滚动偏移）
      if (this.focused && this.cursorVisible) {
        const textBeforeCursor = displayText.substring(0, this.cursorPosition);
        const cursorX = textX + ctx.measureText(textBeforeCursor).width - this.scrollOffset;
        ctx.fillStyle = this.textColor;
        ctx.fillRect(cursorX, cursorY, 2, cursorHeight);
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
