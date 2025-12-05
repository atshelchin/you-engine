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
  angularVelocity?: number;
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
  render?: (ctx: CanvasRenderingContext2D, entity: GameEntity) => void;
}

/** 碰撞体组件 */
export interface Collider {
  type: 'circle' | 'rect';
  radius?: number;
  width?: number;
  height?: number;
  layer?: number;
  mask?: number;
  isTrigger?: boolean;
  offsetX?: number;
  offsetY?: number;
}

/** 生命周期组件 */
export interface Lifecycle {
  alive: boolean;
  lifetime: number;
  age: number;
}

/** 标签组件 */
export interface Tags {
  values: string[];
}

/** 游戏实体基础类型 */
export interface GameEntity {
  id?: string;
  transform?: Transform;
  velocity?: Velocity;
  sprite?: Sprite;
  collider?: Collider;
  lifecycle?: Lifecycle;
  tags?: Tags;
  onUpdate?: (dt: number) => void;
  onRender?: (ctx: CanvasRenderingContext2D) => void;
  onDestroy?: () => void;
  [key: string]: unknown;
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
  for (const tag of tags) {
    if (!entity.tags.values.includes(tag)) {
      entity.tags.values.push(tag);
    }
  }
}
