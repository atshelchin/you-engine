// 系统导出
export { InputSystem, GamepadButton } from './InputSystem';
export type { KeyState, GamepadState, GamepadType } from './InputSystem';

export { RenderSystem } from './RenderSystem';

export { CameraSystem } from './CameraSystem';
export type { CameraConfig } from './CameraSystem';

export { PhysicsSystem } from './PhysicsSystem';
export type { CollisionPair } from './PhysicsSystem';

export { MatterPhysicsSystem } from './MatterPhysicsSystem';
export type { MatterBodyConfig, MatterComponent } from './MatterPhysicsSystem';

export { AudioSystem } from './AudioSystem';
export type { SoundConfig, SoundInstance } from './AudioSystem';

export { TweenSystem, Easing } from './TweenSystem';
export type { TweenOptions, EasingFunction } from './TweenSystem';

export { ParticleSystem } from './ParticleSystem';
export type { Particle, EmitterConfig, ParticleEmitter } from './ParticleSystem';

// 等距视角系统
export {
  IsometricSystem,
  createIsometricTransform,
  createIsometricSprite,
} from './IsometricSystem';
export type {
  IsometricConfig,
  IsometricTransform,
  IsometricSprite,
  DepthKey,
} from './IsometricSystem';

export { IsometricRenderSystem } from './IsometricRenderSystem';
export type { RenderLayer } from './IsometricRenderSystem';
