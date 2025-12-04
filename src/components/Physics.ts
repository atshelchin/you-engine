/**
 * Physics Component - 物理组件
 *
 * 零依赖物理引擎实现
 * 支持简单的碰撞检测和物理模拟
 */

import { Component } from '../core/Component';
import type { Node } from '../core/Node';

// ==================== 类型定义 ====================

export type PhysicsBodyType = 'static' | 'dynamic' | 'kinematic';
export type CollisionShape = 'circle' | 'rect' | 'polygon';

export interface PhysicsBodyConfig {
  type?: PhysicsBodyType; // 物体类型
  shape: CollisionShape; // 碰撞形状

  // 圆形参数
  radius?: number;

  // 矩形参数
  width?: number;
  height?: number;

  // 多边形参数
  vertices?: { x: number; y: number }[];

  // 物理属性
  mass?: number; // 质量
  friction?: number; // 摩擦力 (0-1)
  restitution?: number; // 弹性 (0-1)
  density?: number; // 密度
  fixedRotation?: boolean; // 是否固定旋转

  // 碰撞过滤
  collisionGroup?: number; // 碰撞组
  collisionMask?: number; // 碰撞掩码

  // 触发器
  isSensor?: boolean; // 是否是传感器（不产生碰撞）
}

// ==================== PhysicsBody 组件 ====================

/**
 * 物理刚体组件
 *
 * 用法:
 * ```typescript
 * node.addComponent(PhysicsBody, {
 *   shape: 'circle',
 *   radius: 16,
 *   mass: 1,
 *   friction: 0.5
 * });
 * ```
 */
export class PhysicsBody extends Component {
  type: PhysicsBodyType;
  shape: CollisionShape;

  // 形状参数
  radius?: number;
  width?: number;
  height?: number;
  vertices?: { x: number; y: number }[];

  // 物理属性
  mass: number;
  friction: number;
  restitution: number;
  density: number;
  fixedRotation: boolean;

  // 碰撞过滤
  collisionGroup: number;
  collisionMask: number;
  isSensor: boolean;

  // 内部状态
  private velocity = { x: 0, y: 0 };
  private angularVelocity = 0;
  private force = { x: 0, y: 0 };

  constructor(config: PhysicsBodyConfig) {
    super();

    this.type = config.type || 'dynamic';
    this.shape = config.shape;

    this.radius = config.radius;
    this.width = config.width;
    this.height = config.height;
    this.vertices = config.vertices;

    this.mass = config.mass || 1;
    this.friction = config.friction ?? 0.1;
    this.restitution = config.restitution ?? 0.0;
    this.density = config.density ?? 0.001;
    this.fixedRotation = config.fixedRotation || false;

    this.collisionGroup = config.collisionGroup || 0;
    this.collisionMask = config.collisionMask || -1;
    this.isSensor = config.isSensor || false;
  }

  onInit(): void {
    // 注册到物理世界
    const physicsWorld = this.findPhysicsWorld();
    if (physicsWorld) {
      physicsWorld.registerBody(this);
    }
  }

  onUpdate(dt: number): void {
    if (this.type === 'static') return;

    // 简单的欧拉积分
    const ax = this.force.x / this.mass;
    const ay = this.force.y / this.mass;

    this.velocity.x += ax * dt;
    this.velocity.y += ay * dt;

    // 应用摩擦
    this.velocity.x *= 1 - this.friction;
    this.velocity.y *= 1 - this.friction;

    // 更新位置
    this.node.x += this.velocity.x * dt;
    this.node.y += this.velocity.y * dt;

    if (!this.fixedRotation) {
      this.node.rotation += this.angularVelocity * dt;
    }

    // 重置力
    this.force.x = 0;
    this.force.y = 0;
  }

  onDestroy(): void {
    // 从物理世界注销
    const physicsWorld = this.findPhysicsWorld();
    if (physicsWorld) {
      physicsWorld.unregisterBody(this);
    }
  }

  // ==================== 公共接口 ====================

  /**
   * 设置速度
   */
  setVelocity(vx: number, vy: number): void {
    this.velocity.x = vx;
    this.velocity.y = vy;
  }

  /**
   * 获取速度
   */
  getVelocity(): { x: number; y: number } {
    return { ...this.velocity };
  }

  /**
   * 应用力（瞬时）
   */
  applyForce(fx: number, fy: number): void {
    this.force.x += fx;
    this.force.y += fy;
  }

  /**
   * 应用冲量（瞬时改变速度）
   */
  applyImpulse(ix: number, iy: number): void {
    this.velocity.x += ix / this.mass;
    this.velocity.y += iy / this.mass;
  }

  /**
   * 设置角速度
   */
  setAngularVelocity(av: number): void {
    this.angularVelocity = av;
  }

  /**
   * 检测与另一个物体的碰撞
   */
  checkCollision(other: PhysicsBody): boolean {
    if (this.shape === 'circle' && other.shape === 'circle') {
      return this.checkCircleCircle(other);
    } else if (this.shape === 'rect' && other.shape === 'rect') {
      return this.checkRectRect(other);
    } else if (this.shape === 'circle' && other.shape === 'rect') {
      return this.checkCircleRect(this, other);
    } else if (this.shape === 'rect' && other.shape === 'circle') {
      return this.checkCircleRect(other, this);
    }
    return false;
  }

  /**
   * 解决碰撞（分离物体）
   */
  resolveCollision(other: PhysicsBody): void {
    if (this.type === 'static' && other.type === 'static') return;

    // 计算碰撞法线和深度
    const collision = this.getCollisionInfo(other);
    if (!collision) return;

    const { normal, depth } = collision;

    // 分离物体
    if (this.type === 'dynamic' && other.type === 'dynamic') {
      this.node.x -= normal.x * depth * 0.5;
      this.node.y -= normal.y * depth * 0.5;
      other.node.x += normal.x * depth * 0.5;
      other.node.y += normal.y * depth * 0.5;
    } else if (this.type === 'dynamic') {
      this.node.x -= normal.x * depth;
      this.node.y -= normal.y * depth;
    } else if (other.type === 'dynamic') {
      other.node.x += normal.x * depth;
      other.node.y += normal.y * depth;
    }

    // 应用弹性碰撞
    if (!this.isSensor && !other.isSensor) {
      const relativeVelocity = {
        x: other.velocity.x - this.velocity.x,
        y: other.velocity.y - this.velocity.y,
      };

      const velocityAlongNormal = relativeVelocity.x * normal.x + relativeVelocity.y * normal.y;

      if (velocityAlongNormal > 0) return;

      const restitution = Math.min(this.restitution, other.restitution);
      const j = -(1 + restitution) * velocityAlongNormal;
      const impulse = j / (1 / this.mass + 1 / other.mass);

      if (this.type === 'dynamic') {
        this.velocity.x -= (impulse / this.mass) * normal.x;
        this.velocity.y -= (impulse / this.mass) * normal.y;
      }

      if (other.type === 'dynamic') {
        other.velocity.x += (impulse / other.mass) * normal.x;
        other.velocity.y += (impulse / other.mass) * normal.y;
      }
    }
  }

  // ==================== 私有方法 ====================

  private checkCircleCircle(other: PhysicsBody): boolean {
    const dx = this.node.x - other.node.x;
    const dy = this.node.y - other.node.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = (this.radius || 0) + (other.radius || 0);
    return dist < minDist;
  }

  private checkRectRect(other: PhysicsBody): boolean {
    const thisHalfW = (this.width || 0) / 2;
    const thisHalfH = (this.height || 0) / 2;
    const otherHalfW = (other.width || 0) / 2;
    const otherHalfH = (other.height || 0) / 2;

    return (
      Math.abs(this.node.x - other.node.x) < thisHalfW + otherHalfW &&
      Math.abs(this.node.y - other.node.y) < thisHalfH + otherHalfH
    );
  }

  private checkCircleRect(circle: PhysicsBody, rect: PhysicsBody): boolean {
    const rectHalfW = (rect.width || 0) / 2;
    const rectHalfH = (rect.height || 0) / 2;
    const circleRadius = circle.radius || 0;

    // 找到矩形上距离圆心最近的点
    const closestX = Math.max(
      rect.node.x - rectHalfW,
      Math.min(circle.node.x, rect.node.x + rectHalfW)
    );
    const closestY = Math.max(
      rect.node.y - rectHalfH,
      Math.min(circle.node.y, rect.node.y + rectHalfH)
    );

    const dx = circle.node.x - closestX;
    const dy = circle.node.y - closestY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    return dist < circleRadius;
  }

  private getCollisionInfo(
    other: PhysicsBody
  ): { normal: { x: number; y: number }; depth: number } | null {
    if (this.shape === 'circle' && other.shape === 'circle') {
      const dx = other.node.x - this.node.x;
      const dy = other.node.y - this.node.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = (this.radius || 0) + (other.radius || 0);

      if (dist >= minDist) return null;

      const depth = minDist - dist;
      const normal = {
        x: dx / dist,
        y: dy / dist,
      };

      return { normal, depth };
    } else if (this.shape === 'rect' && other.shape === 'rect') {
      const dx = other.node.x - this.node.x;
      const dy = other.node.y - this.node.y;

      const thisHalfW = (this.width || 0) / 2;
      const thisHalfH = (this.height || 0) / 2;
      const otherHalfW = (other.width || 0) / 2;
      const otherHalfH = (other.height || 0) / 2;

      const overlapX = thisHalfW + otherHalfW - Math.abs(dx);
      const overlapY = thisHalfH + otherHalfH - Math.abs(dy);

      if (overlapX <= 0 || overlapY <= 0) return null;

      if (overlapX < overlapY) {
        return {
          normal: { x: dx > 0 ? 1 : -1, y: 0 },
          depth: overlapX,
        };
      } else {
        return {
          normal: { x: 0, y: dy > 0 ? 1 : -1 },
          depth: overlapY,
        };
      }
    }

    return null;
  }

  private findPhysicsWorld(): PhysicsWorld | null {
    // 向上查找 PhysicsWorld 组件
    let current: Node | null = this.node;
    while (current) {
      for (const comp of current.components) {
        if (comp instanceof PhysicsWorld) {
          return comp;
        }
      }
      current = current.parent;
    }
    return null;
  }
}

// ==================== PhysicsWorld 组件 ====================

/**
 * 物理世界组件
 *
 * 添加到根节点以启用物理模拟
 *
 * 用法:
 * ```typescript
 * root.addComponent(PhysicsWorld, {
 *   gravity: { x: 0, y: 9.8 }
 * });
 * ```
 */
export interface PhysicsWorldConfig {
  gravity?: { x: number; y: number };
  enableSleep?: boolean;
  iterations?: number;
}

export class PhysicsWorld extends Component {
  gravity: { x: number; y: number };
  enableSleep: boolean;
  iterations: number;

  private bodies: PhysicsBody[] = [];

  constructor(config: PhysicsWorldConfig = {}) {
    super();
    this.gravity = config.gravity || { x: 0, y: 0 };
    this.enableSleep = config.enableSleep ?? true;
    this.iterations = config.iterations || 6;
  }

  onUpdate(_dt: number): void {
    // 应用重力
    for (const body of this.bodies) {
      if (body.type === 'dynamic') {
        body.applyForce(this.gravity.x * body.mass, this.gravity.y * body.mass);
      }
    }

    // 碰撞检测和响应
    for (let i = 0; i < this.bodies.length; i++) {
      for (let j = i + 1; j < this.bodies.length; j++) {
        const bodyA = this.bodies[i];
        const bodyB = this.bodies[j];

        // 检查碰撞过滤
        if (!this.shouldCollide(bodyA, bodyB)) continue;

        // 检测碰撞
        if (bodyA.checkCollision(bodyB)) {
          // 解决碰撞
          bodyA.resolveCollision(bodyB);
        }
      }
    }
  }

  registerBody(body: PhysicsBody): void {
    if (!this.bodies.includes(body)) {
      this.bodies.push(body);
    }
  }

  unregisterBody(body: PhysicsBody): void {
    const index = this.bodies.indexOf(body);
    if (index >= 0) {
      this.bodies.splice(index, 1);
    }
  }

  private shouldCollide(bodyA: PhysicsBody, bodyB: PhysicsBody): boolean {
    // 静态物体之间不碰撞
    if (bodyA.type === 'static' && bodyB.type === 'static') {
      return false;
    }

    // 检查碰撞组和掩码
    if (bodyA.collisionGroup !== 0 && bodyB.collisionGroup !== 0) {
      if ((bodyA.collisionMask & bodyB.collisionGroup) === 0) {
        return false;
      }
      if ((bodyB.collisionMask & bodyA.collisionGroup) === 0) {
        return false;
      }
    }

    return true;
  }
}
