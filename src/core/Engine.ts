/**
 * 游戏引擎主类
 * 管理游戏循环、系统、场景
 */

import { World } from 'miniplex';
import type { GameEntity } from './Entity';
import { EventBus } from './EventBus';
import type { Scene, SceneClass } from './Scene';
import type { System, SystemClass } from './System';

export interface EngineConfig {
  /** Canvas 元素或选择器 */
  canvas: HTMLCanvasElement | string;
  /** 设计宽度 */
  width?: number;
  /** 设计高度 */
  height?: number;
  /** 背景颜色 */
  backgroundColor?: string;
  /** 是否自动缩放适配屏幕 */
  autoScale?: boolean;
  /** 目标帧率 */
  targetFPS?: number;
  /** 是否开启调试模式 */
  debug?: boolean;
}

export class Engine {
  /** Canvas 元素 */
  readonly canvas: HTMLCanvasElement;

  /** 2D 渲染上下文 */
  readonly ctx: CanvasRenderingContext2D;

  /** 设计宽度 */
  readonly width: number;

  /** 设计高度 */
  readonly height: number;

  /** 缩放系数 */
  scale = 1;

  /** 背景颜色 */
  backgroundColor: string;

  /** 调试模式 */
  debug: boolean;

  /** 事件总线 */
  readonly events = new EventBus();

  /** 实体世界 */
  readonly world = new World<GameEntity>();

  /** 已注册的系统 */
  private systems: System[] = [];
  private systemMap = new Map<SystemClass, System>();

  /** 已注册的场景 */
  private scenes = new Map<string, Scene>();
  private sceneClasses = new Map<string, SceneClass>();

  /** 当前场景 */
  private currentScene: Scene | null = null;

  /** 游戏时间 */
  time = 0;

  /** 帧计数 */
  frame = 0;

  /** 上一帧时间戳 */
  private lastTime = 0;

  /** 是否正在运行 */
  private running = false;

  /** 目标帧时间 */
  readonly targetFrameTime: number;

  /** 累积时间（用于固定时间步） */
  private accumulator = 0;

  /** 固定更新步长 (60fps) */
  readonly fixedDeltaTime = 1000 / 60;

  constructor(config: EngineConfig) {
    // 获取 Canvas
    if (typeof config.canvas === 'string') {
      const el = document.querySelector(config.canvas);
      if (!(el instanceof HTMLCanvasElement)) {
        throw new Error(`Canvas not found: ${config.canvas}`);
      }
      this.canvas = el;
    } else {
      this.canvas = config.canvas;
    }

    // 获取 2D 上下文
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;

    // 设置尺寸
    this.width = config.width ?? 1600;
    this.height = config.height ?? 900;
    this.backgroundColor = config.backgroundColor ?? '#000';
    this.debug = config.debug ?? false;
    this.targetFrameTime = 1000 / (config.targetFPS ?? 60);

    // 自动缩放
    if (config.autoScale !== false) {
      this.setupAutoScale();
      window.addEventListener('resize', () => this.resize());
    }

    this.resize();
  }

  /**
   * 设置自动缩放
   */
  private setupAutoScale(): void {
    this.resize();
  }

  /**
   * 调整画布大小
   */
  resize(): void {
    const ratio = this.width / this.height;
    let w = window.innerWidth;
    let h = window.innerHeight;

    if (w / h > ratio) {
      w = h * ratio;
    } else {
      h = w / ratio;
    }

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;

    this.scale = (w * dpr) / this.width;
    this.ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
  }

  /**
   * 注册系统
   */
  use<T extends System>(SystemClass: new () => T): this {
    if (this.systemMap.has(SystemClass as SystemClass)) {
      console.warn(`System ${SystemClass.name} already registered`);
      return this;
    }

    const system = new SystemClass();
    (system as unknown as { engine: Engine }).engine = this;

    // 按优先级插入
    const priority = (SystemClass as unknown as typeof System).priority ?? 0;
    let insertIndex = this.systems.length;
    for (let i = 0; i < this.systems.length; i++) {
      const existingPriority = (this.systems[i].constructor as typeof System).priority ?? 0;
      if (priority < existingPriority) {
        insertIndex = i;
        break;
      }
    }

    this.systems.splice(insertIndex, 0, system);
    this.systemMap.set(SystemClass as SystemClass, system);

    // 如果引擎已启动，立即初始化
    if (this.running) {
      system.onCreate?.();
    }

    return this;
  }

  /**
   * 获取系统
   */
  system<T extends System>(SystemClass: new () => T): T {
    const system = this.systemMap.get(SystemClass as SystemClass);
    if (!system) {
      throw new Error(`System ${SystemClass.name} not registered`);
    }
    return system as T;
  }

  /**
   * 检查系统是否已注册
   */
  hasSystem<T extends System>(SystemClass: new () => T): boolean {
    return this.systemMap.has(SystemClass as SystemClass);
  }

  /**
   * 注册场景
   */
  addScene(name: string, SceneClass: SceneClass): this {
    this.sceneClasses.set(name, SceneClass);
    return this;
  }

  /**
   * 切换场景
   */
  goto(name: string): void {
    const SceneClass = this.sceneClasses.get(name);
    if (!SceneClass) {
      throw new Error(`Scene not found: ${name}`);
    }

    // 退出当前场景
    if (this.currentScene) {
      this.currentScene.active = false;
      this.currentScene.onExit?.();
    }

    // 清理实体
    for (const entity of this.world.entities) {
      entity.onDestroy?.();
    }
    this.world.clear();

    // 创建或获取新场景
    let scene = this.scenes.get(name);
    if (!scene) {
      scene = new SceneClass();
      scene.name = name;
      (scene as unknown as { engine: Engine }).engine = this;
      (scene as unknown as { world: World<GameEntity> }).world = this.world;
      scene.onCreate?.();
      this.scenes.set(name, scene);
    }

    // 进入新场景
    this.currentScene = scene;
    scene.active = true;
    scene.onEnter?.();

    this.emit('scene:change', { name, scene });
  }

  /**
   * 启动游戏
   */
  start(initialScene?: string): void {
    if (this.running) return;
    this.running = true;

    // 初始化所有系统
    for (const system of this.systems) {
      system.onCreate?.();
    }

    // 进入初始场景
    if (initialScene) {
      this.goto(initialScene);
    }

    this.lastTime = performance.now();
    this.loop();
  }

  /**
   * 停止游戏
   */
  stop(): void {
    this.running = false;
  }

  /**
   * 游戏主循环
   */
  private loop = (): void => {
    if (!this.running) return;

    const now = performance.now();
    const dt = now - this.lastTime;
    this.lastTime = now;

    // 防止大的时间跳跃
    const clampedDt = Math.min(dt, 100);
    this.accumulator += clampedDt;

    // 固定时间步更新
    while (this.accumulator >= this.fixedDeltaTime) {
      this.update(this.fixedDeltaTime);
      this.accumulator -= this.fixedDeltaTime;
      this.time += this.fixedDeltaTime;
      this.frame++;
    }

    // 渲染
    this.render();

    requestAnimationFrame(this.loop);
  };

  /**
   * 更新逻辑
   */
  private update(dt: number): void {
    // 系统更新前
    for (const system of this.systems) {
      if (system.enabled) {
        system.onPreUpdate?.(dt);
      }
    }

    // 系统更新
    for (const system of this.systems) {
      if (system.enabled) {
        system.onUpdate?.(dt);
      }
    }

    // 场景更新
    this.currentScene?.onUpdate?.(dt);

    // 实体自定义更新
    for (const entity of this.world.entities) {
      entity.onUpdate?.(dt);
    }

    // 生命周期处理
    const toRemove: GameEntity[] = [];
    for (const entity of this.world.entities) {
      if (entity.lifecycle) {
        entity.lifecycle.age++;
        if (entity.lifecycle.lifetime > 0 && entity.lifecycle.age >= entity.lifecycle.lifetime) {
          entity.lifecycle.alive = false;
        }
        if (!entity.lifecycle.alive) {
          toRemove.push(entity);
        }
      }
    }
    for (const entity of toRemove) {
      entity.onDestroy?.();
      this.world.remove(entity);
    }

    // 系统更新后
    for (const system of this.systems) {
      if (system.enabled) {
        system.onPostUpdate?.(dt);
      }
    }
  }

  /**
   * 渲染
   */
  private render(): void {
    const { ctx } = this;

    // 清屏
    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(0, 0, this.width, this.height);

    // 系统渲染前
    for (const system of this.systems) {
      if (system.enabled) {
        system.onPreRender?.(ctx);
      }
    }

    // 系统渲染
    for (const system of this.systems) {
      if (system.enabled) {
        system.onRender?.(ctx);
      }
    }

    // 场景渲染
    this.currentScene?.onRender?.(ctx);

    // 实体自定义渲染
    for (const entity of this.world.entities) {
      entity.onRender?.(ctx);
    }

    // 系统渲染后
    for (const system of this.systems) {
      if (system.enabled) {
        system.onPostRender?.(ctx);
      }
    }
  }

  /**
   * 发送事件
   */
  emit<K extends string>(event: K, data?: unknown): void {
    this.events.emit(event, data);
  }

  /**
   * 监听事件
   */
  on<K extends string>(event: K, callback: (data: unknown) => void): { unsubscribe: () => void } {
    return this.events.on(event, callback);
  }

  /**
   * 一次性监听事件
   */
  once<K extends string>(event: K, callback: (data: unknown) => void): { unsubscribe: () => void } {
    return this.events.once(event, callback);
  }

  /**
   * 创建实体
   */
  spawn<T extends Partial<GameEntity>>(components: T): GameEntity & T {
    return this.world.add(components as GameEntity & T);
  }

  /**
   * 销毁实体
   */
  despawn(entity: GameEntity): void {
    entity.onDestroy?.();
    this.world.remove(entity);
  }

  /**
   * 获取当前场景
   */
  get scene(): Scene | null {
    return this.currentScene;
  }
}
