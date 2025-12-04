/**
 * You Engine v3 - Components
 *
 * 所有内置组件的统一导出
 */

// ==================== 渲染组件 ====================
export {
  CircleRenderer,
  RectRenderer,
  SpriteRenderer,
  AnimatedSprite,
  TextRenderer,
  type CircleConfig,
  type RectConfig,
  type SpriteConfig,
  type AnimatedSpriteConfig,
  type TextConfig,
  type AnimationConfig,
} from './Renderer';

// ==================== 遮罩渲染 ====================
export { MaskedSprite, Masks, type MaskedSpriteConfig, type MaskShape } from './MaskedRenderer';

// ==================== 等距视角 ====================
export {
  IsometricView,
  IsometricRenderer,
  IsometricTile,
  type IsometricConfig,
  type IsometricTileConfig,
} from './Isometric';

// ==================== 物理引擎 ====================
export {
  PhysicsBody,
  PhysicsWorld,
  type PhysicsBodyConfig,
  type PhysicsWorldConfig,
  type PhysicsBodyType,
  type CollisionShape,
} from './Physics';

// ==================== 相机系统 ====================
export { Camera, type CameraConfig } from './Camera';

// ==================== 粒子系统 ====================
export { ParticleEmitter, ParticlePresets, type ParticleEmitterConfig } from './Particles';

// ==================== 动画系统 ====================
export {
  Tween,
  KeyframeAnimation,
  SequenceAnimation,
  Animate,
  Easing,
  type TweenConfig,
  type KeyframeAnimationConfig,
  type EasingFunction,
  type Keyframe,
  type SequenceStep,
} from './Animation';

// ==================== 输入系统 ====================
export { Input, InputManager, Keys, GamepadButtons, type GamepadType } from './Input';

// ==================== 音频系统 ====================
export { AudioPlayer, MusicPlayer, AudioManager } from './Audio';
