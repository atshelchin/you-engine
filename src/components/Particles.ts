/**
 * Particle System Component - 粒子系统组件
 *
 * 支持各种粒子效果:爆炸、火焰、烟雾、星星等
 */

import { Component } from '../core/Component';

// ==================== 粒子定义 ====================

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
  rotation: number;
  angularVelocity: number;
}

// ==================== 粒子发射器配置 ====================

export interface ParticleEmitterConfig {
  // 发射速率
  emitRate?: number; // 每秒发射数量
  emitCount?: number; // 每次发射数量
  maxParticles?: number; // 最大粒子数

  // 粒子生命周期
  particleLife?: number; // 粒子生命(秒)
  particleLifeVariance?: number;

  // 发射形状
  emitShape?: 'point' | 'circle' | 'rect' | 'cone';
  emitRadius?: number; // 圆形/圆锥半径
  emitAngle?: number; // 圆锥角度
  emitDirection?: number; // 发射方向(弧度)

  // 粒子速度
  speed?: number;
  speedVariance?: number;

  // 粒子大小
  size?: number;
  sizeVariance?: number;
  sizeOverLife?: (t: number) => number; // 生命周期大小变化

  // 粒子颜色
  color?: string | string[];
  alphaOverLife?: (t: number) => number; // 生命周期透明度变化

  // 重力和加速度
  gravity?: { x: number; y: number };
  acceleration?: { x: number; y: number };

  // 旋转
  rotation?: number;
  rotationVariance?: number;
  angularVelocity?: number;
  angularVelocityVariance?: number;

  // 自动发射
  autoEmit?: boolean;

  // 持续时间 (-1 = 永久)
  duration?: number;
}

// ==================== 粒子发射器组件 ====================

export class ParticleEmitter extends Component {
  // 配置
  emitRate: number;
  emitCount: number;
  maxParticles: number;
  autoEmit: boolean;
  duration: number;

  particleLife: number;
  particleLifeVariance: number;

  emitShape: 'point' | 'circle' | 'rect' | 'cone';
  emitRadius: number;
  emitAngle: number;
  emitDirection: number;

  speed: number;
  speedVariance: number;

  size: number;
  sizeVariance: number;
  sizeOverLife: (t: number) => number;

  color: string[];
  alphaOverLife: (t: number) => number;

  gravity: { x: number; y: number };
  acceleration: { x: number; y: number };

  rotation: number;
  rotationVariance: number;
  angularVelocity: number;
  angularVelocityVariance: number;

  // 内部状态
  private particles: Particle[] = [];
  private emitTimer = 0;
  private durationTimer = 0;
  private isActive = true;

  constructor(config: ParticleEmitterConfig = {}) {
    super();

    this.emitRate = config.emitRate || 10;
    this.emitCount = config.emitCount || 1;
    this.maxParticles = config.maxParticles || 100;
    this.autoEmit = config.autoEmit ?? true;
    this.duration = config.duration ?? -1;

    this.particleLife = config.particleLife || 1.0;
    this.particleLifeVariance = config.particleLifeVariance || 0.2;

    this.emitShape = config.emitShape || 'point';
    this.emitRadius = config.emitRadius || 10;
    this.emitAngle = config.emitAngle || Math.PI / 4;
    this.emitDirection = config.emitDirection || 0;

    this.speed = config.speed || 50;
    this.speedVariance = config.speedVariance || 20;

    this.size = config.size || 5;
    this.sizeVariance = config.sizeVariance || 2;
    this.sizeOverLife = config.sizeOverLife || ((t) => 1 - t * 0.5);

    const colors = Array.isArray(config.color) ? config.color : [config.color || '#ffffff'];
    this.color = colors;
    this.alphaOverLife = config.alphaOverLife || ((t) => 1 - t);

    this.gravity = config.gravity || { x: 0, y: 0 };
    this.acceleration = config.acceleration || { x: 0, y: 0 };

    this.rotation = config.rotation || 0;
    this.rotationVariance = config.rotationVariance || 0;
    this.angularVelocity = config.angularVelocity || 0;
    this.angularVelocityVariance = config.angularVelocityVariance || 0;
  }

  // ==================== 控制 ====================

  /**
   * 发射粒子
   */
  emit(count?: number): void {
    const n = count || this.emitCount;

    for (let i = 0; i < n && this.particles.length < this.maxParticles; i++) {
      this.particles.push(this.createParticle());
    }
  }

  /**
   * 爆发(一次性发射大量粒子)
   */
  burst(count: number): void {
    this.emit(count);
  }

  /**
   * 开始发射
   */
  start(): void {
    this.isActive = true;
    this.durationTimer = 0;
  }

  /**
   * 停止发射
   */
  stop(): void {
    this.isActive = false;
  }

  /**
   * 清除所有粒子
   */
  clear(): void {
    this.particles = [];
  }

  // ==================== 更新 ====================

  onUpdate(dt: number): void {
    // 更新持续时间
    if (this.duration > 0 && this.isActive) {
      this.durationTimer += dt;
      if (this.durationTimer >= this.duration) {
        this.isActive = false;
      }
    }

    // 自动发射
    if (this.autoEmit && this.isActive) {
      this.emitTimer += dt;
      const emitInterval = 1 / this.emitRate;

      while (this.emitTimer >= emitInterval) {
        this.emit();
        this.emitTimer -= emitInterval;
      }
    }

    // 更新粒子
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // 更新生命
      p.life -= dt;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      // 更新速度
      p.vx += (this.gravity.x + this.acceleration.x) * dt;
      p.vy += (this.gravity.y + this.acceleration.y) * dt;

      // 更新位置
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // 更新旋转
      p.rotation += p.angularVelocity * dt;

      // 更新透明度和大小
      const t = 1 - p.life / p.maxLife;
      p.alpha = this.alphaOverLife(t);
      p.size = this.size * this.sizeOverLife(t);
    }
  }

  // ==================== 渲染 ====================

  onRender(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = p.alpha;

      // 绘制粒子（简单圆形）
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // ==================== 私有方法 ====================

  private createParticle(): Particle {
    // 位置
    let x = 0;
    let y = 0;

    if (this.emitShape === 'circle') {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * this.emitRadius;
      x = Math.cos(angle) * radius;
      y = Math.sin(angle) * radius;
    } else if (this.emitShape === 'rect') {
      x = (Math.random() - 0.5) * this.emitRadius * 2;
      y = (Math.random() - 0.5) * this.emitRadius * 2;
    }

    // 速度方向
    let angle = this.emitDirection;

    if (this.emitShape === 'cone') {
      angle += (Math.random() - 0.5) * this.emitAngle;
    } else if (this.emitShape === 'point') {
      angle = Math.random() * Math.PI * 2;
    }

    const speed = this.speed + (Math.random() - 0.5) * this.speedVariance * 2;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    // 生命
    const life = this.particleLife + (Math.random() - 0.5) * this.particleLifeVariance * 2;

    // 颜色
    const color = this.color[Math.floor(Math.random() * this.color.length)];

    // 旋转
    const rotation = this.rotation + (Math.random() - 0.5) * this.rotationVariance * 2;
    const angularVelocity =
      this.angularVelocity + (Math.random() - 0.5) * this.angularVelocityVariance * 2;

    return {
      x,
      y,
      vx,
      vy,
      life,
      maxLife: life,
      size: this.size + (Math.random() - 0.5) * this.sizeVariance * 2,
      color,
      alpha: 1,
      rotation,
      angularVelocity,
    };
  }
}

// ==================== 预制粒子效果 ====================

/**
 * 粒子效果工厂
 */
export const ParticlePresets = {
  /**
   * 爆炸效果
   */
  explosion(config?: Partial<ParticleEmitterConfig>): ParticleEmitterConfig {
    return {
      autoEmit: false,
      maxParticles: 50,
      emitCount: 50,
      emitShape: 'point',
      particleLife: 1.0,
      speed: 200,
      speedVariance: 100,
      size: 8,
      sizeVariance: 4,
      color: ['#ff6b6b', '#ffa500', '#ffff00'],
      sizeOverLife: (t) => (1 - t) * (1 - t),
      alphaOverLife: (t) => 1 - t,
      gravity: { x: 0, y: 100 },
      ...config,
    };
  },

  /**
   * 火焰效果
   */
  fire(config?: Partial<ParticleEmitterConfig>): ParticleEmitterConfig {
    return {
      autoEmit: true,
      emitRate: 30,
      emitShape: 'circle',
      emitRadius: 10,
      particleLife: 1.5,
      speed: 50,
      speedVariance: 20,
      size: 12,
      color: ['#ff4500', '#ffa500', '#ffff00'],
      sizeOverLife: (t) => 1 - t * 0.8,
      alphaOverLife: (t) => 1 - t * t,
      gravity: { x: 0, y: -80 },
      ...config,
    };
  },

  /**
   * 烟雾效果
   */
  smoke(config?: Partial<ParticleEmitterConfig>): ParticleEmitterConfig {
    return {
      autoEmit: true,
      emitRate: 20,
      emitShape: 'circle',
      emitRadius: 15,
      particleLife: 2.0,
      speed: 30,
      speedVariance: 10,
      size: 20,
      sizeVariance: 10,
      color: ['#888888', '#666666', '#444444'],
      sizeOverLife: (t) => 1 + t * 0.5,
      alphaOverLife: (t) => (1 - t) * 0.5,
      gravity: { x: 0, y: -20 },
      ...config,
    };
  },

  /**
   * 星星闪烁
   */
  stars(config?: Partial<ParticleEmitterConfig>): ParticleEmitterConfig {
    return {
      autoEmit: true,
      emitRate: 10,
      emitShape: 'rect',
      emitRadius: 50,
      particleLife: 2.0,
      speed: 10,
      speedVariance: 5,
      size: 4,
      sizeVariance: 2,
      color: ['#ffffff', '#ffff00', '#00ffff'],
      sizeOverLife: (t) => 1 + Math.sin(t * Math.PI * 4) * 0.5,
      alphaOverLife: (t) => Math.sin(t * Math.PI),
      ...config,
    };
  },

  /**
   * 治疗效果
   */
  heal(config?: Partial<ParticleEmitterConfig>): ParticleEmitterConfig {
    return {
      autoEmit: true,
      emitRate: 20,
      emitShape: 'circle',
      emitRadius: 20,
      particleLife: 1.5,
      speed: 60,
      speedVariance: 20,
      size: 6,
      color: ['#00ff00', '#00ff88', '#88ff88'],
      sizeOverLife: (t) => 1 - t * 0.5,
      alphaOverLife: (t) => 1 - t,
      gravity: { x: 0, y: -100 },
      ...config,
    };
  },

  /**
   * 雨滴
   */
  rain(config?: Partial<ParticleEmitterConfig>): ParticleEmitterConfig {
    return {
      autoEmit: true,
      emitRate: 100,
      emitShape: 'rect',
      emitRadius: 200,
      particleLife: 2.0,
      speed: 0,
      size: 2,
      color: ['#4a90e2'],
      alphaOverLife: () => 0.5,
      gravity: { x: 0, y: 500 },
      ...config,
    };
  },
};

// ==================== 使用示例 ====================

/*
// 1. 爆炸效果
const explosion = new Node();
explosion.x = 100;
explosion.y = 100;
explosion.addComponent(ParticleEmitter, ParticlePresets.explosion());

// 触发爆炸
const emitter = explosion.getComponent(ParticleEmitter);
emitter.burst(50);

// 2. 持续火焰
const fire = new Node();
fire.x = 200;
fire.y = 300;
fire.addComponent(ParticleEmitter, ParticlePresets.fire());

// 3. 自定义粒子
const custom = new Node();
custom.addComponent(ParticleEmitter, {
  autoEmit: true,
  emitRate: 30,
  emitShape: 'cone',
  emitDirection: Math.PI / 2,  // 向上
  emitAngle: Math.PI / 6,
  particleLife: 2.0,
  speed: 100,
  size: 10,
  color: ['#ff00ff', '#00ffff'],
  gravity: { x: 0, y: 200 }
});
*/
