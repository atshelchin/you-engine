/**
 * 简单物理系统
 * 处理基本的移动和碰撞检测
 * 适用于不需要复杂物理模拟的游戏
 */

import { System } from '../core/System';
import type { GameEntity } from '../core/Entity';

export interface CollisionPair {
  a: GameEntity;
  b: GameEntity;
  /** 碰撞法线 (从 a 指向 b) */
  normalX: number;
  normalY: number;
  /** 穿透深度 */
  depth: number;
}

export class PhysicsSystem extends System {
  static priority = 10; // 在渲染之前

  /** 重力 */
  gravity = { x: 0, y: 0 };

  /** 当前帧的碰撞对 */
  private collisions: CollisionPair[] = [];

  /** 碰撞回调 */
  private collisionCallbacks: ((pair: CollisionPair) => void)[] = [];

  onUpdate(dt: number): void {
    const entities = this.engine.world.entities;
    const dtSec = dt / 1000;

    // 应用速度和重力
    for (const entity of entities) {
      if (!entity.transform || !entity.velocity) continue;

      // 应用重力
      entity.velocity.x += this.gravity.x * dtSec;
      entity.velocity.y += this.gravity.y * dtSec;

      // 应用阻尼
      if (entity.velocity.damping) {
        const damping = Math.pow(1 - entity.velocity.damping, dtSec);
        entity.velocity.x *= damping;
        entity.velocity.y *= damping;
      }

      // 更新位置
      entity.transform.x += entity.velocity.x * dtSec;
      entity.transform.y += entity.velocity.y * dtSec;

      // 更新旋转
      if (entity.velocity.angularVelocity) {
        entity.transform.rotation += entity.velocity.angularVelocity * dtSec;
      }
    }

    // 碰撞检测
    this.collisions = [];
    const collidables = entities.filter((e) => e.collider && e.transform);

    for (let i = 0; i < collidables.length; i++) {
      for (let j = i + 1; j < collidables.length; j++) {
        const a = collidables[i];
        const b = collidables[j];

        // 检查层级过滤
        if (!this.shouldCollide(a, b)) continue;

        const collision = this.checkCollision(a, b);
        if (collision) {
          this.collisions.push(collision);

          // 触发回调
          for (const callback of this.collisionCallbacks) {
            callback(collision);
          }

          // 发送事件
          this.engine.emit('collision', collision);
        }
      }
    }
  }

  /**
   * 检查两个实体是否应该碰撞
   */
  private shouldCollide(a: GameEntity, b: GameEntity): boolean {
    const aCollider = a.collider!;
    const bCollider = b.collider!;

    // 如果指定了碰撞层
    if (aCollider.layer !== undefined && bCollider.mask !== undefined) {
      if ((aCollider.layer & bCollider.mask) === 0) return false;
    }
    if (bCollider.layer !== undefined && aCollider.mask !== undefined) {
      if ((bCollider.layer & aCollider.mask) === 0) return false;
    }

    return true;
  }

  /**
   * 检测两个实体之间的碰撞
   */
  private checkCollision(a: GameEntity, b: GameEntity): CollisionPair | null {
    const aCollider = a.collider!;
    const bCollider = b.collider!;
    const aTransform = a.transform!;
    const bTransform = b.transform!;

    // 计算碰撞体中心位置
    const ax = aTransform.x + (aCollider.offsetX ?? 0);
    const ay = aTransform.y + (aCollider.offsetY ?? 0);
    const bx = bTransform.x + (bCollider.offsetX ?? 0);
    const by = bTransform.y + (bCollider.offsetY ?? 0);

    // 圆形 vs 圆形
    if (aCollider.type === 'circle' && bCollider.type === 'circle') {
      return this.circleVsCircle(a, b, ax, ay, aCollider.radius!, bx, by, bCollider.radius!);
    }

    // 矩形 vs 矩形
    if (aCollider.type === 'rect' && bCollider.type === 'rect') {
      return this.rectVsRect(
        a, b,
        ax, ay, aCollider.width!, aCollider.height!,
        bx, by, bCollider.width!, bCollider.height!
      );
    }

    // 圆形 vs 矩形
    if (aCollider.type === 'circle' && bCollider.type === 'rect') {
      return this.circleVsRect(
        a, b,
        ax, ay, aCollider.radius!,
        bx, by, bCollider.width!, bCollider.height!
      );
    }

    // 矩形 vs 圆形
    if (aCollider.type === 'rect' && bCollider.type === 'circle') {
      const result = this.circleVsRect(
        b, a,
        bx, by, bCollider.radius!,
        ax, ay, aCollider.width!, aCollider.height!
      );
      if (result) {
        // 交换并反转法线
        return {
          a: result.b,
          b: result.a,
          normalX: -result.normalX,
          normalY: -result.normalY,
          depth: result.depth,
        };
      }
    }

    return null;
  }

  /**
   * 圆形 vs 圆形碰撞检测
   */
  private circleVsCircle(
    a: GameEntity,
    b: GameEntity,
    ax: number,
    ay: number,
    ar: number,
    bx: number,
    by: number,
    br: number
  ): CollisionPair | null {
    const dx = bx - ax;
    const dy = by - ay;
    const distSq = dx * dx + dy * dy;
    const radiusSum = ar + br;

    if (distSq >= radiusSum * radiusSum) {
      return null;
    }

    const dist = Math.sqrt(distSq);
    const depth = radiusSum - dist;

    // 法线方向
    let normalX = 0;
    let normalY = 1;
    if (dist > 0.0001) {
      normalX = dx / dist;
      normalY = dy / dist;
    }

    return { a, b, normalX, normalY, depth };
  }

  /**
   * 矩形 vs 矩形碰撞检测 (AABB)
   */
  private rectVsRect(
    a: GameEntity,
    b: GameEntity,
    ax: number,
    ay: number,
    aw: number,
    ah: number,
    bx: number,
    by: number,
    bw: number,
    bh: number
  ): CollisionPair | null {
    const aLeft = ax - aw / 2;
    const aRight = ax + aw / 2;
    const aTop = ay - ah / 2;
    const aBottom = ay + ah / 2;

    const bLeft = bx - bw / 2;
    const bRight = bx + bw / 2;
    const bTop = by - bh / 2;
    const bBottom = by + bh / 2;

    // AABB 检测
    if (aRight < bLeft || aLeft > bRight || aBottom < bTop || aTop > bBottom) {
      return null;
    }

    // 计算穿透深度
    const overlapX = Math.min(aRight - bLeft, bRight - aLeft);
    const overlapY = Math.min(aBottom - bTop, bBottom - aTop);

    // 选择最小穿透轴
    let normalX = 0;
    let normalY = 0;
    let depth: number;

    if (overlapX < overlapY) {
      depth = overlapX;
      normalX = ax < bx ? -1 : 1;
    } else {
      depth = overlapY;
      normalY = ay < by ? -1 : 1;
    }

    return { a, b, normalX, normalY, depth };
  }

  /**
   * 圆形 vs 矩形碰撞检测
   */
  private circleVsRect(
    circleEntity: GameEntity,
    rectEntity: GameEntity,
    cx: number,
    cy: number,
    cr: number,
    rx: number,
    ry: number,
    rw: number,
    rh: number
  ): CollisionPair | null {
    // 找到矩形上离圆心最近的点
    const halfW = rw / 2;
    const halfH = rh / 2;

    const closestX = Math.max(rx - halfW, Math.min(cx, rx + halfW));
    const closestY = Math.max(ry - halfH, Math.min(cy, ry + halfH));

    const dx = cx - closestX;
    const dy = cy - closestY;
    const distSq = dx * dx + dy * dy;

    if (distSq >= cr * cr) {
      return null;
    }

    const dist = Math.sqrt(distSq);
    const depth = cr - dist;

    let normalX = 0;
    let normalY = 1;
    if (dist > 0.0001) {
      normalX = dx / dist;
      normalY = dy / dist;
    }

    return {
      a: circleEntity,
      b: rectEntity,
      normalX,
      normalY,
      depth,
    };
  }

  /**
   * 获取当前帧的所有碰撞
   */
  getCollisions(): readonly CollisionPair[] {
    return this.collisions;
  }

  /**
   * 检查实体是否与其他实体碰撞
   */
  isColliding(entity: GameEntity): boolean {
    return this.collisions.some((c) => c.a === entity || c.b === entity);
  }

  /**
   * 获取与指定实体碰撞的所有实体
   */
  getCollidingWith(entity: GameEntity): GameEntity[] {
    const result: GameEntity[] = [];
    for (const collision of this.collisions) {
      if (collision.a === entity) {
        result.push(collision.b);
      } else if (collision.b === entity) {
        result.push(collision.a);
      }
    }
    return result;
  }

  /**
   * 注册碰撞回调
   */
  onCollision(callback: (pair: CollisionPair) => void): () => void {
    this.collisionCallbacks.push(callback);
    return () => {
      const index = this.collisionCallbacks.indexOf(callback);
      if (index >= 0) {
        this.collisionCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * 点是否在实体碰撞体内
   */
  pointInEntity(x: number, y: number, entity: GameEntity): boolean {
    if (!entity.collider || !entity.transform) return false;

    const collider = entity.collider;
    const transform = entity.transform;
    const cx = transform.x + (collider.offsetX ?? 0);
    const cy = transform.y + (collider.offsetY ?? 0);

    if (collider.type === 'circle' && collider.radius) {
      const dx = x - cx;
      const dy = y - cy;
      return dx * dx + dy * dy <= collider.radius * collider.radius;
    }

    if (collider.type === 'rect' && collider.width && collider.height) {
      const halfW = collider.width / 2;
      const halfH = collider.height / 2;
      return x >= cx - halfW && x <= cx + halfW && y >= cy - halfH && y <= cy + halfH;
    }

    return false;
  }

  /**
   * 射线检测
   */
  raycast(
    originX: number,
    originY: number,
    dirX: number,
    dirY: number,
    maxDistance = Infinity
  ): { entity: GameEntity; distance: number; point: { x: number; y: number } } | null {
    // 归一化方向
    const len = Math.sqrt(dirX * dirX + dirY * dirY);
    if (len === 0) return null;
    dirX /= len;
    dirY /= len;

    let closest: {
      entity: GameEntity;
      distance: number;
      point: { x: number; y: number };
    } | null = null;

    for (const entity of this.engine.world.entities) {
      if (!entity.collider || !entity.transform) continue;

      const result = this.raycastEntity(originX, originY, dirX, dirY, entity, maxDistance);
      if (result && (!closest || result.distance < closest.distance)) {
        closest = result;
      }
    }

    return closest;
  }

  /**
   * 射线与单个实体检测
   */
  private raycastEntity(
    ox: number,
    oy: number,
    dx: number,
    dy: number,
    entity: GameEntity,
    maxDistance: number
  ): { entity: GameEntity; distance: number; point: { x: number; y: number } } | null {
    const collider = entity.collider!;
    const transform = entity.transform!;
    const cx = transform.x + (collider.offsetX ?? 0);
    const cy = transform.y + (collider.offsetY ?? 0);

    if (collider.type === 'circle' && collider.radius) {
      // 射线与圆的交点
      const fx = ox - cx;
      const fy = oy - cy;

      const a = dx * dx + dy * dy;
      const b = 2 * (fx * dx + fy * dy);
      const c = fx * fx + fy * fy - collider.radius * collider.radius;

      const discriminant = b * b - 4 * a * c;
      if (discriminant < 0) return null;

      const sqrtDisc = Math.sqrt(discriminant);
      let t = (-b - sqrtDisc) / (2 * a);

      if (t < 0) {
        t = (-b + sqrtDisc) / (2 * a);
      }

      if (t < 0 || t > maxDistance) return null;

      return {
        entity,
        distance: t,
        point: { x: ox + dx * t, y: oy + dy * t },
      };
    }

    if (collider.type === 'rect' && collider.width && collider.height) {
      // 射线与 AABB 的交点
      const halfW = collider.width / 2;
      const halfH = collider.height / 2;

      let tmin = -Infinity;
      let tmax = Infinity;

      // X 轴
      if (dx !== 0) {
        const t1 = (cx - halfW - ox) / dx;
        const t2 = (cx + halfW - ox) / dx;
        tmin = Math.max(tmin, Math.min(t1, t2));
        tmax = Math.min(tmax, Math.max(t1, t2));
      } else if (ox < cx - halfW || ox > cx + halfW) {
        return null;
      }

      // Y 轴
      if (dy !== 0) {
        const t1 = (cy - halfH - oy) / dy;
        const t2 = (cy + halfH - oy) / dy;
        tmin = Math.max(tmin, Math.min(t1, t2));
        tmax = Math.min(tmax, Math.max(t1, t2));
      } else if (oy < cy - halfH || oy > cy + halfH) {
        return null;
      }

      if (tmax < 0 || tmin > tmax || tmin > maxDistance) {
        return null;
      }

      const t = tmin >= 0 ? tmin : tmax;
      if (t > maxDistance) return null;

      return {
        entity,
        distance: t,
        point: { x: ox + dx * t, y: oy + dy * t },
      };
    }

    return null;
  }

  /**
   * 分离两个碰撞的实体
   */
  separate(pair: CollisionPair, ratio = 0.5): void {
    const { a, b, normalX, normalY, depth } = pair;

    if (!a.transform || !b.transform) return;

    // 根据比例分离
    const separateA = depth * ratio;
    const separateB = depth * (1 - ratio);

    a.transform.x -= normalX * separateA;
    a.transform.y -= normalY * separateA;

    b.transform.x += normalX * separateB;
    b.transform.y += normalY * separateB;
  }

  /**
   * 简单的弹性碰撞响应
   */
  bounce(pair: CollisionPair, restitution = 1): void {
    const { a, b, normalX, normalY } = pair;

    if (!a.velocity || !b.velocity) return;

    // 相对速度
    const relVelX = b.velocity.x - a.velocity.x;
    const relVelY = b.velocity.y - a.velocity.y;

    // 沿法线的相对速度
    const velAlongNormal = relVelX * normalX + relVelY * normalY;

    // 如果物体正在分离，不处理
    if (velAlongNormal > 0) return;

    // 计算冲量
    const impulse = -(1 + restitution) * velAlongNormal / 2;

    a.velocity.x -= impulse * normalX;
    a.velocity.y -= impulse * normalY;

    b.velocity.x += impulse * normalX;
    b.velocity.y += impulse * normalY;
  }
}
