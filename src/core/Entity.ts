/**
 * 实体类型定义
 * 使用 miniplex 的实体是普通对象，这里定义基础组件接口
 */

/** 变换组件 */
export interface Transform {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

/** 速度组件 */
export interface Velocity {
  x: number;
  y: number;
  /** 角速度 */
  angularVelocity?: number;
  /** 阻尼 */
  damping?: number;
}

/** 精灵组件 */
export interface Sprite {
  texture?: string;
  width: number;
  height: number;
  color?: string;
  alpha: number;
  visible: boolean;
  /** 自定义渲染函数 */
  render?: (ctx: CanvasRenderingContext2D, entity: GameEntity) => void;
}

/** 碰撞体组件 */
export interface Collider {
  type: 'circle' | 'rect';
  radius?: number;
  width?: number;
  height?: number;
  /** 碰撞层（数字位掩码） */
  layer?: number;
  /** 碰撞掩码 */
  mask?: number;
  /** 是否为触发器（不产生物理响应） */
  isTrigger?: boolean;
  /** 偏移 */
  offsetX?: number;
  offsetY?: number;
}

/** 生命周期组件 */
export interface Lifecycle {
  /** 是否存活 */
  alive: boolean;
  /** 生命时长（帧数，-1 表示永久） */
  lifetime: number;
  /** 已存活帧数 */
  age: number;
}

/** 标签组件 */
export interface Tags {
  values: string[];
}

/** 游戏实体基础类型 */
export interface GameEntity {
  /** 实体 ID（可选，用于调试） */
  id?: string;

  /** 变换 */
  transform?: Transform;

  /** 速度 */
  velocity?: Velocity;

  /** 精灵 */
  sprite?: Sprite;

  /** 碰撞体 */
  collider?: Collider;

  /** 生命周期 */
  lifecycle?: Lifecycle;

  /** 标签 */
  tags?: Tags;

  /** 自定义更新函数 */
  onUpdate?: (dt: number) => void;

  /** 自定义渲染函数 */
  onRender?: (ctx: CanvasRenderingContext2D) => void;

  /** 销毁时调用 */
  onDestroy?: () => void;

  /** 允许扩展任意属性 */
  [key: string]: unknown;
}

/** 创建变换组件的辅助函数 */
export function createTransform(x = 0, y = 0, rotation = 0, scaleX = 1, scaleY = 1): Transform {
  return { x, y, rotation, scaleX, scaleY };
}

/** 创建速度组件的辅助函数 */
export function createVelocity(x = 0, y = 0): Velocity {
  return { x, y };
}

/** 创建精灵组件的辅助函数 */
export function createSprite(options: Partial<Sprite> = {}): Sprite {
  return {
    width: options.width ?? 32,
    height: options.height ?? 32,
    color: options.color,
    texture: options.texture,
    alpha: options.alpha ?? 1,
    visible: options.visible ?? true,
    render: options.render,
  };
}

/** 创建碰撞体组件的辅助函数 */
export function createCollider(type: 'circle' | 'rect', options: Partial<Collider> = {}): Collider {
  return {
    type,
    radius: options.radius,
    width: options.width,
    height: options.height,
    layer: options.layer ?? 0x0001,
    mask: options.mask ?? 0xffff,
    isTrigger: options.isTrigger ?? false,
    offsetX: options.offsetX ?? 0,
    offsetY: options.offsetY ?? 0,
  };
}

/** 创建生命周期组件 */
export function createLifecycle(lifetime = -1): Lifecycle {
  return {
    alive: true,
    lifetime,
    age: 0,
  };
}

/** 检查实体是否有标签 */
export function hasTag(entity: GameEntity, tag: string): boolean {
  return entity.tags?.values.includes(tag) ?? false;
}

/** 添加标签 */
export function addTag(entity: GameEntity, ...tags: string[]): void {
  if (!entity.tags) {
    entity.tags = { values: [] };
  }
  tags.forEach((tag) => {
    if (!entity.tags!.values.includes(tag)) {
      entity.tags!.values.push(tag);
    }
  });
}
