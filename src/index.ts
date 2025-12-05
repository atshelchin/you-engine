/**
 * You Engine - 轻量级 2D Canvas 游戏框架
 */

// 核心
export type { EngineConfig } from './core/Engine';
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
export { addTag, hasTag } from './core/Entity';
export { EventBus } from './core/EventBus';
export { ObjectPool } from './core/ObjectPool';
export type { SceneClass } from './core/Scene';
export { Scene } from './core/Scene';
export type { SystemClass } from './core/System';
export { System } from './core/System';

// 数学
export * from './math';

// 系统
export type { SoundConfig, SoundInstance } from './systems/AudioSystem';
export { AudioSystem } from './systems/AudioSystem';
export type { CameraConfig } from './systems/CameraSystem';
export { CameraSystem } from './systems/CameraSystem';
export type { GamepadState, GamepadType, KeyState } from './systems/InputSystem';
export { GamepadButton, InputSystem } from './systems/InputSystem';
export type { MatterBodyConfig, MatterComponent } from './systems/MatterPhysicsSystem';
export { MatterPhysicsSystem } from './systems/MatterPhysicsSystem';
export type { EmitterConfig, Particle, ParticleEmitter } from './systems/ParticleSystem';
export { ParticleSystem } from './systems/ParticleSystem';
export { RenderSystem } from './systems/RenderSystem';
export type { EasingFunction, TweenOptions } from './systems/TweenSystem';
export { Easing, TweenSystem } from './systems/TweenSystem';
