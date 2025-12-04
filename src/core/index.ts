// 核心模块导出
export { Engine } from './Engine';
export type { EngineConfig } from './Engine';

export { System } from './System';
export type { SystemClass } from './System';

export { Scene } from './Scene';
export type { SceneClass } from './Scene';

export { EventBus } from './EventBus';

export { ObjectPool } from './ObjectPool';

export {
  createTransform,
  createVelocity,
  createSprite,
  createCollider,
} from './Entity';

export type {
  GameEntity,
  Transform,
  Velocity,
  Sprite,
  Collider,
  Lifecycle,
  Tags,
} from './Entity';
