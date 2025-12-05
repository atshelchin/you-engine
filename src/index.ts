/**
 * You Engine
 * 轻量级、可插拔的 2D Canvas 游戏框架
 */

export type { EngineConfig } from './core/Engine';
// 核心模块
export { Engine } from './core/Engine';
export type {
  Collider,
  GameEntity,
  Lifecycle,
  Sprite,
  Tags,
  Transform,
  Velocity,
} from './core/Entity';
// 实体和组件
export {
  addTag,
  createCollider,
  createLifecycle,
  createSprite,
  createTransform,
  createVelocity,
  hasTag,
} from './core/Entity';
export { EventBus } from './core/EventBus';
export { ObjectPool } from './core/ObjectPool';
export type { SceneClass } from './core/Scene';
export { Scene } from './core/Scene';
export type { SystemClass } from './core/System';
export { System } from './core/System';
export * from './math/MathUtils';
// 数学工具
export { Vec2 } from './math/Vec2';
export type { SoundConfig, SoundInstance } from './systems/AudioSystem';
export { AudioSystem } from './systems/AudioSystem';
export type { CameraConfig } from './systems/CameraSystem';
export { CameraSystem } from './systems/CameraSystem';
export type { GamepadState, GamepadType, KeyState } from './systems/InputSystem';
// 系统
export { GamepadButton, InputSystem } from './systems/InputSystem';
export type { MatterBodyConfig, MatterComponent } from './systems/MatterPhysicsSystem';
export { MatterPhysicsSystem } from './systems/MatterPhysicsSystem';
export type { EmitterConfig, Particle, ParticleEmitter } from './systems/ParticleSystem';
export { ParticleSystem } from './systems/ParticleSystem';
export type { CollisionPair } from './systems/PhysicsSystem';
export { PhysicsSystem } from './systems/PhysicsSystem';
export { RenderSystem } from './systems/RenderSystem';
export type { EasingFunction, TweenOptions } from './systems/TweenSystem';
export { Easing, TweenSystem } from './systems/TweenSystem';
