/**
 * 粒子系统
 * 轻量级自研实现，支持多种发射模式和行为
 */

import { System } from '../core/System';
import { ObjectPool } from '../core/ObjectPool';
import { lerp, randomFloat, randomInt } from '../math/MathUtils';

/** 粒子数据 */
export interface Particle {
  /** 位置 */
  x: number;
  y: number;
  /** 速度 */
  vx: number;
  vy: number;
  /** 生命周期 */
  life: number;
  maxLife: number;
  /** 大小 */
  size: number;
  startSize: number;
  endSize: number;
  /** 颜色 */
  color: string;
  startColor: [number, number, number, number]; // RGBA
  endColor: [number, number, number, number];
  /** 旋转 */
  rotation: number;
  angularVelocity: number;
  /** 透明度 */
  alpha: number;
  /** 重力影响 */
  gravity: number;
  /** 阻力 */
  drag: number;
  /** 所属发射器 */
  emitter: ParticleEmitter | null;
}

/** 发射器配置 */
export interface EmitterConfig {
  /** 位置 */
  x?: number;
  y?: number;
  /** 发射区域（相对于位置） */
  area?: { width: number; height: number } | { radius: number };
  /** 每秒发射数量 */
  rate?: number;
  /** 一次性发射数量（burst 模式） */
  burst?: number;
  /** 最大粒子数 */
  maxParticles?: number;
  /** 发射持续时间（毫秒，0 为持续发射） */
  duration?: number;
  /** 是否循环 */
  loop?: boolean;

  // 粒子属性
  /** 生命周期（毫秒） */
  life?: number | [number, number];
  /** 初始速度 */
  speed?: number | [number, number];
  /** 发射角度（弧度） */
  angle?: number | [number, number];
  /** 初始大小 */
  startSize?: number | [number, number];
  /** 结束大小 */
  endSize?: number | [number, number];
  /** 初始颜色 (支持 '#fff', 'rgb()', 'rgba()' 格式) */
  startColor?: string | string[];
  /** 结束颜色 */
  endColor?: string | string[];
  /** 角速度 */
  angularVelocity?: number | [number, number];
  /** 重力 */
  gravity?: number;
  /** 阻力 (0-1) */
  drag?: number;
  /** 混合模式 */
  blendMode?: GlobalCompositeOperation;
}

/** 发射器 */
export interface ParticleEmitter {
  /** 配置 */
  config: Required<EmitterConfig>;
  /** 活跃粒子 */
  particles: Particle[];
  /** 是否活跃 */
  active: boolean;
  /** 累积时间（用于发射控制） */
  accumulator: number;
  /** 已运行时间 */
  elapsed: number;
  /** 是否完成 */
  finished: boolean;
}

/** 默认配置 */
const DEFAULT_CONFIG: Required<EmitterConfig> = {
  x: 0,
  y: 0,
  area: { width: 0, height: 0 },
  rate: 10,
  burst: 0,
  maxParticles: 100,
  duration: 0,
  loop: true,
  life: 1000,
  speed: 100,
  angle: [0, Math.PI * 2],
  startSize: 10,
  endSize: 0,
  startColor: '#ffffff',
  endColor: '#ffffff',
  angularVelocity: 0,
  gravity: 0,
  drag: 0,
  blendMode: 'source-over',
};

export class ParticleSystem extends System {
  static priority = 50; // 在大部分系统之后，渲染之前

  /** 所有发射器 */
  private emitters: ParticleEmitter[] = [];

  /** 粒子池 */
  private particlePool = new ObjectPool(() => this.createParticle());

  /** 全局重力 */
  gravity = { x: 0, y: 0 };

  onUpdate(dt: number): void {
    const dtSec = dt / 1000;

    for (const emitter of this.emitters) {
      if (!emitter.active) continue;

      // 更新发射器时间
      emitter.elapsed += dt;

      // 检查持续时间
      if (emitter.config.duration > 0 && emitter.elapsed >= emitter.config.duration) {
        if (emitter.config.loop) {
          emitter.elapsed = 0;
        } else {
          emitter.active = false;
        }
      }

      // 发射新粒子
      if (emitter.active && emitter.config.rate > 0) {
        emitter.accumulator += dt;
        const interval = 1000 / emitter.config.rate;

        while (emitter.accumulator >= interval) {
          if (emitter.particles.length < emitter.config.maxParticles) {
            this.emitParticle(emitter);
          }
          emitter.accumulator -= interval;
        }
      }

      // 更新粒子
      for (let i = emitter.particles.length - 1; i >= 0; i--) {
        const p = emitter.particles[i];

        // 更新生命
        p.life -= dt;
        if (p.life <= 0) {
          emitter.particles.splice(i, 1);
          this.particlePool.release(p);
          continue;
        }

        // 生命周期进度 (0 -> 1)
        const t = 1 - p.life / p.maxLife;

        // 应用重力
        p.vy += (p.gravity + this.gravity.y) * dtSec;
        p.vx += this.gravity.x * dtSec;

        // 应用阻力
        if (p.drag > 0) {
          const damping = Math.pow(1 - p.drag, dtSec);
          p.vx *= damping;
          p.vy *= damping;
        }

        // 更新位置
        p.x += p.vx * dtSec;
        p.y += p.vy * dtSec;

        // 更新旋转
        p.rotation += p.angularVelocity * dtSec;

        // 插值大小
        p.size = lerp(p.startSize, p.endSize, t);

        // 插值颜色
        const r = Math.round(lerp(p.startColor[0], p.endColor[0], t));
        const g = Math.round(lerp(p.startColor[1], p.endColor[1], t));
        const b = Math.round(lerp(p.startColor[2], p.endColor[2], t));
        const a = lerp(p.startColor[3], p.endColor[3], t);
        p.color = `rgba(${r},${g},${b},${a})`;
        p.alpha = a;
      }

      // 检查是否完成
      if (!emitter.active && emitter.particles.length === 0) {
        emitter.finished = true;
      }
    }

    // 移除已完成的发射器
    this.emitters = this.emitters.filter((e) => !e.finished);
  }

  onRender(ctx: CanvasRenderingContext2D): void {
    for (const emitter of this.emitters) {
      const prevBlend = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = emitter.config.blendMode;

      for (const p of emitter.particles) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;

        // 默认绘制圆形粒子
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      ctx.globalCompositeOperation = prevBlend;
    }
  }

  /**
   * 创建发射器
   */
  createEmitter(config: EmitterConfig): ParticleEmitter {
    const fullConfig = { ...DEFAULT_CONFIG, ...config } as Required<EmitterConfig>;

    const emitter: ParticleEmitter = {
      config: fullConfig,
      particles: [],
      active: true,
      accumulator: 0,
      elapsed: 0,
      finished: false,
    };

    this.emitters.push(emitter);

    // 如果有 burst，立即发射
    if (fullConfig.burst > 0) {
      for (let i = 0; i < fullConfig.burst; i++) {
        this.emitParticle(emitter);
      }
    }

    return emitter;
  }

  /**
   * 发射单个粒子
   */
  private emitParticle(emitter: ParticleEmitter): Particle {
    const config = emitter.config;
    const p = this.particlePool.acquire();

    // 位置
    p.x = config.x;
    p.y = config.y;

    // 发射区域
    if ('radius' in config.area) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * config.area.radius;
      p.x += Math.cos(angle) * r;
      p.y += Math.sin(angle) * r;
    } else {
      p.x += (Math.random() - 0.5) * config.area.width;
      p.y += (Math.random() - 0.5) * config.area.height;
    }

    // 生命周期
    p.maxLife = this.getValue(config.life);
    p.life = p.maxLife;

    // 速度
    const speed = this.getValue(config.speed);
    const angle = this.getValue(config.angle);
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;

    // 大小
    p.startSize = this.getValue(config.startSize);
    p.endSize = this.getValue(config.endSize);
    p.size = p.startSize;

    // 颜色
    p.startColor = this.parseColor(this.getArrayValue(config.startColor));
    p.endColor = this.parseColor(this.getArrayValue(config.endColor));
    p.color = `rgba(${p.startColor[0]},${p.startColor[1]},${p.startColor[2]},${p.startColor[3]})`;
    p.alpha = p.startColor[3];

    // 旋转
    p.rotation = 0;
    p.angularVelocity = this.getValue(config.angularVelocity);

    // 物理
    p.gravity = config.gravity;
    p.drag = config.drag;

    p.emitter = emitter;
    emitter.particles.push(p);

    return p;
  }

  /**
   * 停止发射器
   */
  stopEmitter(emitter: ParticleEmitter, immediate = false): void {
    emitter.active = false;
    if (immediate) {
      for (const p of emitter.particles) {
        this.particlePool.release(p);
      }
      emitter.particles = [];
      emitter.finished = true;
    }
  }

  /**
   * 移除所有发射器
   */
  clear(): void {
    for (const emitter of this.emitters) {
      for (const p of emitter.particles) {
        this.particlePool.release(p);
      }
    }
    this.emitters = [];
  }

  /**
   * 获取活跃粒子总数
   */
  getParticleCount(): number {
    return this.emitters.reduce((sum, e) => sum + e.particles.length, 0);
  }

  /**
   * 获取发射器数量
   */
  getEmitterCount(): number {
    return this.emitters.length;
  }

  // ---- 预设效果 ----

  /**
   * 爆炸效果
   */
  explode(x: number, y: number, options: Partial<EmitterConfig> = {}): ParticleEmitter {
    return this.createEmitter({
      x,
      y,
      burst: options.burst ?? 30,
      rate: 0,
      duration: 1,
      loop: false,
      life: [300, 600],
      speed: [100, 300],
      angle: [0, Math.PI * 2],
      startSize: [8, 15],
      endSize: 0,
      startColor: options.startColor ?? ['#ff6600', '#ffaa00', '#ffff00'],
      endColor: options.endColor ?? '#ff0000',
      gravity: options.gravity ?? 200,
      drag: 0.1,
      ...options,
    });
  }

  /**
   * 烟雾效果
   */
  smoke(x: number, y: number, options: Partial<EmitterConfig> = {}): ParticleEmitter {
    return this.createEmitter({
      x,
      y,
      rate: options.rate ?? 5,
      life: [1000, 2000],
      speed: [20, 50],
      angle: [-Math.PI / 2 - 0.3, -Math.PI / 2 + 0.3],
      startSize: [5, 10],
      endSize: [30, 50],
      startColor: 'rgba(100,100,100,0.8)',
      endColor: 'rgba(50,50,50,0)',
      gravity: -50,
      drag: 0.05,
      ...options,
    });
  }

  /**
   * 火焰效果
   */
  fire(x: number, y: number, options: Partial<EmitterConfig> = {}): ParticleEmitter {
    return this.createEmitter({
      x,
      y,
      area: { width: 20, height: 5 },
      rate: options.rate ?? 20,
      life: [300, 600],
      speed: [50, 100],
      angle: [-Math.PI / 2 - 0.2, -Math.PI / 2 + 0.2],
      startSize: [8, 15],
      endSize: [2, 5],
      startColor: ['#ff4400', '#ff6600', '#ffaa00'],
      endColor: '#ff0000',
      gravity: -100,
      drag: 0.1,
      blendMode: 'lighter',
      ...options,
    });
  }

  /**
   * 星星/闪光效果
   */
  sparkle(x: number, y: number, options: Partial<EmitterConfig> = {}): ParticleEmitter {
    return this.createEmitter({
      x,
      y,
      burst: options.burst ?? 15,
      rate: 0,
      duration: 1,
      loop: false,
      life: [200, 500],
      speed: [50, 150],
      angle: [0, Math.PI * 2],
      startSize: [3, 6],
      endSize: 0,
      startColor: ['#ffffff', '#ffffaa', '#aaffff'],
      endColor: '#ffffff',
      gravity: 0,
      drag: 0.05,
      blendMode: 'lighter',
      ...options,
    });
  }

  /**
   * 轨迹效果
   */
  trail(x: number, y: number, options: Partial<EmitterConfig> = {}): ParticleEmitter {
    return this.createEmitter({
      x,
      y,
      rate: options.rate ?? 30,
      life: [100, 300],
      speed: [0, 20],
      angle: [0, Math.PI * 2],
      startSize: [5, 8],
      endSize: 0,
      startColor: options.startColor ?? '#00aaff',
      endColor: options.endColor ?? '#0044ff',
      gravity: 0,
      drag: 0,
      ...options,
    });
  }

  // ---- 工具方法 ----

  private createParticle(): Particle {
    return {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 0,
      size: 0,
      startSize: 0,
      endSize: 0,
      color: '#fff',
      startColor: [255, 255, 255, 1],
      endColor: [255, 255, 255, 1],
      rotation: 0,
      angularVelocity: 0,
      alpha: 1,
      gravity: 0,
      drag: 0,
      emitter: null,
    };
  }

  private getValue(value: number | [number, number]): number {
    if (Array.isArray(value)) {
      return randomFloat(value[0], value[1]);
    }
    return value;
  }

  private getArrayValue<T>(value: T | T[]): T {
    if (Array.isArray(value)) {
      return value[randomInt(0, value.length - 1)];
    }
    return value;
  }

  private parseColor(color: string): [number, number, number, number] {
    // 处理 #fff 或 #ffffff
    if (color.startsWith('#')) {
      let hex = color.slice(1);
      if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      }
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
        1,
      ];
    }

    // 处理 rgb() 或 rgba()
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (match) {
      return [
        parseInt(match[1], 10),
        parseInt(match[2], 10),
        parseInt(match[3], 10),
        match[4] !== undefined ? parseFloat(match[4]) : 1,
      ];
    }

    // 默认白色
    return [255, 255, 255, 1];
  }
}
