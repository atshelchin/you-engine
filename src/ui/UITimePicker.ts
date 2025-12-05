/**
 * UI 时间选择器
 * 选择时、分、秒，支持12/24小时制
 */

import { UIElement, type UIElementProps } from './UIElement';
import { getNavigationManager } from './UINavigationManager';

/** 时间选择器属性 */
export interface UITimePickerProps extends UIElementProps {
  /** 小时 (0-23) */
  hour?: number;
  /** 分钟 (0-59) */
  minute?: number;
  /** 秒 (0-59) */
  second?: number;
  /** 是否显示秒 */
  showSeconds?: boolean;
  /** 是否使用 12 小时制 */
  use12Hour?: boolean;
  /** 字体大小 */
  fontSize?: number;
  /** 字体 */
  fontFamily?: string;
  /** 背景色 */
  backgroundColor?: string;
  /** 文字颜色 */
  textColor?: string;
  /** 选中颜色 */
  selectedColor?: string;
  /** 按钮颜色 */
  buttonColor?: string;
  /** 时间改变回调 */
  onChange?: (hour: number, minute: number, second: number) => void;
  /** 是否自动注册到导航系统 */
  autoRegisterNavigation?: boolean;
}

/**
 * UI 时间选择器
 */
export class UITimePicker extends UIElement {
  hour = 0;
  minute = 0;
  second = 0;
  showSeconds = true;
  use12Hour = false;
  fontSize = 32;
  fontFamily = 'monospace';
  backgroundColor = '#1a1a1a';
  textColor = '#ffffff';
  selectedColor = '#4a90d9';
  buttonColor = '#333333';
  onChange?: (hour: number, minute: number, second: number) => void;

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

  /** 当前选中的部分 (0=时, 1=分, 2=秒) */
  private selectedPart = 0;
  /** 单元格宽度 */
  private cellWidth = 80;
  /** 单元格高度 */
  private cellHeight = 50;
  /** 按钮高度 */
  private buttonHeight = 30;

  constructor(props: UITimePickerProps = {}) {
    super(props);
    Object.assign(this, props);

    // 自动计算尺寸
    const columns = this.showSeconds ? 3 : 2;
    if (!this.width) {
      this.width = columns * this.cellWidth + (columns + 1) * 10;
    }
    if (!this.height) {
      this.height = this.buttonHeight * 2 + this.cellHeight + 40;
    }

    // 自动注册到全局导航管理器
    if (this.autoRegisterNavigation) {
      getNavigationManager().register(this);
      this._registered = true;
    }
  }

  /**
   * 设置时间
   */
  setTime(hour: number, minute: number, second: number): this {
    this.hour = Math.max(0, Math.min(23, hour));
    this.minute = Math.max(0, Math.min(59, minute));
    this.second = Math.max(0, Math.min(59, second));
    this.onChange?.(this.hour, this.minute, this.second);
    return this;
  }

  /**
   * 增加当前选中部分的值
   */
  private increment(): void {
    if (this.selectedPart === 0) {
      this.hour = (this.hour + 1) % 24;
    } else if (this.selectedPart === 1) {
      this.minute = (this.minute + 1) % 60;
    } else if (this.selectedPart === 2) {
      this.second = (this.second + 1) % 60;
    }
    this.onChange?.(this.hour, this.minute, this.second);
  }

  /**
   * 减少当前选中部分的值
   */
  private decrement(): void {
    if (this.selectedPart === 0) {
      this.hour = (this.hour - 1 + 24) % 24;
    } else if (this.selectedPart === 1) {
      this.minute = (this.minute - 1 + 60) % 60;
    } else if (this.selectedPart === 2) {
      this.second = (this.second - 1 + 60) % 60;
    }
    this.onChange?.(this.hour, this.minute, this.second);
  }

  /**
   * 设置导航焦点状态
   */
  setFocused(focused: boolean): void {
    this.navFocused = focused;
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
    return { x: pos.x, y: pos.y, width: this.width, height: this.height };
  }

  /**
   * 点击事件（用于导航系统）
   */
  onClick = (): void => {
    // 切换选中的部分
    const maxPart = this.showSeconds ? 2 : 1;
    this.selectedPart = (this.selectedPart + 1) % (maxPart + 1);
  };

  /**
   * 处理点击
   */
  handleClick(x: number, y: number): boolean {
    if (!this.visible || !this.enabled) return false;

    const pos = this.getGlobalPosition();
    const relX = x - pos.x;
    const relY = y - pos.y;

    const columns = this.showSeconds ? 3 : 2;
    const startY = 20;

    // 检查上箭头按钮
    if (relY >= startY && relY < startY + this.buttonHeight) {
      const colIndex = Math.floor(relX / (this.cellWidth + 10));
      if (colIndex >= 0 && colIndex < columns) {
        this.selectedPart = colIndex;
        this.increment();
        return true;
      }
    }

    // 检查数字显示区域
    const numberY = startY + this.buttonHeight + 10;
    if (relY >= numberY && relY < numberY + this.cellHeight) {
      const colIndex = Math.floor(relX / (this.cellWidth + 10));
      if (colIndex >= 0 && colIndex < columns) {
        this.selectedPart = colIndex;
        return true;
      }
    }

    // 检查下箭头按钮
    const downY = numberY + this.cellHeight + 10;
    if (relY >= downY && relY < downY + this.buttonHeight) {
      const colIndex = Math.floor(relX / (this.cellWidth + 10));
      if (colIndex >= 0 && colIndex < columns) {
        this.selectedPart = colIndex;
        this.decrement();
        return true;
      }
    }

    return false;
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
      ctx.shadowBlur = 20 * this.focusAnim;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    // 绘制背景
    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(pos.x, pos.y, this.width, this.height);

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    const columns = this.showSeconds ? 3 : 2;
    const values = [this.hour, this.minute, this.second];
    const labels = ['时', '分', '秒'];

    const startY = 20;

    for (let i = 0; i < columns; i++) {
      const colX = pos.x + 10 + i * (this.cellWidth + 10);
      const isSelected = i === this.selectedPart;

      // 上箭头按钮
      ctx.fillStyle = isSelected ? this.selectedColor : this.buttonColor;
      ctx.fillRect(colX, pos.y + startY, this.cellWidth, this.buttonHeight);

      ctx.fillStyle = this.textColor;
      ctx.font = `${this.fontSize / 2}px ${this.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('▲', colX + this.cellWidth / 2, pos.y + startY + this.buttonHeight / 2);

      // 数字显示
      const numberY = pos.y + startY + this.buttonHeight + 10;

      ctx.fillStyle = isSelected ? this.selectedColor : this.buttonColor;
      ctx.fillRect(colX, numberY, this.cellWidth, this.cellHeight);

      ctx.fillStyle = this.textColor;
      ctx.font = `${this.fontSize}px ${this.fontFamily}`;
      ctx.fillText(
        values[i].toString().padStart(2, '0'),
        colX + this.cellWidth / 2,
        numberY + this.cellHeight / 2
      );

      // 标签
      ctx.font = `${this.fontSize / 2}px sans-serif`;
      ctx.fillText(labels[i], colX + this.cellWidth / 2, numberY + this.cellHeight + 5);

      // 下箭头按钮
      const downY = numberY + this.cellHeight + 10;

      ctx.fillStyle = isSelected ? this.selectedColor : this.buttonColor;
      ctx.fillRect(colX, downY, this.cellWidth, this.buttonHeight);

      ctx.fillStyle = this.textColor;
      ctx.font = `${this.fontSize / 2}px ${this.fontFamily}`;
      ctx.fillText('▼', colX + this.cellWidth / 2, downY + this.buttonHeight / 2);
    }

    ctx.restore();
  }

  /**
   * 销毁（从导航系统中移除）
   */
  destroy(): void {
    if (this._registered) {
      getNavigationManager().unregister(this);
      this._registered = false;
    }
  }
}
