/**
 * 流体物理系统
 * 基于 SPH（Smoothed Particle Hydrodynamics）的粒子流体模拟
 * 支持与 Matter.js 刚体的交互
 */

import Matter from 'matter-js';
import { System } from '../core/System';
import { MatterPhysicsSystem } from './MatterPhysicsSystem';

/** 流体类型预设 */
export type FluidType = 'water' | 'oil' | 'air' | 'custom';

/** 流体属性配置 */
export interface FluidConfig {
  /** 流体类型 */
  type: FluidType;
  /** 粒子半径 */
  particleRadius: number;
  /** 静止密度 */
  restDensity: number;
  /** 气体常数（影响压力） */
  gasConstant: number;
  /** 粘度 */
  viscosity: number;
  /** 表面张力 */
  surfaceTension: number;
  /** 重力缩放 */
  gravityScale: number;
  /** 颜色 */
  color: string;
  /** 透明度 */
  alpha: number;
}

/** 流体粒子 */
export interface FluidParticle {
  /** 唯一 ID */
  id: number;
  /** 位置 X */
  x: number;
  /** 位置 Y */
  y: number;
  /** 速度 X */
  vx: number;
  /** 速度 Y */
  vy: number;
  /** 加速度 X */
  ax: number;
  /** 加速度 Y */
  ay: number;
  /** 密度 */
  density: number;
  /** 压力 */
  pressure: number;
  /** 所属流体 ID */
  fluidId: number;
  /** 邻居粒子索引 */
  neighbors: number[];
}

/** 流体实例 */
export interface Fluid {
  /** 唯一 ID */
  id: number;
  /** 配置 */
  config: FluidConfig;
  /** 粒子列表 */
  particles: FluidParticle[];
  /** 是否活跃 */
  active: boolean;
}

/** 空间哈希网格单元 */
interface SpatialCell {
  particles: number[]; // 粒子索引
}

/** 预设流体配置 */
const FLUID_PRESETS: Record<FluidType, Omit<FluidConfig, 'type'>> = {
  water: {
    particleRadius: 4,
    restDensity: 1000,
    gasConstant: 2000,
    viscosity: 0.1,
    surfaceTension: 0.0728,
    gravityScale: 1,
    color: '#4a90d9',
    alpha: 0.7,
  },
  oil: {
    particleRadius: 4,
    restDensity: 800,
    gasConstant: 1500,
    viscosity: 0.5, // 更粘稠
    surfaceTension: 0.03,
    gravityScale: 0.9,
    color: '#8B4513',
    alpha: 0.8,
  },
  air: {
    particleRadius: 6,
    restDensity: 1.2,
    gasConstant: 100,
    viscosity: 0.01,
    surfaceTension: 0,
    gravityScale: -0.1, // 轻微向上
    color: '#87CEEB',
    alpha: 0.3,
  },
  custom: {
    particleRadius: 4,
    restDensity: 1000,
    gasConstant: 2000,
    viscosity: 0.1,
    surfaceTension: 0.05,
    gravityScale: 1,
    color: '#ffffff',
    alpha: 0.6,
  },
};

export class FluidSystem extends System {
  static priority = 4; // 在 MatterPhysicsSystem 之前

  /** 所有流体 */
  private fluids = new Map<number, Fluid>();

  /** 所有粒子的扁平数组（用于空间哈希） */
  private allParticles: FluidParticle[] = [];

  /** 空间哈希网格 */
  private spatialGrid = new Map<string, SpatialCell>();

  /** 网格单元大小 */
  private cellSize = 20;

  /** 平滑核半径 */
  private smoothingRadius = 20;

  /** 下一个流体 ID */
  private nextFluidId = 1;

  /** 下一个粒子 ID */
  private nextParticleId = 1;

  /** 全局重力 */
  gravity = { x: 0, y: 980 };

  /** 世界边界 */
  bounds = { minX: 0, minY: 0, maxX: 800, maxY: 600 };

  /** Matter.js 物理系统引用 */
  private matterSystem: MatterPhysicsSystem | null = null;

  /** 是否启用调试渲染 */
  debugRender = false;

  onCreate(): void {
    // 尝试获取 MatterPhysicsSystem
    if (this.engine.hasSystem(MatterPhysicsSystem)) {
      this.matterSystem = this.engine.system(MatterPhysicsSystem);
    }
  }

  onUpdate(dt: number): void {
    // 限制时间步长以保持稳定性
    const maxDt = 1 / 60;
    const steps = Math.ceil(dt / maxDt);
    const subDt = dt / steps;

    for (let step = 0; step < steps; step++) {
      this.updateFluidSimulation(subDt);
    }
  }

  /**
   * 更新流体模拟
   */
  private updateFluidSimulation(dt: number): void {
    // 1. 收集所有活跃粒子
    this.collectActiveParticles();

    if (this.allParticles.length === 0) return;

    // 2. 构建空间哈希
    this.buildSpatialHash();

    // 3. 查找邻居
    this.findNeighbors();

    // 4. 计算密度和压力
    this.computeDensityPressure();

    // 5. 计算力
    this.computeForces();

    // 6. 与刚体交互
    if (this.matterSystem) {
      this.handleRigidBodyInteraction();
    }

    // 7. 积分更新位置
    this.integrate(dt);

    // 8. 处理边界
    this.handleBoundaries();
  }

  /**
   * 收集所有活跃粒子
   */
  private collectActiveParticles(): void {
    this.allParticles = [];
    for (const fluid of this.fluids.values()) {
      if (fluid.active) {
        this.allParticles.push(...fluid.particles);
      }
    }
  }

  /**
   * 构建空间哈希网格
   */
  private buildSpatialHash(): void {
    this.spatialGrid.clear();

    for (let i = 0; i < this.allParticles.length; i++) {
      const p = this.allParticles[i];
      const cellX = Math.floor(p.x / this.cellSize);
      const cellY = Math.floor(p.y / this.cellSize);
      const key = `${cellX},${cellY}`;

      let cell = this.spatialGrid.get(key);
      if (!cell) {
        cell = { particles: [] };
        this.spatialGrid.set(key, cell);
      }
      cell.particles.push(i);
    }
  }

  /**
   * 查找每个粒子的邻居
   */
  private findNeighbors(): void {
    const radiusSq = this.smoothingRadius * this.smoothingRadius;

    for (let i = 0; i < this.allParticles.length; i++) {
      const p = this.allParticles[i];
      p.neighbors = [];

      // 检查周围 9 个单元
      const cellX = Math.floor(p.x / this.cellSize);
      const cellY = Math.floor(p.y / this.cellSize);

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const key = `${cellX + dx},${cellY + dy}`;
          const cell = this.spatialGrid.get(key);
          if (!cell) continue;

          for (const j of cell.particles) {
            if (i === j) continue;

            const neighbor = this.allParticles[j];
            const distSq = (p.x - neighbor.x) ** 2 + (p.y - neighbor.y) ** 2;

            if (distSq < radiusSq) {
              p.neighbors.push(j);
            }
          }
        }
      }
    }
  }

  /**
   * 计算密度和压力
   */
  private computeDensityPressure(): void {
    const h = this.smoothingRadius;
    const h2 = h * h;

    // Poly6 核函数系数
    const poly6Coef = 315 / (64 * Math.PI * h ** 9);

    for (const p of this.allParticles) {
      const fluid = this.fluids.get(p.fluidId);
      if (!fluid) continue;

      // 自身贡献
      let density = poly6Coef * h2 ** 3;

      // 邻居贡献
      for (const j of p.neighbors) {
        const neighbor = this.allParticles[j];
        const dx = p.x - neighbor.x;
        const dy = p.y - neighbor.y;
        const r2 = dx * dx + dy * dy;

        if (r2 < h2) {
          const diff = h2 - r2;
          density += poly6Coef * diff ** 3;
        }
      }

      p.density = density;
      // 状态方程计算压力
      p.pressure = fluid.config.gasConstant * (p.density - fluid.config.restDensity);
    }
  }

  /**
   * 计算力（压力、粘度、表面张力）
   */
  private computeForces(): void {
    const h = this.smoothingRadius;

    // Spiky 核函数梯度系数（用于压力）
    const spikyGradCoef = -45 / (Math.PI * h ** 6);

    // Viscosity 核函数拉普拉斯系数
    const viscLapCoef = 45 / (Math.PI * h ** 6);

    for (const p of this.allParticles) {
      const fluid = this.fluids.get(p.fluidId);
      if (!fluid) continue;

      // 重力
      p.ax = this.gravity.x * fluid.config.gravityScale;
      p.ay = this.gravity.y * fluid.config.gravityScale;

      let pressureX = 0;
      let pressureY = 0;
      let viscX = 0;
      let viscY = 0;

      for (const j of p.neighbors) {
        const neighbor = this.allParticles[j];
        const dx = p.x - neighbor.x;
        const dy = p.y - neighbor.y;
        const r = Math.sqrt(dx * dx + dy * dy);

        if (r < 0.0001 || r >= h) continue;

        const dirX = dx / r;
        const dirY = dy / r;

        // 压力力
        const pressureTerm =
          (-0.5 * (p.pressure + neighbor.pressure) * spikyGradCoef * (h - r) ** 2) /
          neighbor.density;
        pressureX += pressureTerm * dirX;
        pressureY += pressureTerm * dirY;

        // 粘度力
        const neighborFluid = this.fluids.get(neighbor.fluidId);
        const avgViscosity =
          (fluid.config.viscosity + (neighborFluid?.config.viscosity ?? 0)) * 0.5;
        const viscTerm = (avgViscosity * viscLapCoef * (h - r)) / neighbor.density;
        viscX += viscTerm * (neighbor.vx - p.vx);
        viscY += viscTerm * (neighbor.vy - p.vy);
      }

      // 应用力（除以密度）
      if (p.density > 0.0001) {
        p.ax += pressureX / p.density + viscX / p.density;
        p.ay += pressureY / p.density + viscY / p.density;
      }
    }
  }

  /**
   * 处理流体与刚体的交互
   */
  private handleRigidBodyInteraction(): void {
    if (!this.matterSystem) return;

    const matterWorld = this.matterSystem.getMatterWorld();
    const bodies = Matter.Composite.allBodies(matterWorld);

    for (const p of this.allParticles) {
      const fluid = this.fluids.get(p.fluidId);
      if (!fluid) continue;

      for (const body of bodies) {
        if (body.isStatic) {
          // 静态刚体：反弹粒子
          this.handleStaticBodyCollision(p, body, fluid);
        } else {
          // 动态刚体：双向力
          this.handleDynamicBodyInteraction(p, body, fluid);
        }
      }
    }
  }

  /**
   * 处理与静态刚体的碰撞
   */
  private handleStaticBodyCollision(p: FluidParticle, body: Matter.Body, fluid: Fluid): void {
    const radius = fluid.config.particleRadius;

    // 检查粒子是否在刚体内部
    if (Matter.Vertices.contains(body.vertices, { x: p.x, y: p.y })) {
      // 找到最近的边并推出
      let minDist = Infinity;
      let pushX = 0;
      let pushY = 0;

      const vertices = body.vertices;
      for (let i = 0; i < vertices.length; i++) {
        const v1 = vertices[i];
        const v2 = vertices[(i + 1) % vertices.length];

        const closest = this.closestPointOnSegment(p.x, p.y, v1.x, v1.y, v2.x, v2.y);
        const dx = p.x - closest.x;
        const dy = p.y - closest.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < minDist) {
          minDist = dist;
          const len = dist > 0.0001 ? dist : 1;
          pushX = dx / len;
          pushY = dy / len;
        }
      }

      // 推出粒子
      p.x += pushX * (radius + 2);
      p.y += pushY * (radius + 2);

      // 反射速度
      const dot = p.vx * pushX + p.vy * pushY;
      p.vx -= 2 * dot * pushX * 0.3; // 衰减
      p.vy -= 2 * dot * pushY * 0.3;
    }
  }

  /**
   * 处理与动态刚体的交互
   */
  private handleDynamicBodyInteraction(p: FluidParticle, body: Matter.Body, fluid: Fluid): void {
    const radius = fluid.config.particleRadius * 2;

    // 检查距离
    const dx = p.x - body.position.x;
    const dy = p.y - body.position.y;
    const distSq = dx * dx + dy * dy;

    // 简化：使用边界半径
    const bounds = body.bounds;
    const bodyRadius =
      Math.max(bounds.max.x - bounds.min.x, bounds.max.y - bounds.min.y) * 0.5 + radius;

    if (distSq > bodyRadius * bodyRadius) return;

    // 精确检测
    if (Matter.Vertices.contains(body.vertices, { x: p.x, y: p.y })) {
      // 计算推力
      const dist = Math.sqrt(distSq) || 1;
      const nx = dx / dist;
      const ny = dy / dist;

      // 粒子对刚体的力（浮力 + 阻力）
      const buoyancy = fluid.config.restDensity * 0.0001;
      const dragCoef = 0.01;

      const relVx = p.vx - body.velocity.x;
      const relVy = p.vy - body.velocity.y;

      const forceX = -buoyancy * nx - dragCoef * relVx;
      const forceY = -buoyancy * ny - this.gravity.y * buoyancy * 0.1 - dragCoef * relVy;

      Matter.Body.applyForce(body, { x: p.x, y: p.y }, { x: forceX, y: forceY });

      // 推出粒子
      p.x = body.position.x + nx * (bodyRadius + 1);
      p.y = body.position.y + ny * (bodyRadius + 1);

      // 粒子速度受刚体影响
      p.vx = body.velocity.x * 0.8 + p.vx * 0.2;
      p.vy = body.velocity.y * 0.8 + p.vy * 0.2;
    }
  }

  /**
   * 积分更新位置和速度
   */
  private integrate(dt: number): void {
    for (const p of this.allParticles) {
      // 半隐式欧拉积分
      p.vx += p.ax * dt;
      p.vy += p.ay * dt;

      // 速度阻尼
      const damping = 0.999;
      p.vx *= damping;
      p.vy *= damping;

      // 速度限制
      const maxSpeed = 500;
      const speedSq = p.vx * p.vx + p.vy * p.vy;
      if (speedSq > maxSpeed * maxSpeed) {
        const scale = maxSpeed / Math.sqrt(speedSq);
        p.vx *= scale;
        p.vy *= scale;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  /**
   * 处理世界边界
   */
  private handleBoundaries(): void {
    const restitution = 0.3;

    for (const p of this.allParticles) {
      const fluid = this.fluids.get(p.fluidId);
      const radius = fluid?.config.particleRadius ?? 4;

      // 左边界
      if (p.x < this.bounds.minX + radius) {
        p.x = this.bounds.minX + radius;
        p.vx = -p.vx * restitution;
      }

      // 右边界
      if (p.x > this.bounds.maxX - radius) {
        p.x = this.bounds.maxX - radius;
        p.vx = -p.vx * restitution;
      }

      // 上边界
      if (p.y < this.bounds.minY + radius) {
        p.y = this.bounds.minY + radius;
        p.vy = -p.vy * restitution;
      }

      // 下边界
      if (p.y > this.bounds.maxY - radius) {
        p.y = this.bounds.maxY - radius;
        p.vy = -p.vy * restitution;
      }
    }
  }

  /**
   * 线段上最近点
   */
  private closestPointOnSegment(
    px: number,
    py: number,
    ax: number,
    ay: number,
    bx: number,
    by: number
  ): { x: number; y: number } {
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;

    if (lenSq < 0.0001) return { x: ax, y: ay };

    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
    return { x: ax + t * dx, y: ay + t * dy };
  }

  // ==================== 公共 API ====================

  /**
   * 创建流体
   */
  createFluid(type: FluidType, config?: Partial<FluidConfig>): Fluid {
    const preset = FLUID_PRESETS[type];
    const fluidConfig: FluidConfig = {
      type,
      ...preset,
      ...config,
    };

    const fluid: Fluid = {
      id: this.nextFluidId++,
      config: fluidConfig,
      particles: [],
      active: true,
    };

    this.fluids.set(fluid.id, fluid);
    return fluid;
  }

  /**
   * 移除流体
   */
  removeFluid(fluidId: number): void {
    this.fluids.delete(fluidId);
  }

  /**
   * 获取流体
   */
  getFluid(fluidId: number): Fluid | undefined {
    return this.fluids.get(fluidId);
  }

  /**
   * 在指定位置添加粒子
   */
  addParticle(fluidId: number, x: number, y: number, vx = 0, vy = 0): FluidParticle | null {
    const fluid = this.fluids.get(fluidId);
    if (!fluid) return null;

    const particle: FluidParticle = {
      id: this.nextParticleId++,
      x,
      y,
      vx,
      vy,
      ax: 0,
      ay: 0,
      density: 0,
      pressure: 0,
      fluidId,
      neighbors: [],
    };

    fluid.particles.push(particle);
    return particle;
  }

  /**
   * 批量添加粒子（矩形区域）
   */
  addParticlesRect(
    fluidId: number,
    x: number,
    y: number,
    width: number,
    height: number,
    spacing?: number
  ): FluidParticle[] {
    const fluid = this.fluids.get(fluidId);
    if (!fluid) return [];

    const gap = spacing ?? fluid.config.particleRadius * 2;
    const particles: FluidParticle[] = [];

    for (let px = x; px < x + width; px += gap) {
      for (let py = y; py < y + height; py += gap) {
        const particle = this.addParticle(fluidId, px, py);
        if (particle) particles.push(particle);
      }
    }

    return particles;
  }

  /**
   * 批量添加粒子（圆形区域）
   */
  addParticlesCircle(
    fluidId: number,
    cx: number,
    cy: number,
    radius: number,
    spacing?: number
  ): FluidParticle[] {
    const fluid = this.fluids.get(fluidId);
    if (!fluid) return [];

    const gap = spacing ?? fluid.config.particleRadius * 2;
    const particles: FluidParticle[] = [];

    for (let px = cx - radius; px <= cx + radius; px += gap) {
      for (let py = cy - radius; py <= cy + radius; py += gap) {
        const dx = px - cx;
        const dy = py - cy;
        if (dx * dx + dy * dy <= radius * radius) {
          const particle = this.addParticle(fluidId, px, py);
          if (particle) particles.push(particle);
        }
      }
    }

    return particles;
  }

  /**
   * 发射粒子流
   */
  emitParticles(
    fluidId: number,
    x: number,
    y: number,
    dirX: number,
    dirY: number,
    speed: number,
    count: number,
    spread = 0
  ): FluidParticle[] {
    const particles: FluidParticle[] = [];
    const len = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
    const nx = dirX / len;
    const ny = dirY / len;

    for (let i = 0; i < count; i++) {
      const angle = (Math.random() - 0.5) * spread;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const vx = (nx * cos - ny * sin) * speed;
      const vy = (nx * sin + ny * cos) * speed;

      const particle = this.addParticle(fluidId, x, y, vx, vy);
      if (particle) particles.push(particle);
    }

    return particles;
  }

  /**
   * 移除区域内的粒子
   */
  removeParticlesInRect(x: number, y: number, width: number, height: number): number {
    let removed = 0;

    for (const fluid of this.fluids.values()) {
      const before = fluid.particles.length;
      fluid.particles = fluid.particles.filter(
        (p) => p.x < x || p.x > x + width || p.y < y || p.y > y + height
      );
      removed += before - fluid.particles.length;
    }

    return removed;
  }

  /**
   * 移除区域内的粒子（圆形）
   */
  removeParticlesInCircle(cx: number, cy: number, radius: number): number {
    let removed = 0;
    const radiusSq = radius * radius;

    for (const fluid of this.fluids.values()) {
      const before = fluid.particles.length;
      fluid.particles = fluid.particles.filter((p) => {
        const dx = p.x - cx;
        const dy = p.y - cy;
        return dx * dx + dy * dy > radiusSq;
      });
      removed += before - fluid.particles.length;
    }

    return removed;
  }

  /**
   * 清空所有粒子
   */
  clearAllParticles(): void {
    for (const fluid of this.fluids.values()) {
      fluid.particles = [];
    }
  }

  /**
   * 获取所有粒子（用于渲染）
   */
  getAllParticles(): FluidParticle[] {
    return this.allParticles;
  }

  /**
   * 获取流体的粒子
   */
  getFluidParticles(fluidId: number): FluidParticle[] {
    return this.fluids.get(fluidId)?.particles ?? [];
  }

  /**
   * 获取粒子总数
   */
  getParticleCount(): number {
    let count = 0;
    for (const fluid of this.fluids.values()) {
      count += fluid.particles.length;
    }
    return count;
  }

  /**
   * 对区域内粒子施加力
   */
  applyForceInRadius(cx: number, cy: number, radius: number, forceX: number, forceY: number): void {
    const radiusSq = radius * radius;

    for (const p of this.allParticles) {
      const dx = p.x - cx;
      const dy = p.y - cy;
      const distSq = dx * dx + dy * dy;

      if (distSq < radiusSq) {
        const falloff = 1 - distSq / radiusSq;
        p.ax += forceX * falloff;
        p.ay += forceY * falloff;
      }
    }
  }

  /**
   * 爆炸效果
   */
  explode(cx: number, cy: number, radius: number, force: number): void {
    const radiusSq = radius * radius;

    for (const p of this.allParticles) {
      const dx = p.x - cx;
      const dy = p.y - cy;
      const distSq = dx * dx + dy * dy;

      if (distSq < radiusSq && distSq > 0.01) {
        const dist = Math.sqrt(distSq);
        const falloff = 1 - dist / radius;
        const nx = dx / dist;
        const ny = dy / dist;
        p.vx += nx * force * falloff;
        p.vy += ny * force * falloff;
      }
    }
  }

  /**
   * 吸引效果
   */
  attract(cx: number, cy: number, radius: number, force: number): void {
    this.explode(cx, cy, radius, -force);
  }

  /**
   * 漩涡效果
   */
  vortex(cx: number, cy: number, radius: number, strength: number): void {
    const radiusSq = radius * radius;

    for (const p of this.allParticles) {
      const dx = p.x - cx;
      const dy = p.y - cy;
      const distSq = dx * dx + dy * dy;

      if (distSq < radiusSq && distSq > 0.01) {
        const dist = Math.sqrt(distSq);
        const falloff = 1 - dist / radius;
        // 切向速度
        p.vx += (-dy / dist) * strength * falloff;
        p.vy += (dx / dist) * strength * falloff;
      }
    }
  }

  /**
   * 设置平滑核半径
   */
  setSmoothingRadius(radius: number): void {
    this.smoothingRadius = radius;
    this.cellSize = radius;
  }

  /**
   * 渲染流体（调试用或简单渲染）
   */
  render(ctx: CanvasRenderingContext2D): void {
    for (const fluid of this.fluids.values()) {
      if (!fluid.active) continue;

      const { color, alpha, particleRadius } = fluid.config;

      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;

      for (const p of fluid.particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, particleRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.globalAlpha = 1;

    // 调试渲染
    if (this.debugRender) {
      this.renderDebug(ctx);
    }
  }

  /**
   * 调试渲染（显示速度、压力等）
   */
  private renderDebug(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = '#ff0';
    ctx.lineWidth = 1;

    for (const p of this.allParticles) {
      // 速度向量
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.vx * 0.05, p.y + p.vy * 0.05);
      ctx.stroke();
    }
  }

  onDestroy(): void {
    this.fluids.clear();
    this.allParticles = [];
    this.spatialGrid.clear();
  }
}
