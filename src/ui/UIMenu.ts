/**
 * UIMenu - 高性能菜单组件
 * 支持键盘、鼠标、手柄导航
 * 支持垂直、水平、网格布局
 */

import { UIElement, type UIElementProps } from './UIElement';

/** 菜单项定义 */
export interface UIMenuItem {
  id: string;
  text: string;
  description?: string;
  color?: string;
  icon?: string;
  disabled?: boolean;
  data?: unknown;
}

/** 菜单布局方式 */
export type UIMenuLayout = 'vertical' | 'horizontal' | 'grid';

/** 菜单项状态 */
export type UIMenuItemState = 'normal' | 'hover' | 'pressed' | 'disabled';

/** 菜单样式配置 */
export interface UIMenuStyle {
  /** 菜单项背景色 */
  backgroundColor?: string;
  /** 悬停时背景色 */
  hoverBackgroundColor?: string;
  /** 按下时背景色 */
  pressedBackgroundColor?: string;
  /** 禁用时背景色 */
  disabledBackgroundColor?: string;
  /** 文字颜色 */
  textColor?: string;
  /** 描述文字颜色 */
  descriptionColor?: string;
  /** 边框颜色 */
  borderColor?: string;
  /** 边框宽度 */
  borderWidth?: number;
  /** 圆角半径 */
  borderRadius?: number;
  /** 字体大小 */
  fontSize?: number;
  /** 描述字体大小 */
  descriptionFontSize?: number;
  /** 字体 */
  fontFamily?: string;
}

/** 选中指示器样式 */
export interface UIMenuIndicatorStyle {
  /** 是否显示光晕 */
  showGlow?: boolean;
  /** 光晕颜色（null 则使用菜单项颜色） */
  glowColor?: string | null;
  /** 光晕强度 0-1 */
  glowIntensity?: number;
  /** 是否显示边框 */
  showBorder?: boolean;
  /** 边框颜色 */
  borderColor?: string;
  /** 边框宽度 */
  borderWidth?: number;
  /** 是否显示箭头 */
  showArrows?: boolean;
  /** 箭头颜色（null 则使用菜单项颜色） */
  arrowColor?: string | null;
  /** 脉冲动画速度 */
  pulseSpeed?: number;
}

/** 菜单属性 */
export interface UIMenuProps extends UIElementProps {
  /** 菜单项列表 */
  items?: UIMenuItem[];
  /** 布局方式 */
  layout?: UIMenuLayout;
  /** 网格列数（grid 布局时使用） */
  columns?: number;
  /** 菜单项宽度 */
  itemWidth?: number;
  /** 菜单项高度 */
  itemHeight?: number;
  /** 菜单项水平间距 */
  itemGapX?: number;
  /** 菜单项垂直间距 */
  itemGapY?: number;
  /** 菜单项内边距 */
  itemPadding?: number;
  /** 默认选中索引 */
  defaultIndex?: number;
  /** 是否循环导航 */
  wrapNavigation?: boolean;
  /** 摇杆防抖时间 (ms) */
  joystickDelay?: number;
  /** 摇杆触发阈值 0-1 */
  joystickThreshold?: number;
  /** 菜单样式 */
  style?: UIMenuStyle;
  /** 选中指示器样式 */
  indicatorStyle?: UIMenuIndicatorStyle;
  /** 选中回调 */
  onSelect?: (item: UIMenuItem, index: number) => void;
  /** 选中项变化回调 */
  onChange?: (item: UIMenuItem, index: number) => void;
  /** 取消回调（按 B 键/Escape） */
  onCancel?: () => void;
}

/** 菜单项渲染数据（内部使用） */
interface MenuItemRenderData {
  x: number;
  y: number;
  width: number;
  height: number;
  state: UIMenuItemState;
  animX: number;
  animAlpha: number;
}

/**
 * UIMenu 菜单组件
 */
export class UIMenu extends UIElement {
  /** 菜单项列表 */
  items: UIMenuItem[] = [];

  /** 布局方式 */
  layout: UIMenuLayout = 'vertical';

  /** 网格列数 */
  columns = 1;

  /** 菜单项尺寸 */
  itemWidth = 200;
  itemHeight = 50;
  itemGapX = 20;
  itemGapY = 10;
  itemPadding = 12;

  /** 当前选中索引 */
  selectedIndex = 0;

  /** 是否循环导航 */
  wrapNavigation = true;

  /** 摇杆防抖时间 (ms) */
  joystickDelay = 200;

  /** 摇杆触发阈值 0-1，需要超过此值才触发导航 */
  joystickThreshold = 0.7;

  /** 菜单样式 */
  style: UIMenuStyle = {
    backgroundColor: '#4a90d9',
    hoverBackgroundColor: '#5aa0e9',
    pressedBackgroundColor: '#3a7bc8',
    disabledBackgroundColor: '#666666',
    textColor: '#ffffff',
    descriptionColor: 'rgba(255,255,255,0.7)',
    borderColor: 'transparent',
    borderWidth: 2,
    borderRadius: 8,
    fontSize: 18,
    descriptionFontSize: 12,
    fontFamily: 'sans-serif',
  };

  /** 选中指示器样式 */
  indicatorStyle: UIMenuIndicatorStyle = {
    showGlow: true,
    glowColor: null,
    glowIntensity: 0.4,
    showBorder: true,
    borderColor: '#ffffff',
    borderWidth: 3,
    showArrows: true,
    arrowColor: null,
    pulseSpeed: 1,
  };

  /** 回调 */
  onSelect?: (item: UIMenuItem, index: number) => void;
  onChange?: (item: UIMenuItem, index: number) => void;
  onCancel?: () => void;

  // 内部状态
  private prevSelectedIndex = -1;
  private joystickCooldown = 0;
  private pulseTime = 0;
  private itemRenderData: MenuItemRenderData[] = [];
  private isPressed = false;
  private pressedIndex = -1;

  // 缓存的计算值
  private _layoutDirty = true;
  private _totalWidth = 0;
  private _totalHeight = 0;

  constructor(props: UIMenuProps = {}) {
    super(props);

    // 应用属性
    if (props.items) this.items = props.items;
    if (props.layout) this.layout = props.layout;
    if (props.columns !== undefined) this.columns = props.columns;
    if (props.itemWidth !== undefined) this.itemWidth = props.itemWidth;
    if (props.itemHeight !== undefined) this.itemHeight = props.itemHeight;
    if (props.itemGapX !== undefined) this.itemGapX = props.itemGapX;
    if (props.itemGapY !== undefined) this.itemGapY = props.itemGapY;
    if (props.itemPadding !== undefined) this.itemPadding = props.itemPadding;
    if (props.defaultIndex !== undefined) this.selectedIndex = props.defaultIndex;
    if (props.wrapNavigation !== undefined) this.wrapNavigation = props.wrapNavigation;
    if (props.joystickDelay !== undefined) this.joystickDelay = props.joystickDelay;
    if (props.joystickThreshold !== undefined) this.joystickThreshold = props.joystickThreshold;
    if (props.style) this.style = { ...this.style, ...props.style };
    if (props.indicatorStyle)
      this.indicatorStyle = { ...this.indicatorStyle, ...props.indicatorStyle };
    if (props.onSelect) this.onSelect = props.onSelect;
    if (props.onChange) this.onChange = props.onChange;
    if (props.onCancel) this.onCancel = props.onCancel;

    this._layoutDirty = true;
  }

  /**
   * 设置菜单项
   */
  setItems(items: UIMenuItem[]): this {
    this.items = items;
    this._layoutDirty = true;
    this.selectedIndex = Math.min(this.selectedIndex, items.length - 1);
    return this;
  }

  /**
   * 设置选中项
   */
  setSelectedIndex(index: number): this {
    if (index >= 0 && index < this.items.length && index !== this.selectedIndex) {
      this.selectedIndex = index;
      this.onChange?.(this.items[index], index);
    }
    return this;
  }

  /**
   * 获取当前选中项
   */
  getSelectedItem(): UIMenuItem | null {
    return this.items[this.selectedIndex] ?? null;
  }

  /**
   * 标记布局需要重新计算
   */
  invalidateLayout(): void {
    this._layoutDirty = true;
  }

  /**
   * 计算布局
   */
  private computeLayout(): void {
    if (!this._layoutDirty) return;

    const count = this.items.length;
    this.itemRenderData = [];

    if (count === 0) {
      this._totalWidth = 0;
      this._totalHeight = 0;
      this._layoutDirty = false;
      return;
    }

    const cols = this.layout === 'grid' ? this.columns : this.layout === 'horizontal' ? count : 1;
    const rows = Math.ceil(count / cols);

    this._totalWidth = cols * this.itemWidth + (cols - 1) * this.itemGapX;
    this._totalHeight = rows * this.itemHeight + (rows - 1) * this.itemGapY;

    // 自动设置元素尺寸
    if (!this.width) this.width = this._totalWidth;
    if (!this.height) this.height = this._totalHeight;

    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);

      const x = col * (this.itemWidth + this.itemGapX);
      const y = row * (this.itemHeight + this.itemGapY);

      this.itemRenderData.push({
        x,
        y,
        width: this.itemWidth,
        height: this.itemHeight,
        state: 'normal',
        animX: 0,
        animAlpha: 1,
      });
    }

    this._layoutDirty = false;
  }

  /**
   * 获取布局列数
   */
  private getColumns(): number {
    if (this.layout === 'vertical') return 1;
    if (this.layout === 'horizontal') return this.items.length;
    return this.columns;
  }

  /**
   * 导航到指定方向
   */
  navigate(direction: 'up' | 'down' | 'left' | 'right'): boolean {
    const cols = this.getColumns();
    let newIndex = this.selectedIndex;

    switch (direction) {
      case 'up':
        newIndex = this.selectedIndex - cols;
        break;
      case 'down':
        newIndex = this.selectedIndex + cols;
        break;
      case 'left':
        newIndex = this.selectedIndex - 1;
        break;
      case 'right':
        newIndex = this.selectedIndex + 1;
        break;
    }

    if (this.wrapNavigation) {
      if (newIndex < 0) {
        newIndex = this.items.length + newIndex;
      } else if (newIndex >= this.items.length) {
        newIndex = newIndex % this.items.length;
      }
    }

    if (newIndex >= 0 && newIndex < this.items.length && newIndex !== this.selectedIndex) {
      const item = this.items[newIndex];
      if (!item.disabled) {
        this.selectedIndex = newIndex;
        this.onChange?.(item, newIndex);
        return true;
      }
    }

    return false;
  }

  /**
   * 确认选择
   */
  confirm(): boolean {
    const item = this.items[this.selectedIndex];
    if (item && !item.disabled) {
      this.onSelect?.(item, this.selectedIndex);
      return true;
    }
    return false;
  }

  /**
   * 取消
   */
  cancel(): void {
    this.onCancel?.();
  }

  /**
   * 处理键盘输入
   */
  handleKeyboard(keyCode: string, justPressed: boolean): boolean {
    if (!justPressed) return false;
    switch (keyCode) {
      case 'ArrowUp':
      case 'KeyW':
        return this.navigate('up');
      case 'ArrowDown':
      case 'KeyS':
        return this.navigate('down');
      case 'ArrowLeft':
      case 'KeyA':
        return this.navigate('left');
      case 'ArrowRight':
      case 'KeyD':
        return this.navigate('right');
      case 'Enter':
      case 'Space':
        return this.confirm();
      case 'Escape':
      case 'Backspace':
        this.cancel();
        return true;
    }

    return false;
  }

  /**
   * 处理手柄输入
   * @param axisX 左摇杆X轴 -1~1
   * @param axisY 左摇杆Y轴 -1~1
   * @param dpadUp D-Pad上
   * @param dpadDown D-Pad下
   * @param dpadLeft D-Pad左
   * @param dpadRight D-Pad右
   * @param confirmButton 确认按钮（Switch A / Xbox A / PS ✕）
   * @param cancelButton 取消按钮（Switch B / Xbox B / PS ○）
   * @param dt 帧时间
   */
  handleGamepad(
    axisX: number,
    axisY: number,
    dpadUp: boolean,
    dpadDown: boolean,
    dpadLeft: boolean,
    dpadRight: boolean,
    confirmButton: boolean,
    cancelButton: boolean,
    dt: number
  ): boolean {
    // 更新摇杆冷却
    if (this.joystickCooldown > 0) {
      this.joystickCooldown -= dt;
    }

    // D-Pad 导航
    if (dpadUp) return this.navigate('up');
    if (dpadDown) return this.navigate('down');
    if (dpadLeft) return this.navigate('left');
    if (dpadRight) return this.navigate('right');

    // 摇杆导航（带防抖，需要较大幅度才触发）
    if (this.joystickCooldown <= 0) {
      const threshold = this.joystickThreshold;
      let navigated = false;

      if (axisY < -threshold) {
        navigated = this.navigate('up');
      } else if (axisY > threshold) {
        navigated = this.navigate('down');
      } else if (axisX < -threshold) {
        navigated = this.navigate('left');
      } else if (axisX > threshold) {
        navigated = this.navigate('right');
      }

      if (navigated) {
        this.joystickCooldown = this.joystickDelay;
        return true;
      }
    }

    // 确认/取消按钮
    if (confirmButton) return this.confirm();
    if (cancelButton) {
      this.cancel();
      return true;
    }

    return false;
  }

  /**
   * 处理鼠标输入
   * @param x 鼠标 X 坐标
   * @param y 鼠标 Y 坐标
   * @param isDown 当前帧是否按下
   * @param justReleased 是否刚释放（上一帧按下，当前帧放开）
   */
  handleMouse(x: number, y: number, isDown: boolean, justReleased: boolean): boolean {
    this.computeLayout();

    const pos = this.getGlobalPosition();
    const localX = x - pos.x;
    const localY = y - pos.y;

    let hoverIndex = -1;

    // 检测悬停
    for (let i = 0; i < this.itemRenderData.length; i++) {
      const rd = this.itemRenderData[i];
      if (
        localX >= rd.x &&
        localX <= rd.x + rd.width &&
        localY >= rd.y &&
        localY <= rd.y + rd.height
      ) {
        hoverIndex = i;
        break;
      }
    }

    // 更新状态
    if (hoverIndex >= 0) {
      const item = this.items[hoverIndex];
      if (!item.disabled) {
        // 悬停切换选中
        if (this.selectedIndex !== hoverIndex) {
          this.selectedIndex = hoverIndex;
          this.onChange?.(item, hoverIndex);
        }

        // 按下状态
        if (isDown) {
          this.isPressed = true;
          this.pressedIndex = hoverIndex;
        } else if (justReleased && this.pressedIndex === hoverIndex) {
          // 点击完成：在同一个菜单项上按下并释放
          this.isPressed = false;
          this.pressedIndex = -1;
          this.onSelect?.(item, hoverIndex);
          return true;
        }
      }
    } else {
      // 鼠标移出菜单项时重置状态
      if (!isDown) {
        this.isPressed = false;
        this.pressedIndex = -1;
      }
    }

    if (!isDown) {
      this.isPressed = false;
    }

    return false;
  }

  /**
   * 更新
   */
  override update(dt: number): void {
    super.update(dt);

    this.computeLayout();

    // 更新脉冲动画
    this.pulseTime += dt * 0.001 * (this.indicatorStyle.pulseSpeed ?? 1);

    // 更新菜单项状态
    for (let i = 0; i < this.itemRenderData.length; i++) {
      const rd = this.itemRenderData[i];
      const item = this.items[i];

      if (item.disabled) {
        rd.state = 'disabled';
      } else if (i === this.pressedIndex && this.isPressed) {
        rd.state = 'pressed';
      } else if (i === this.selectedIndex) {
        rd.state = 'hover';
      } else {
        rd.state = 'normal';
      }
    }

    // 选中变化时的动画
    if (this.selectedIndex !== this.prevSelectedIndex) {
      if (this.prevSelectedIndex !== -1 && this.selectedIndex < this.itemRenderData.length) {
        // 简单的弹跳动画
        const rd = this.itemRenderData[this.selectedIndex];
        rd.animX = -8;
      }
      this.prevSelectedIndex = this.selectedIndex;
    }

    // 衰减动画
    for (const rd of this.itemRenderData) {
      if (rd.animX !== 0) {
        rd.animX *= 0.85;
        if (Math.abs(rd.animX) < 0.5) rd.animX = 0;
      }
    }
  }

  /**
   * 渲染
   */
  render(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return;

    this.computeLayout();

    const pos = this.getGlobalPosition();

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const rd = this.itemRenderData[i];

      const itemX = pos.x + rd.x + rd.animX;
      const itemY = pos.y + rd.y;
      const itemColor = item.color ?? this.style.backgroundColor ?? '#4a90d9';

      // 选中光晕
      if (i === this.selectedIndex && this.indicatorStyle.showGlow) {
        this.renderGlow(ctx, itemX, itemY, rd.width, rd.height, itemColor);
      }

      // 渲染菜单项
      this.renderItem(ctx, item, rd, itemX, itemY, itemColor);

      // 选中指示器
      if (i === this.selectedIndex) {
        this.renderIndicator(ctx, itemX, itemY, rd.width, rd.height, itemColor);
      }
    }
  }

  /**
   * 渲染光晕效果
   */
  private renderGlow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    color: string
  ): void {
    const pulse = Math.sin(this.pulseTime) * 0.3 + 0.7;
    const intensity = this.indicatorStyle.glowIntensity ?? 0.4;
    const glowColor = this.indicatorStyle.glowColor ?? color;
    const rgb = this.hexToRgb(glowColor);

    const centerX = x + w / 2;
    const centerY = y + h / 2;
    const radius = Math.max(w, h);

    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${intensity * pulse})`);
    gradient.addColorStop(0.5, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${intensity * 0.4 * pulse})`);
    gradient.addColorStop(1, 'transparent');

    ctx.fillStyle = gradient;
    ctx.fillRect(x - 50, y - 30, w + 100, h + 60);
  }

  /**
   * 渲染菜单项
   */
  private renderItem(
    ctx: CanvasRenderingContext2D,
    item: UIMenuItem,
    rd: MenuItemRenderData,
    x: number,
    y: number,
    itemColor: string
  ): void {
    const style = this.style;
    let bgColor: string;

    switch (rd.state) {
      case 'hover':
        bgColor = this.lightenColor(itemColor, 15);
        break;
      case 'pressed':
        bgColor = this.darkenColor(itemColor, 15);
        break;
      case 'disabled':
        bgColor = style.disabledBackgroundColor ?? '#666666';
        break;
      default:
        bgColor = itemColor;
    }

    // 背景
    ctx.beginPath();
    ctx.roundRect(x, y, rd.width, rd.height, style.borderRadius ?? 8);
    ctx.fillStyle = bgColor;
    ctx.fill();

    // 边框
    if (style.borderColor && style.borderColor !== 'transparent' && style.borderWidth) {
      ctx.strokeStyle = style.borderColor;
      ctx.lineWidth = style.borderWidth;
      ctx.stroke();
    }

    // 文字
    const textX = x + rd.width / 2;
    let textY = y + rd.height / 2;

    ctx.font = `${style.fontSize ?? 18}px ${style.fontFamily ?? 'sans-serif'}`;
    ctx.fillStyle =
      rd.state === 'disabled'
        ? style.disabledBackgroundColor
          ? '#999999'
          : '#666666'
        : (style.textColor ?? '#ffffff');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (item.description) {
      // 有描述时，文字上移
      textY -= (style.descriptionFontSize ?? 12) / 2 + 2;
      ctx.fillText(item.text, textX, textY);

      // 描述
      ctx.font = `${style.descriptionFontSize ?? 12}px ${style.fontFamily ?? 'sans-serif'}`;
      ctx.fillStyle = style.descriptionColor ?? 'rgba(255,255,255,0.7)';
      ctx.fillText(
        item.description,
        textX,
        textY + (style.fontSize ?? 18) / 2 + (style.descriptionFontSize ?? 12) / 2 + 4
      );
    } else {
      ctx.fillText(item.text, textX, textY);
    }
  }

  /**
   * 渲染选中指示器
   */
  private renderIndicator(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    itemColor: string
  ): void {
    const ind = this.indicatorStyle;
    const pulse = Math.sin(this.pulseTime * 2) * 0.2 + 0.8;
    const lighterColor = this.lightenColor(ind.arrowColor ?? itemColor, 40);

    ctx.save();

    // 边框
    if (ind.showBorder) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${pulse})`;
      ctx.lineWidth = ind.borderWidth ?? 3;
      ctx.shadowColor = lighterColor;
      ctx.shadowBlur = 20 * pulse;

      ctx.beginPath();
      ctx.roundRect(x - 3, y - 3, w + 6, h + 6, (this.style.borderRadius ?? 8) + 2);
      ctx.stroke();
    }

    // 箭头
    if (ind.showArrows) {
      const arrowOffset = Math.sin(this.pulseTime * 3) * 4;
      const arrowY = y + h / 2;

      ctx.fillStyle = lighterColor;
      ctx.shadowColor = lighterColor;
      ctx.shadowBlur = 12;

      // 左箭头
      const leftX = x - 22 + arrowOffset;
      ctx.beginPath();
      ctx.moveTo(leftX, arrowY - 10);
      ctx.lineTo(leftX + 14, arrowY);
      ctx.lineTo(leftX, arrowY + 10);
      ctx.closePath();
      ctx.fill();

      // 右箭头
      const rightX = x + w + 22 - arrowOffset;
      ctx.beginPath();
      ctx.moveTo(rightX, arrowY - 10);
      ctx.lineTo(rightX - 14, arrowY);
      ctx.lineTo(rightX, arrowY + 10);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * 辅助函数：hex转rgb
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const num = parseInt(hex.replace('#', ''), 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  }

  /**
   * 辅助函数：变亮
   */
  private lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
    const B = Math.min(255, (num & 0x0000ff) + amt);
    return `#${((1 << 24) | (R << 16) | (G << 8) | B).toString(16).slice(1)}`;
  }

  /**
   * 辅助函数：变暗
   */
  private darkenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00ff) - amt);
    const B = Math.max(0, (num & 0x0000ff) - amt);
    return `#${((1 << 24) | (R << 16) | (G << 8) | B).toString(16).slice(1)}`;
  }
}
