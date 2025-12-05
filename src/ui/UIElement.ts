/**
 * UI 元素基类
 * 提供位置、尺寸、可见性、层级等基础功能
 */

/** UI 锚点 */
export type UIAnchor =
  | 'topLeft'
  | 'top'
  | 'topRight'
  | 'left'
  | 'center'
  | 'right'
  | 'bottomLeft'
  | 'bottom'
  | 'bottomRight';

/** UI 元素基础属性 */
export interface UIElementProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  anchor?: UIAnchor;
  visible?: boolean;
  alpha?: number;
  zIndex?: number;
}

/**
 * UI 元素基类
 */
export abstract class UIElement {
  x = 0;
  y = 0;
  width = 0;
  height = 0;
  anchor: UIAnchor = 'topLeft';
  visible = true;
  alpha = 1;
  zIndex = 0;
  parent: UIElement | null = null;
  children: UIElement[] = [];

  constructor(props: UIElementProps = {}) {
    Object.assign(this, props);
  }

  /**
   * 获取锚点偏移
   */
  protected getAnchorOffset(): { x: number; y: number } {
    switch (this.anchor) {
      case 'topLeft':
        return { x: 0, y: 0 };
      case 'top':
        return { x: this.width / 2, y: 0 };
      case 'topRight':
        return { x: this.width, y: 0 };
      case 'left':
        return { x: 0, y: this.height / 2 };
      case 'center':
        return { x: this.width / 2, y: this.height / 2 };
      case 'right':
        return { x: this.width, y: this.height / 2 };
      case 'bottomLeft':
        return { x: 0, y: this.height };
      case 'bottom':
        return { x: this.width / 2, y: this.height };
      case 'bottomRight':
        return { x: this.width, y: this.height };
    }
  }

  /**
   * 获取全局位置
   */
  getGlobalPosition(): { x: number; y: number } {
    const offset = this.getAnchorOffset();
    let gx = this.x - offset.x;
    let gy = this.y - offset.y;

    if (this.parent) {
      const parentPos = this.parent.getGlobalPosition();
      gx += parentPos.x;
      gy += parentPos.y;
    }

    return { x: gx, y: gy };
  }

  /**
   * 获取边界框
   */
  getBounds(): { x: number; y: number; width: number; height: number } {
    const pos = this.getGlobalPosition();
    return { x: pos.x, y: pos.y, width: this.width, height: this.height };
  }

  /**
   * 检查点是否在元素内
   */
  containsPoint(px: number, py: number): boolean {
    const bounds = this.getBounds();
    return (
      px >= bounds.x &&
      px <= bounds.x + bounds.width &&
      py >= bounds.y &&
      py <= bounds.y + bounds.height
    );
  }

  /**
   * 添加子元素
   */
  addChild(child: UIElement): this {
    if (child.parent) {
      child.parent.removeChild(child);
    }
    child.parent = this;
    this.children.push(child);
    this.children.sort((a, b) => a.zIndex - b.zIndex);
    return this;
  }

  /**
   * 移除子元素
   */
  removeChild(child: UIElement): this {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      this.children.splice(index, 1);
      child.parent = null;
    }
    return this;
  }

  /**
   * 移除所有子元素
   */
  removeAllChildren(): this {
    for (const child of this.children) {
      child.parent = null;
    }
    this.children.length = 0;
    return this;
  }

  /**
   * 更新（子类重写）
   */
  update(_dt: number): void {
    for (const child of this.children) {
      if (child.visible) child.update(_dt);
    }
  }

  /**
   * 渲染（子类重写）
   */
  abstract render(ctx: CanvasRenderingContext2D): void;

  /**
   * 渲染自身和子元素
   */
  renderAll(ctx: CanvasRenderingContext2D): void {
    if (!this.visible || this.alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha *= this.alpha;

    this.render(ctx);

    for (const child of this.children) {
      child.renderAll(ctx);
    }

    ctx.restore();
  }
}
