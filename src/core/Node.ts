/**
 * Node - You Engine 3.0 核心
 *
 * 设计理念：
 * 1. 极简 - 只有必要的功能
 * 2. 强大 - 场景图 + 组件 + 信号
 * 3. 快速 - 优化的更新和渲染
 */

export type NodeConfig = {
  name?: string;
  x?: number;
  y?: number;
  z?: number;
  rotation?: number;
  scale?: number;
  visible?: boolean;
  active?: boolean;
};

export interface IComponent {
  node: Node;
  enabled: boolean;
  onInit?(): void;
  onUpdate?(dt: number): void;
  onRender?(ctx: CanvasRenderingContext2D): void;
  onDestroy?(): void;
}

/**
 * Node - 游戏对象基类
 *
 * 像 React Component，像 Unity GameObject，像 Godot Node
 * 但更简单、更直接、更强大
 */
export class Node {
  // 基础属性
  name: string;
  x = 0;
  y = 0;
  z = 0;
  rotation = 0;
  scale = 1;
  visible = true;
  active = true;

  // 场景图
  parent: Node | null = null;
  readonly children: Node[] = [];

  // 组件系统
  readonly components: IComponent[] = [];

  // 生命周期
  private _initialized = false;
  private _destroyed = false;

  // 引擎引用
  engine: unknown = null;
  scene: unknown = null;

  constructor(config: NodeConfig = {}) {
    this.name = config.name || 'Node';
    this.x = config.x ?? 0;
    this.y = config.y ?? 0;
    this.z = config.z ?? 0;
    this.rotation = config.rotation ?? 0;
    this.scale = config.scale ?? 1;
    this.visible = config.visible ?? true;
    this.active = config.active ?? true;
  }

  // ==================== 生命周期（子类可覆盖）====================

  onInit(): void {}
  onUpdate(_dt: number): void {}
  onRender(_ctx: CanvasRenderingContext2D): void {}
  onDestroy(): void {}

  // ==================== 内部生命周期 ====================

  _init(): void {
    if (this._initialized) return;

    this.onInit();

    for (const comp of this.components) {
      comp.onInit?.();
    }

    for (const child of this.children) {
      child._init();
    }

    this._initialized = true;
  }

  _update(dt: number): void {
    if (!this.active || this._destroyed) return;

    this.onUpdate(dt);

    for (const comp of this.components) {
      if (comp.enabled) comp.onUpdate?.(dt);
    }

    for (const child of this.children) {
      child._update(dt);
    }
  }

  _render(ctx: CanvasRenderingContext2D): void {
    if (!this.visible || this._destroyed) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.scale(this.scale, this.scale);

    this.onRender(ctx);

    for (const comp of this.components) {
      if (comp.enabled) comp.onRender?.(ctx);
    }

    for (const child of this.children) {
      child._render(ctx);
    }

    ctx.restore();
  }

  // ==================== 场景图 ====================

  add(child: Node): Node {
    if (child.parent) {
      child.parent.remove(child);
    }

    child.parent = this;
    child.engine = this.engine;
    child.scene = this.scene;
    this.children.push(child);

    if (this._initialized) {
      child._init();
    }

    return child;
  }

  remove(child: Node): void {
    const index = this.children.indexOf(child);
    if (index >= 0) {
      child.parent = null;
      this.children.splice(index, 1);
    }
  }

  getParent(): Node | null {
    return this.parent;
  }

  getChildren(): Node[] {
    return this.children;
  }

  find(name: string): Node | null {
    if (this.name === name) return this;

    for (const child of this.children) {
      const found = child.find(name);
      if (found) return found;
    }

    return null;
  }

  // ==================== 组件系统 ====================

  addComponent<T extends IComponent, Args extends unknown[] = unknown[]>(
    ComponentClass: new (...args: Args) => T,
    ...args: Args
  ): T {
    const comp = new ComponentClass(...args);
    comp.node = this;
    this.components.push(comp);

    if (this._initialized) {
      comp.onInit?.();
    }

    return comp;
  }

  getComponent<T extends IComponent>(ComponentClass: new () => T): T | null {
    for (const comp of this.components) {
      if (comp instanceof ComponentClass) {
        return comp as T;
      }
    }
    return null;
  }

  removeComponent(comp: IComponent): void {
    const index = this.components.indexOf(comp);
    if (index >= 0) {
      comp.onDestroy?.();
      this.components.splice(index, 1);
    }
  }

  // ==================== 变换（支持父子关系）====================

  getWorldPosition(): { x: number; y: number; z: number } {
    if (!this.parent) {
      return { x: this.x, y: this.y, z: this.z };
    }

    const parentPos = this.parent.getWorldPosition();
    const cos = Math.cos(this.parent.rotation);
    const sin = Math.sin(this.parent.rotation);

    return {
      x: parentPos.x + this.x * cos - this.y * sin,
      y: parentPos.y + this.x * sin + this.y * cos,
      z: parentPos.z + this.z,
    };
  }

  getWorldRotation(): number {
    if (!this.parent) return this.rotation;
    return this.parent.getWorldRotation() + this.rotation;
  }

  getWorldScale(): number {
    if (!this.parent) return this.scale;
    return this.parent.getWorldScale() * this.scale;
  }

  // ==================== 工具方法 ====================

  setPosition(x: number, y: number, z: number = 0): this {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  translate(dx: number, dy: number, dz: number = 0): this {
    this.x += dx;
    this.y += dy;
    this.z += dz;
    return this;
  }

  rotate(angle: number): this {
    this.rotation += angle;
    return this;
  }

  setScale(scale: number): this {
    this.scale = scale;
    return this;
  }

  show(): this {
    this.visible = true;
    return this;
  }

  hide(): this {
    this.visible = false;
    return this;
  }

  enable(): this {
    this.active = true;
    return this;
  }

  disable(): this {
    this.active = false;
    return this;
  }

  destroy(): void {
    if (this._destroyed) return;

    for (const child of [...this.children]) {
      child.destroy();
    }

    for (const comp of this.components) {
      comp.onDestroy?.();
    }

    this.onDestroy();

    if (this.parent) {
      this.parent.remove(this);
    }

    this._destroyed = true;
  }

  isDestroyed(): boolean {
    return this._destroyed;
  }
}
