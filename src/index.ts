/**
 * You Engine
 * 轻量级、可插拔的 2D Canvas 游戏框架
 */

// 核心模块
export { Engine } from './core/Engine';
export type { EngineConfig } from './core/Engine';

export { System } from './core/System';
export type { SystemClass } from './core/System';

export { Scene } from './core/Scene';
export type { SceneClass } from './core/Scene';

export { EventBus } from './core/EventBus';
export { ObjectPool } from './core/ObjectPool';

// 实体和组件
export {
  createTransform,
  createVelocity,
  createSprite,
  createCollider,
  createLifecycle,
  hasTag,
  addTag,
} from './core/Entity';

export type {
  GameEntity,
  Transform,
  Velocity,
  Sprite,
  Collider,
  Lifecycle,
  Tags,
} from './core/Entity';

// 系统
export { InputSystem, GamepadButton } from './systems/InputSystem';
export type { KeyState, GamepadState, GamepadType } from './systems/InputSystem';

export { RenderSystem } from './systems/RenderSystem';

export { CameraSystem } from './systems/CameraSystem';
export type { CameraConfig } from './systems/CameraSystem';

export { PhysicsSystem } from './systems/PhysicsSystem';
export type { CollisionPair } from './systems/PhysicsSystem';

export { MatterPhysicsSystem } from './systems/MatterPhysicsSystem';
export type { MatterBodyConfig, MatterComponent } from './systems/MatterPhysicsSystem';

export { AudioSystem } from './systems/AudioSystem';
export type { SoundConfig, SoundInstance } from './systems/AudioSystem';

export { TweenSystem, Easing } from './systems/TweenSystem';
export type { TweenOptions, EasingFunction } from './systems/TweenSystem';

export { ParticleSystem } from './systems/ParticleSystem';
export type { Particle, EmitterConfig, ParticleEmitter } from './systems/ParticleSystem';

// 等距视角系统 (Isometric)
export {
  IsometricSystem,
  createIsometricTransform,
  createIsometricSprite,
} from './systems/IsometricSystem';
export type {
  IsometricConfig,
  IsometricTransform,
  IsometricSprite,
  DepthKey,
} from './systems/IsometricSystem';

export { IsometricRenderSystem } from './systems/IsometricRenderSystem';
export type { RenderLayer } from './systems/IsometricRenderSystem';

// 数学工具
export { Vec2 } from './math/Vec2';
export * from './math/MathUtils';
