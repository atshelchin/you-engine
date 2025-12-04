/**
 * Engine V3 - 支持多种渲染器的游戏引擎
 *
 * 特性：
 * - 支持 Canvas2D / WebGL / WebGPU 渲染器
 * - 可在运行时切换渲染器
 * - 性能统计
 */

import { Node } from './Node';
import type { IRenderer, RendererType } from './IRenderer';
import { Canvas2DRenderer } from '../renderers/Canvas2DRenderer';

export interface EngineV3Config {
  canvas: HTMLCanvasElement | string;
  renderer?: IRenderer;
  width?: number;
  height?: number;
  backgroundColor?: string;
}

export class Engine {
  readonly canvas: HTMLCanvasElement;
  readonly root: Node;

  private renderer: IRenderer;
  private running = false;
  private lastTime = 0;
  private backgroundColor: string;

  constructor(config: EngineV3Config) {
    // 获取 canvas
    if (typeof config.canvas === 'string') {
      const element = document.querySelector(config.canvas);
      if (!element || !(element instanceof HTMLCanvasElement)) {
        throw new Error(`Canvas not found: ${config.canvas}`);
      }
      this.canvas = element;
    } else {
      this.canvas = config.canvas;
    }

    // 设置大小
    const width = config.width || 800;
    const height = config.height || 600;
    this.canvas.width = width;
    this.canvas.height = height;

    this.backgroundColor = config.backgroundColor || '#1a1a2e';

    // 创建渲染器
    this.renderer = config.renderer || new Canvas2DRenderer(this.canvas);

    // 创建根节点
    this.root = new Node();
    this.root.name = 'Root';
  }

  /**
   * 初始化引擎
   */
  async init(): Promise<void> {
    await this.renderer.init();
    console.log(`✓ Engine initialized with ${this.renderer.type} renderer`);
  }

  /**
   * 切换渲染器
   */
  async switchRenderer(renderer: IRenderer): Promise<void> {
    console.log(`Switching renderer from ${this.renderer.type} to ${renderer.type}...`);

    // 暂停游戏循环，防止在初始化期间渲染
    const wasRunning = this.running;
    this.running = false;

    // 等待当前帧完成
    await new Promise((resolve) => setTimeout(resolve, 20));

    // 销毁旧渲染器
    this.renderer.destroy();

    // 初始化新渲染器
    this.renderer = renderer;
    await this.renderer.init();

    // 恢复游戏循环
    if (wasRunning) {
      this.running = true;
      this.lastTime = performance.now();
      this.gameLoop();
    }

    console.log(`✓ Switched to ${this.renderer.type} renderer`);
  }

  /**
   * 获取当前渲染器类型
   */
  getRendererType(): RendererType {
    return this.renderer.type;
  }

  /**
   * 获取渲染统计
   */
  getStats() {
    return this.renderer.getStats();
  }

  /**
   * 启动游戏
   */
  start(): void {
    if (this.running) return;

    this.running = true;
    this.root._init();
    this.lastTime = performance.now();
    this.gameLoop();
  }

  /**
   * 停止游戏
   */
  stop(): void {
    this.running = false;
  }

  /**
   * 游戏循环
   */
  private gameLoop = (): void => {
    if (!this.running) return;

    const currentTime = performance.now();
    const dt = (currentTime - this.lastTime) / 1000; // 转换为秒
    this.lastTime = currentTime;

    // 更新场景
    this.root._update(dt);

    // 渲染场景
    this.renderer.beginFrame(this.backgroundColor);
    this.renderer.renderScene(this.root);
    this.renderer.endFrame();

    // 下一帧
    requestAnimationFrame(this.gameLoop);
  };

  /**
   * 截图
   */
  screenshot(): string {
    return this.renderer.screenshot();
  }

  /**
   * 调整大小
   */
  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.renderer.resize(width, height);
  }

  /**
   * 清空场景
   */
  clear(): void {
    for (const child of [...this.root.children]) {
      child.destroy();
    }
  }

  /**
   * 销毁引擎
   */
  destroy(): void {
    this.stop();
    this.clear();
    this.renderer.destroy();
  }
}
