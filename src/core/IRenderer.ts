/**
 * Renderer Interface - 渲染器抽象接口
 *
 * 支持多种渲染后端：Canvas2D / WebGL / WebGPU
 */

import type { Node } from './Node';

// ==================== 渲染统计 ====================

export interface RenderStats {
  fps: number;
  drawCalls: number;
  triangles: number;
  vertices: number;
  textures: number;
  renderTime: number; // ms
}

// ==================== 渲染器类型 ====================

export type RendererType = 'canvas2d' | 'webgl' | 'webgpu';

// ==================== 渲染器接口 ====================

export interface IRenderer {
  readonly type: RendererType;
  readonly canvas: HTMLCanvasElement;

  /**
   * 初始化渲染器
   */
  init(): Promise<void>;

  /**
   * 开始一帧渲染
   */
  beginFrame(clearColor?: string): void;

  /**
   * 渲染场景图
   */
  renderScene(root: Node): void;

  /**
   * 结束一帧渲染
   */
  endFrame(): void;

  /**
   * 获取渲染统计
   */
  getStats(): RenderStats;

  /**
   * 调整大小
   */
  resize(width: number, height: number): void;

  /**
   * 销毁渲染器
   */
  destroy(): void;

  /**
   * 截图
   */
  screenshot(): string; // Base64 PNG
}

// ==================== 基础渲染器抽象类 ====================

export abstract class BaseRenderer implements IRenderer {
  abstract readonly type: RendererType;
  readonly canvas: HTMLCanvasElement;

  protected stats: RenderStats = {
    fps: 60,
    drawCalls: 0,
    triangles: 0,
    vertices: 0,
    textures: 0,
    renderTime: 0,
  };

  protected frameStartTime = 0;
  protected frameCount = 0;
  protected lastFpsUpdate = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  abstract init(): Promise<void>;

  beginFrame(_clearColor?: string): void {
    this.frameStartTime = performance.now();
    this.stats.drawCalls = 0;
    this.stats.triangles = 0;
    this.stats.vertices = 0;
  }

  abstract renderScene(root: Node): void;

  endFrame(): void {
    this.stats.renderTime = performance.now() - this.frameStartTime;

    // 更新 FPS
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 1000) {
      this.stats.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
  }

  getStats(): RenderStats {
    return { ...this.stats };
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  abstract destroy(): void;

  screenshot(): string {
    return this.canvas.toDataURL('image/png');
  }

  // ==================== 辅助方法 ====================

  /**
   * 递归渲染节点树
   */
  protected renderNode(node: Node, parentTransform?: DOMMatrix): void {
    if (!node.visible) return;

    // 计算世界变换矩阵
    const transform = this.calculateTransform(node, parentTransform);

    // 渲染当前节点
    this.renderNodeComponents(node, transform);

    // 递归渲染子节点
    for (const child of node.children) {
      this.renderNode(child, transform);
    }
  }

  /**
   * 计算节点的世界变换矩阵
   */
  protected calculateTransform(node: Node, parentTransform?: DOMMatrix): DOMMatrix {
    const matrix = parentTransform ? parentTransform.multiply(new DOMMatrix()) : new DOMMatrix();

    matrix.translateSelf(node.x, node.y);
    matrix.rotateSelf(0, 0, node.rotation * (180 / Math.PI));
    matrix.scaleSelf(node.scale, node.scale);

    return matrix;
  }

  /**
   * 渲染节点的所有组件
   */
  protected abstract renderNodeComponents(node: Node, transform: DOMMatrix): void;
}
