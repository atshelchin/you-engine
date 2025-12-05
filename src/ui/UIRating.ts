/**
 * UI 星级评分组件
 * 支持半星、只读模式、自定义星星数量
 */

import { UIElement, type UIElementProps } from './UIElement';
import { getNavigationManager } from './UINavigationManager';

/** 评分组件属性 */
export interface UIRatingProps extends UIElementProps {
  /** 当前评分（0-maxStars） */
  value?: number;
  /** 最大星星数量 */
  maxStars?: number;
  /** 星星大小 */
  starSize?: number;
  /** 星星间距 */
  spacing?: number;
  /** 是否允许半星 */
  allowHalf?: boolean;
  /** 是否只读 */
  readonly?: boolean;
  /** 填充颜色（激活的星星） */
  fillColor?: string;
  /** 空白颜色（未激活的星星） */
  emptyColor?: string;
  /** 边框颜色 */
  strokeColor?: string;
  /** 边框宽度 */
  strokeWidth?: number;
  /** 评分改变回调 */
  onChange?: (value: number) => void;
  /** 是否自动注册到导航系统 */
  autoRegisterNavigation?: boolean;
}

/**
 * UI 星级评分
 */
export class UIRating extends UIElement {
  value = 0;
  maxStars = 5;
  starSize = 30;
  spacing = 5;
  allowHalf = true;
  readonly = false;
  fillColor = '#ffd700'; // 金色
  emptyColor = '#444444';
  strokeColor = '#666666';
  strokeWidth = 1;
  onChange?: (value: number) => void;

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

  /** 悬停状态的评分 */
  private hoverValue = 0;

  constructor(props: UIRatingProps = {}) {
    super(props);
    Object.assign(this, props);

    // 自动计算尺寸
    if (!this.width) {
      this.width = this.maxStars * (this.starSize + this.spacing) - this.spacing;
    }
    if (!this.height) {
      this.height = this.starSize;
    }

    // 自动注册到全局导航管理器
    if (this.autoRegisterNavigation && !this.readonly) {
      getNavigationManager().register(this);
      this._registered = true;
    }
  }

  /**
   * 设置评分
   */
  setValue(value: number): this {
    const newValue = Math.max(0, Math.min(this.maxStars, value));
    if (this.value !== newValue) {
      this.value = newValue;
      this.onChange?.(this.value);
    }
    return this;
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
    if (this.readonly || !this.enabled) return;
    // 导航确认时增加一颗星
    const newValue = Math.min(this.maxStars, Math.ceil(this.value) + 1);
    this.setValue(newValue);
  };

  /**
   * 处理点击
   */
  handleClick(x: number, _y: number): boolean {
    if (!this.visible || !this.enabled || this.readonly) return false;

    const pos = this.getGlobalPosition();
    const relX = x - pos.x;

    if (relX >= 0 && relX <= this.width) {
      const starIndex = Math.floor(relX / (this.starSize + this.spacing));
      const starRelX = relX % (this.starSize + this.spacing);

      let newValue = starIndex + 1;

      // 半星支持
      if (this.allowHalf && starRelX < this.starSize / 2) {
        newValue = starIndex + 0.5;
      }

      this.setValue(newValue);
      return true;
    }

    return false;
  }

  /**
   * 处理鼠标移动（悬停预览）
   */
  handleMove(x: number, _y: number): void {
    if (!this.visible || !this.enabled || this.readonly) return;

    const pos = this.getGlobalPosition();
    const relX = x - pos.x;

    if (relX >= 0 && relX <= this.width) {
      const starIndex = Math.floor(relX / (this.starSize + this.spacing));
      const starRelX = relX % (this.starSize + this.spacing);

      this.hoverValue = starIndex + 1;

      if (this.allowHalf && starRelX < this.starSize / 2) {
        this.hoverValue = starIndex + 0.5;
      }
    } else {
      this.hoverValue = 0;
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
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    const displayValue = this.hoverValue > 0 ? this.hoverValue : this.value;

    // 绘制每颗星星
    for (let i = 0; i < this.maxStars; i++) {
      const starX = pos.x + i * (this.starSize + this.spacing);
      const starY = pos.y;

      const fillAmount = Math.max(0, Math.min(1, displayValue - i));

      this.drawStar(ctx, starX, starY, fillAmount);
    }

    ctx.restore();
  }

  /**
   * 绘制单颗星星
   */
  private drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, fillAmount: number): void {
    const cx = x + this.starSize / 2;
    const cy = y + this.starSize / 2;
    const outerRadius = this.starSize / 2;
    const innerRadius = outerRadius * 0.4;
    const spikes = 5;

    // 创建星星路径
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const angle = (Math.PI / spikes) * i - Math.PI / 2;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const px = cx + Math.cos(angle) * radius;
      const py = cy + Math.sin(angle) * radius;

      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // 绘制填充部分
    if (fillAmount > 0) {
      ctx.save();

      if (fillAmount < 1) {
        // 半星：使用裁剪
        ctx.clip();
        ctx.fillStyle = this.emptyColor;
        ctx.fill();

        // 重新绘制填充部分
        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
          const angle = (Math.PI / spikes) * i - Math.PI / 2;
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const px = cx + Math.cos(angle) * radius;
          const py = cy + Math.sin(angle) * radius;

          if (i === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.closePath();

        const clipWidth = this.starSize * fillAmount;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, clipWidth, this.starSize);
        ctx.clip();

        ctx.fillStyle = this.fillColor;
        ctx.fill();

        ctx.restore();
      } else {
        // 满星
        ctx.fillStyle = this.fillColor;
        ctx.fill();
      }

      ctx.restore();
    } else {
      // 空星
      ctx.fillStyle = this.emptyColor;
      ctx.fill();
    }

    // 绘制边框
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const angle = (Math.PI / spikes) * i - Math.PI / 2;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const px = cx + Math.cos(angle) * radius;
      const py = cy + Math.sin(angle) * radius;

      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();

    ctx.strokeStyle = this.strokeColor;
    ctx.lineWidth = this.strokeWidth;
    ctx.stroke();
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
