/**
 * UI 下拉选择框组件
 */

import { UIElement, type UIElementProps } from './UIElement';
import { getNavigationManager } from './UINavigationManager';

export interface UISelectOption {
  value: string;
  label: string;
}

/** 下拉选择框属性 */
export interface UISelectProps extends UIElementProps {
  options?: UISelectOption[];
  selectedIndex?: number;
  placeholder?: string;
  fontSize?: number;
  fontFamily?: string;
  textColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  focusBorderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  padding?: number;
  maxVisibleOptions?: number;
  onChange?: (value: string, index: number) => void;
  /** 是否自动注册到导航系统 */
  autoRegisterNavigation?: boolean;
}

/**
 * UI 下拉选择框
 */
export class UISelect extends UIElement {
  options: UISelectOption[] = [];
  selectedIndex = -1;
  placeholder = 'Select...';
  fontSize = 16;
  fontFamily = 'sans-serif';
  textColor = '#ffffff';
  backgroundColor = '#222222';
  borderColor = '#444444';
  focusBorderColor = '#4a90d9';
  borderWidth = 2;
  borderRadius = 4;
  padding = 8;
  maxVisibleOptions = 5;
  onChange?: (value: string, index: number) => void;

  /** 是否展开 */
  private expanded = false;
  /** 高亮的选项索引（用于键盘/手柄导航） */
  private highlightedIndex = -1;
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

  constructor(props: UISelectProps = {}) {
    super(props);
    Object.assign(this, props);

    // 自动计算尺寸
    if (!this.width) {
      this.width = 200;
    }
    if (!this.height) {
      this.height = this.fontSize + this.padding * 2;
    }

    // 自动注册到全局导航管理器
    if (this.autoRegisterNavigation) {
      getNavigationManager().register(this);
      this._registered = true;
    }
  }

  /**
   * 设置选项
   */
  setOptions(options: UISelectOption[]): this {
    this.options = options;
    if (this.selectedIndex >= options.length) {
      this.selectedIndex = -1;
    }
    return this;
  }

  /**
   * 添加选项
   */
  addOption(value: string, label: string): this {
    this.options.push({ value, label });
    return this;
  }

  /**
   * 选择指定索引的选项
   */
  selectIndex(index: number): this {
    if (index >= 0 && index < this.options.length && index !== this.selectedIndex) {
      this.selectedIndex = index;
      const option = this.options[index];
      this.onChange?.(option.value, index);
    }
    return this;
  }

  /**
   * 根据值选择选项
   */
  selectValue(value: string): this {
    const index = this.options.findIndex((opt) => opt.value === value);
    if (index !== -1) {
      this.selectIndex(index);
    }
    return this;
  }

  /**
   * 获取当前选中的值
   */
  getValue(): string | null {
    return this.selectedIndex >= 0 ? this.options[this.selectedIndex].value : null;
  }

  /**
   * 展开/收起下拉框
   */
  toggle(): this {
    if (!this.enabled) return this;
    this.expanded = !this.expanded;
    if (this.expanded) {
      this.highlightedIndex = this.selectedIndex;
    }
    return this;
  }

  /**
   * 收起下拉框
   */
  collapse(): this {
    this.expanded = false;
    return this;
  }

  /**
   * 向上导航
   */
  navigateUp(): void {
    if (!this.expanded) return;
    if (this.highlightedIndex > 0) {
      this.highlightedIndex--;
    }
  }

  /**
   * 向下导航
   */
  navigateDown(): void {
    if (!this.expanded) return;
    if (this.highlightedIndex < this.options.length - 1) {
      this.highlightedIndex++;
    }
  }

  /**
   * 确认选择高亮的选项
   */
  confirmSelection(): void {
    if (this.expanded && this.highlightedIndex >= 0) {
      this.selectIndex(this.highlightedIndex);
      this.collapse();
    } else {
      this.toggle();
    }
  }

  /**
   * 设置导航焦点状态
   */
  setFocused(focused: boolean): this {
    this.navFocused = focused;
    if (!focused) {
      this.collapse();
    }
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

    const pos = this.getGlobalPosition();

    // 检查是否点击主框
    if (x >= pos.x && x <= pos.x + this.width && y >= pos.y && y <= pos.y + this.height) {
      this.toggle();
      return true;
    }

    // 检查是否点击下拉列表中的选项
    if (this.expanded) {
      const dropdownY = pos.y + this.height;
      const optionHeight = this.height;
      const visibleOptions = Math.min(this.maxVisibleOptions, this.options.length);

      if (
        x >= pos.x &&
        x <= pos.x + this.width &&
        y >= dropdownY &&
        y <= dropdownY + optionHeight * visibleOptions
      ) {
        const optionIndex = Math.floor((y - dropdownY) / optionHeight);
        if (optionIndex >= 0 && optionIndex < this.options.length) {
          this.selectIndex(optionIndex);
          this.collapse();
        }
        return true;
      }
    }

    // 点击外部，收起下拉框
    if (this.expanded) {
      this.collapse();
    }

    return false;
  }

  /**
   * 触发点击（用于导航系统）
   */
  onClick(): void {
    this.confirmSelection();
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

    // 绘制主框背景
    ctx.fillStyle = this.backgroundColor;
    this.roundRect(ctx, pos.x, pos.y, this.width, this.height, this.borderRadius);
    ctx.fill();

    // 绘制边框
    ctx.strokeStyle = this.navFocused ? this.focusBorderColor : this.borderColor;
    ctx.lineWidth = this.borderWidth;
    this.roundRect(ctx, pos.x, pos.y, this.width, this.height, this.borderRadius);
    ctx.stroke();

    // 重置阴影
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // 绘制选中的文本或占位符
    ctx.fillStyle = this.enabled ? this.textColor : 'rgba(255, 255, 255, 0.5)';
    ctx.font = `${this.fontSize}px ${this.fontFamily}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const text =
      this.selectedIndex >= 0 ? this.options[this.selectedIndex].label : this.placeholder;

    // 设置裁剪区域
    ctx.save();
    ctx.beginPath();
    ctx.rect(pos.x + this.padding, pos.y, this.width - this.padding * 2 - 20, this.height);
    ctx.clip();
    ctx.fillText(text, pos.x + this.padding, pos.y + this.height / 2);
    ctx.restore();

    // 绘制下拉箭头
    const arrowSize = 8;
    const arrowX = pos.x + this.width - this.padding - arrowSize;
    const arrowY = pos.y + this.height / 2;

    ctx.fillStyle = this.textColor;
    ctx.beginPath();
    if (this.expanded) {
      // 向上箭头
      ctx.moveTo(arrowX, arrowY + arrowSize / 2);
      ctx.lineTo(arrowX + arrowSize, arrowY + arrowSize / 2);
      ctx.lineTo(arrowX + arrowSize / 2, arrowY - arrowSize / 2);
    } else {
      // 向下箭头
      ctx.moveTo(arrowX, arrowY - arrowSize / 2);
      ctx.lineTo(arrowX + arrowSize, arrowY - arrowSize / 2);
      ctx.lineTo(arrowX + arrowSize / 2, arrowY + arrowSize / 2);
    }
    ctx.closePath();
    ctx.fill();

    // 绘制下拉列表
    if (this.expanded && this.options.length > 0) {
      const dropdownY = pos.y + this.height;
      const optionHeight = this.height;
      const visibleOptions = Math.min(this.maxVisibleOptions, this.options.length);
      const dropdownHeight = optionHeight * visibleOptions;

      // 下拉框背景
      ctx.fillStyle = this.backgroundColor;
      ctx.fillRect(pos.x, dropdownY, this.width, dropdownHeight);

      // 下拉框边框
      ctx.strokeStyle = this.borderColor;
      ctx.lineWidth = this.borderWidth;
      ctx.strokeRect(pos.x, dropdownY, this.width, dropdownHeight);

      // 绘制选项
      this.options.slice(0, visibleOptions).forEach((option, index) => {
        const optionY = dropdownY + index * optionHeight;

        // 高亮背景
        if (index === this.highlightedIndex) {
          ctx.fillStyle = 'rgba(74, 144, 217, 0.3)';
          ctx.fillRect(pos.x, optionY, this.width, optionHeight);
        } else if (index === this.selectedIndex) {
          ctx.fillStyle = 'rgba(74, 144, 217, 0.1)';
          ctx.fillRect(pos.x, optionY, this.width, optionHeight);
        }

        // 选项文本
        ctx.fillStyle = this.textColor;
        ctx.font = `${this.fontSize}px ${this.fontFamily}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        ctx.save();
        ctx.beginPath();
        ctx.rect(pos.x + this.padding, optionY, this.width - this.padding * 2, optionHeight);
        ctx.clip();
        ctx.fillText(option.label, pos.x + this.padding, optionY + optionHeight / 2);
        ctx.restore();
      });
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
    ctx.beginPath();
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

  destroy(): void {
    // 从导航系统中移除
    if (this._registered) {
      getNavigationManager().unregister(this);
      this._registered = false;
    }
  }
}
