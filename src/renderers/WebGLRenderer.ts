/**
 * WebGL Renderer
 *
 * 使用 WebGL 批量渲染,适合大规模节点的游戏
 * 性能可达 Canvas 2D 的 5-10 倍
 */

import { BaseRenderer } from '../core/IRenderer';
import type { Node } from '../core/Node';
import { SpriteBatch } from './webgl/SpriteBatch';
import { CircleRenderer, SpriteRenderer } from '../components/Renderer';

type NodeWithAlpha = Node & { alpha?: number };

export class WebGLRenderer extends BaseRenderer {
  readonly type = 'webgl' as const;

  private gl: WebGLRenderingContext;
  private spriteBatch: SpriteBatch;
  private projectionMatrix: Float32Array;

  // 临时 canvas 用于渲染圆形等形状
  private shapeCanvas: HTMLCanvasElement;
  private shapeCache: Map<string, HTMLCanvasElement> = new Map();

  // 白色圆形纹理 (用于所有圆形的批量渲染)
  private whiteCircleTexture: HTMLCanvasElement | null = null;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);

    const gl = canvas.getContext('webgl', { antialias: true });
    if (!gl) {
      throw new Error('WebGL not supported');
    }

    this.gl = gl;
    this.spriteBatch = new SpriteBatch(gl, 10000);
    this.projectionMatrix = new Float32Array(16);

    // 创建形状缓存 canvas
    this.shapeCanvas = document.createElement('canvas');
    this.shapeCanvas.width = 256;
    this.shapeCanvas.height = 256;
  }

  async init(): Promise<void> {
    const gl = this.gl;

    // 设置 WebGL 状态
    gl.clearColor(0.1, 0.1, 0.18, 1.0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // 更新投影矩阵
    this.updateProjectionMatrix();

    console.log('✓ WebGL Renderer initialized');
  }

  beginFrame(clearColor: string = '#1a1a2e'): void {
    super.beginFrame(clearColor);

    const gl = this.gl;

    // 解析颜色
    const color = this.parseColor(clearColor);
    gl.clearColor(color[0], color[1], color[2], 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // 开始批量渲染
    this.spriteBatch.begin(this.projectionMatrix);
  }

  renderScene(root: Node): void {
    // 递归渲染场景图
    this.renderNode(root);
  }

  protected renderNodeComponents(node: Node, transform: DOMMatrix): void {
    // 从变换矩阵中提取位置、旋转、缩放
    const x = transform.m41;
    const y = transform.m42;
    const rotation = Math.atan2(transform.m12, transform.m11);
    const scaleX = Math.sqrt(transform.m11 * transform.m11 + transform.m12 * transform.m12);
    const scaleY = Math.sqrt(transform.m21 * transform.m21 + transform.m22 * transform.m22);

    // 获取透明度
    const alpha = (node as NodeWithAlpha).alpha ?? 1.0;

    // 渲染所有组件
    for (const component of node.components) {
      if (component instanceof SpriteRenderer) {
        // 精灵渲染
        this.spriteBatch.draw(
          component.image,
          x,
          y,
          component.width * scaleX,
          component.height * scaleY,
          rotation,
          [1, 1, 1, alpha * component.opacity]
        );
      } else if (component instanceof CircleRenderer) {
        // 圆形渲染 - 使用白色纹理 + 颜色调制 (所有圆形可批量渲染)
        const texture = this.getWhiteCircleTexture();
        const color = this.parseColorToRGBA(component.color);
        this.spriteBatch.draw(
          texture,
          x,
          y,
          component.radius * 2 * scaleX,
          component.radius * 2 * scaleY,
          rotation,
          [color[0], color[1], color[2], alpha * color[3]]
        );
      }
      // TODO: 支持更多组件类型
    }
  }

  endFrame(): void {
    // 结束批量渲染
    this.spriteBatch.end();

    // 更新统计
    this.stats.drawCalls = this.spriteBatch.getDrawCallCount();

    super.endFrame();
  }

  resize(width: number, height: number): void {
    super.resize(width, height);

    const gl = this.gl;
    gl.viewport(0, 0, width, height);

    this.updateProjectionMatrix();
  }

  destroy(): void {
    this.spriteBatch.destroy();
    this.shapeCache.clear();
  }

  // ==================== 辅助方法 ====================

  /**
   * 更新正交投影矩阵
   */
  private updateProjectionMatrix(): void {
    const w = this.canvas.width;
    const h = this.canvas.height;

    // 正交投影矩阵 (以画布中心为原点)
    const left = -w / 2;
    const right = w / 2;
    const bottom = h / 2;
    const top = -h / 2;
    const near = -1;
    const far = 1;

    const m = this.projectionMatrix;

    m[0] = 2 / (right - left);
    m[1] = 0;
    m[2] = 0;
    m[3] = 0;

    m[4] = 0;
    m[5] = 2 / (top - bottom);
    m[6] = 0;
    m[7] = 0;

    m[8] = 0;
    m[9] = 0;
    m[10] = -2 / (far - near);
    m[11] = 0;

    m[12] = -(right + left) / (right - left);
    m[13] = -(top + bottom) / (top - bottom);
    m[14] = -(far + near) / (far - near);
    m[15] = 1;
  }

  /**
   * 获取白色圆形纹理 (用于所有圆形的批量渲染)
   */
  private getWhiteCircleTexture(): HTMLCanvasElement {
    if (this.whiteCircleTexture) return this.whiteCircleTexture;

    // 创建一个白色圆形纹理 (固定大小 64x64)
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
    ctx.fill();

    this.whiteCircleTexture = canvas;
    return canvas;
  }

  /**
   * 解析 CSS 颜色为 RGBA (0-1 范围)
   */
  private parseColorToRGBA(color: string): [number, number, number, number] {
    // 简单的十六进制颜色解析
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      return [r, g, b, 1.0];
    }

    // 默认白色
    return [1, 1, 1, 1];
  }

  /**
   * 解析 CSS 颜色为 RGBA
   */
  private parseColor(color: string): [number, number, number, number] {
    // 简单的十六进制颜色解析
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      return [r, g, b, 1.0];
    }

    // 默认黑色
    return [0, 0, 0, 1];
  }
}
