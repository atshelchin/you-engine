/**
 * Matter.js 物理系统封装
 * 提供完整的 2D 物理模拟（刚体、碰撞响应、约束等）
 */

import { System } from '../core/System';
import type { GameEntity } from '../core/Entity';
import Matter from 'matter-js';

export interface MatterBodyConfig {
  /** 物理类型 */
  type?: 'dynamic' | 'static' | 'kinematic';
  /** 形状 */
  shape?: 'circle' | 'rect' | 'polygon';
  /** 圆形半径 */
  radius?: number;
  /** 矩形宽度 */
  width?: number;
  /** 矩形高度 */
  height?: number;
  /** 多边形顶点 */
  vertices?: { x: number; y: number }[];
  /** 质量 */
  mass?: number;
  /** 密度 */
  density?: number;
  /** 摩擦力 */
  friction?: number;
  /** 空气阻力 */
  frictionAir?: number;
  /** 弹性 */
  restitution?: number;
  /** 是否为传感器（只检测碰撞不响应） */
  isSensor?: boolean;
  /** 碰撞过滤 */
  collisionFilter?: {
    category?: number;
    mask?: number;
    group?: number;
  };
  /** 初始角度 */
  angle?: number;
  /** 固定旋转 */
  fixedRotation?: boolean;
}

export interface MatterComponent {
  /** Matter.js body */
  body: Matter.Body;
  /** 配置 */
  config: MatterBodyConfig;
}

export class MatterPhysicsSystem extends System {
  static priority = 5; // 在简单物理之前

  /** Matter.js 引擎 */
  private matterEngine!: Matter.Engine;

  /** Matter.js 世界 */
  private matterWorld!: Matter.World;

  /** Body 到 Entity 的映射 */
  private bodyToEntity = new Map<Matter.Body, GameEntity>();

  /** 重力 */
  get gravity(): { x: number; y: number } {
    return this.matterWorld.gravity;
  }

  set gravity(value: { x: number; y: number }) {
    this.matterWorld.gravity.x = value.x;
    this.matterWorld.gravity.y = value.y;
  }

  onCreate(): void {
    // 创建 Matter.js 引擎
    this.matterEngine = Matter.Engine.create({
      gravity: { x: 0, y: 0, scale: 0.001 },
    });
    this.matterWorld = this.matterEngine.world;

    // 监听碰撞事件
    Matter.Events.on(this.matterEngine, 'collisionStart', (event) => {
      for (const pair of event.pairs) {
        const entityA = this.bodyToEntity.get(pair.bodyA);
        const entityB = this.bodyToEntity.get(pair.bodyB);
        if (entityA && entityB) {
          this.engine.emit('matter:collisionStart', {
            a: entityA,
            b: entityB,
            pair,
          });
        }
      }
    });

    Matter.Events.on(this.matterEngine, 'collisionActive', (event) => {
      for (const pair of event.pairs) {
        const entityA = this.bodyToEntity.get(pair.bodyA);
        const entityB = this.bodyToEntity.get(pair.bodyB);
        if (entityA && entityB) {
          this.engine.emit('matter:collisionActive', {
            a: entityA,
            b: entityB,
            pair,
          });
        }
      }
    });

    Matter.Events.on(this.matterEngine, 'collisionEnd', (event) => {
      for (const pair of event.pairs) {
        const entityA = this.bodyToEntity.get(pair.bodyA);
        const entityB = this.bodyToEntity.get(pair.bodyB);
        if (entityA && entityB) {
          this.engine.emit('matter:collisionEnd', {
            a: entityA,
            b: entityB,
            pair,
          });
        }
      }
    });
  }

  onUpdate(dt: number): void {
    // 同步实体 transform 到 Matter body（对于 kinematic 物体）
    for (const entity of this.engine.world.entities) {
      const matter = (entity as GameEntity & { matter?: MatterComponent }).matter;
      if (!matter || !entity.transform) continue;

      if (matter.config.type === 'kinematic') {
        Matter.Body.setPosition(matter.body, {
          x: entity.transform.x,
          y: entity.transform.y,
        });
        Matter.Body.setAngle(matter.body, entity.transform.rotation);
      }
    }

    // 更新物理引擎
    Matter.Engine.update(this.matterEngine, dt);

    // 同步 Matter body 到实体 transform
    for (const entity of this.engine.world.entities) {
      const matter = (entity as GameEntity & { matter?: MatterComponent }).matter;
      if (!matter || !entity.transform) continue;

      if (matter.config.type !== 'kinematic') {
        entity.transform.x = matter.body.position.x;
        entity.transform.y = matter.body.position.y;
        entity.transform.rotation = matter.body.angle;
      }

      // 同步速度
      if (entity.velocity) {
        entity.velocity.x = matter.body.velocity.x;
        entity.velocity.y = matter.body.velocity.y;
        entity.velocity.angularVelocity = matter.body.angularVelocity;
      }
    }
  }

  onDestroy(): void {
    Matter.Engine.clear(this.matterEngine);
    this.bodyToEntity.clear();
  }

  /**
   * 为实体添加物理 body
   */
  addBody(entity: GameEntity, config: MatterBodyConfig): Matter.Body {
    const transform = entity.transform;
    if (!transform) {
      throw new Error('Entity must have transform component');
    }

    let body: Matter.Body;

    // 创建对应形状的 body
    const options: Matter.IBodyDefinition = {
      isStatic: config.type === 'static',
      isSensor: config.isSensor ?? false,
      density: config.density ?? 0.001,
      friction: config.friction ?? 0.1,
      frictionAir: config.frictionAir ?? 0.01,
      restitution: config.restitution ?? 0,
      angle: config.angle ?? transform.rotation,
      collisionFilter: config.collisionFilter,
    };

    if (config.mass !== undefined) {
      options.mass = config.mass;
    }

    if (config.fixedRotation) {
      options.inertia = Infinity;
    }

    switch (config.shape) {
      case 'circle':
        body = Matter.Bodies.circle(
          transform.x,
          transform.y,
          config.radius ?? 10,
          options
        );
        break;

      case 'polygon':
        if (!config.vertices || config.vertices.length < 3) {
          throw new Error('Polygon requires at least 3 vertices');
        }
        body = Matter.Bodies.fromVertices(
          transform.x,
          transform.y,
          [config.vertices],
          options
        );
        break;

      case 'rect':
      default:
        body = Matter.Bodies.rectangle(
          transform.x,
          transform.y,
          config.width ?? 10,
          config.height ?? 10,
          options
        );
        break;
    }

    // 添加到世界
    Matter.Composite.add(this.matterWorld, body);

    // 建立映射
    this.bodyToEntity.set(body, entity);

    // 添加到实体
    (entity as GameEntity & { matter: MatterComponent }).matter = {
      body,
      config,
    };

    return body;
  }

  /**
   * 移除实体的物理 body
   */
  removeBody(entity: GameEntity): void {
    const matter = (entity as GameEntity & { matter?: MatterComponent }).matter;
    if (!matter) return;

    Matter.Composite.remove(this.matterWorld, matter.body);
    this.bodyToEntity.delete(matter.body);
    delete (entity as GameEntity & { matter?: MatterComponent }).matter;
  }

  /**
   * 获取实体的 Matter body
   */
  getBody(entity: GameEntity): Matter.Body | null {
    const matter = (entity as GameEntity & { matter?: MatterComponent }).matter;
    return matter?.body ?? null;
  }

  /**
   * 通过 body 获取实体
   */
  getEntity(body: Matter.Body): GameEntity | null {
    return this.bodyToEntity.get(body) ?? null;
  }

  /**
   * 施加力
   */
  applyForce(entity: GameEntity, force: { x: number; y: number }, point?: { x: number; y: number }): void {
    const body = this.getBody(entity);
    if (!body) return;

    const applyPoint = point ?? body.position;
    Matter.Body.applyForce(body, applyPoint, force);
  }

  /**
   * 设置速度
   */
  setVelocity(entity: GameEntity, velocity: { x: number; y: number }): void {
    const body = this.getBody(entity);
    if (!body) return;

    Matter.Body.setVelocity(body, velocity);
  }

  /**
   * 设置角速度
   */
  setAngularVelocity(entity: GameEntity, angularVelocity: number): void {
    const body = this.getBody(entity);
    if (!body) return;

    Matter.Body.setAngularVelocity(body, angularVelocity);
  }

  /**
   * 施加冲量
   */
  applyImpulse(entity: GameEntity, impulse: { x: number; y: number }, _point?: { x: number; y: number }): void {
    const body = this.getBody(entity);
    if (!body) return;

    // Matter.js 没有直接的冲量 API，通过修改速度实现
    const mass = body.mass;
    Matter.Body.setVelocity(body, {
      x: body.velocity.x + impulse.x / mass,
      y: body.velocity.y + impulse.y / mass,
    });
  }

  /**
   * 创建约束（连接两个物体）
   */
  createConstraint(
    entityA: GameEntity,
    entityB: GameEntity,
    options: {
      pointA?: { x: number; y: number };
      pointB?: { x: number; y: number };
      length?: number;
      stiffness?: number;
      damping?: number;
    } = {}
  ): Matter.Constraint | null {
    const bodyA = this.getBody(entityA);
    const bodyB = this.getBody(entityB);
    if (!bodyA || !bodyB) return null;

    const constraint = Matter.Constraint.create({
      bodyA,
      bodyB,
      pointA: options.pointA,
      pointB: options.pointB,
      length: options.length,
      stiffness: options.stiffness ?? 1,
      damping: options.damping ?? 0,
    });

    Matter.Composite.add(this.matterWorld, constraint);
    return constraint;
  }

  /**
   * 移除约束
   */
  removeConstraint(constraint: Matter.Constraint): void {
    Matter.Composite.remove(this.matterWorld, constraint);
  }

  /**
   * 点查询（获取某点下的所有物体）
   */
  queryPoint(point: { x: number; y: number }): GameEntity[] {
    const bodies = Matter.Query.point(
      Matter.Composite.allBodies(this.matterWorld),
      point
    );
    return bodies
      .map((body) => this.bodyToEntity.get(body))
      .filter((e): e is GameEntity => e !== undefined);
  }

  /**
   * 区域查询
   */
  queryRegion(bounds: { min: { x: number; y: number }; max: { x: number; y: number } }): GameEntity[] {
    const bodies = Matter.Query.region(
      Matter.Composite.allBodies(this.matterWorld),
      bounds
    );
    return bodies
      .map((body) => this.bodyToEntity.get(body))
      .filter((e): e is GameEntity => e !== undefined);
  }

  /**
   * 射线查询
   */
  raycast(
    start: { x: number; y: number },
    end: { x: number; y: number }
  ): { entity: GameEntity; point: { x: number; y: number }; normal: { x: number; y: number } }[] {
    const collisions = Matter.Query.ray(
      Matter.Composite.allBodies(this.matterWorld),
      start,
      end
    );

    return collisions
      .map((collision) => {
        const entity = this.bodyToEntity.get(collision.bodyA);
        if (!entity) return null;
        return {
          entity,
          point: collision.supports[0] ?? start,
          normal: collision.normal,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
  }

  /**
   * 获取 Matter.js 引擎（高级用法）
   */
  getMatterEngine(): Matter.Engine {
    return this.matterEngine;
  }

  /**
   * 获取 Matter.js 世界（高级用法）
   */
  getMatterWorld(): Matter.World {
    return this.matterWorld;
  }

  /**
   * 检测两个实体是否碰撞（精确碰撞检测）
   * 支持任意形状组合：circle-circle, circle-rect, circle-polygon, rect-rect, rect-polygon, polygon-polygon
   */
  checkCollision(entityA: GameEntity, entityB: GameEntity): {
    colliding: boolean;
    depth: number;
    normal: { x: number; y: number };
    point: { x: number; y: number };
  } | null {
    const bodyA = this.getBody(entityA);
    const bodyB = this.getBody(entityB);

    if (!bodyA || !bodyB) return null;

    const collision = Matter.Collision.collides(bodyA, bodyB);

    if (collision && collision.collided) {
      return {
        colliding: true,
        depth: collision.depth,
        normal: collision.normal,
        point: collision.supports[0] ?? { x: bodyA.position.x, y: bodyA.position.y },
      };
    }

    return null;
  }

  /**
   * 检测圆形和多边形/矩形/圆形的碰撞
   * 用于不使用 Matter body 的实体（手动碰撞检测）
   */
  checkCircleShapeCollision(
    cx: number,
    cy: number,
    radius: number,
    shape: {
      type: 'rect' | 'circle' | 'polygon' | 'triangle';
      x: number;
      y: number;
      width?: number;
      height?: number;
      radius?: number;
      vertices?: { x: number; y: number }[];
    }
  ): { colliding: boolean; depth: number; normal: { x: number; y: number } } | null {
    // 创建临时 body 进行检测
    const circleBody = Matter.Bodies.circle(cx, cy, radius, { isStatic: true });

    let shapeBody: Matter.Body;

    switch (shape.type) {
      case 'circle':
        shapeBody = Matter.Bodies.circle(shape.x, shape.y, shape.radius ?? 10, { isStatic: true });
        break;
      case 'rect':
        shapeBody = Matter.Bodies.rectangle(
          shape.x,
          shape.y,
          shape.width ?? 10,
          shape.height ?? 10,
          { isStatic: true }
        );
        break;
      case 'triangle':
      case 'polygon':
        if (!shape.vertices || shape.vertices.length < 3) {
          // 退化为矩形
          shapeBody = Matter.Bodies.rectangle(
            shape.x,
            shape.y,
            shape.width ?? 10,
            shape.height ?? 10,
            { isStatic: true }
          );
        } else {
          // 将相对顶点转换为绝对坐标
          const absoluteVertices = shape.vertices.map(v => ({
            x: shape.x + v.x,
            y: shape.y + v.y
          }));
          shapeBody = Matter.Bodies.fromVertices(
            shape.x,
            shape.y,
            [absoluteVertices],
            { isStatic: true }
          );
        }
        break;
      default:
        return null;
    }

    const collision = Matter.Collision.collides(circleBody, shapeBody);

    if (collision && collision.collided) {
      return {
        colliding: true,
        depth: collision.depth,
        normal: collision.normal,
      };
    }

    return null;
  }

  /**
   * 检测两个任意形状之间的碰撞
   * 支持 rect/circle/polygon/triangle
   */
  checkShapeShapeCollision(
    shapeA: {
      type: 'rect' | 'circle' | 'polygon' | 'triangle';
      x: number;
      y: number;
      width?: number;
      height?: number;
      radius?: number;
      vertices?: { x: number; y: number }[];
    },
    shapeB: {
      type: 'rect' | 'circle' | 'polygon' | 'triangle';
      x: number;
      y: number;
      width?: number;
      height?: number;
      radius?: number;
      vertices?: { x: number; y: number }[];
    }
  ): { colliding: boolean; depth: number; normal: { x: number; y: number } } | null {
    const bodyA = this.createTempBody(shapeA);
    const bodyB = this.createTempBody(shapeB);

    if (!bodyA || !bodyB) return null;

    const collision = Matter.Collision.collides(bodyA, bodyB);

    if (collision && collision.collided) {
      return {
        colliding: true,
        depth: collision.depth,
        normal: collision.normal,
      };
    }

    return null;
  }

  /**
   * 创建临时 body 用于碰撞检测（不添加到世界）
   */
  private createTempBody(shape: {
    type: 'rect' | 'circle' | 'polygon' | 'triangle';
    x: number;
    y: number;
    width?: number;
    height?: number;
    radius?: number;
    vertices?: { x: number; y: number }[];
  }): Matter.Body | null {
    switch (shape.type) {
      case 'circle':
        return Matter.Bodies.circle(shape.x, shape.y, shape.radius ?? 10, { isStatic: true });
      case 'rect':
        return Matter.Bodies.rectangle(
          shape.x,
          shape.y,
          shape.width ?? 10,
          shape.height ?? 10,
          { isStatic: true }
        );
      case 'triangle':
      case 'polygon':
        if (!shape.vertices || shape.vertices.length < 3) {
          return Matter.Bodies.rectangle(
            shape.x,
            shape.y,
            shape.width ?? 10,
            shape.height ?? 10,
            { isStatic: true }
          );
        }
        const absoluteVertices = shape.vertices.map(v => ({
          x: shape.x + v.x,
          y: shape.y + v.y
        }));
        return Matter.Bodies.fromVertices(
          shape.x,
          shape.y,
          [absoluteVertices],
          { isStatic: true }
        );
      default:
        return null;
    }
  }
}
