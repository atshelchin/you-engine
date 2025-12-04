/**
 * Canvas 2D Renderer
 *
 * 使用 Canvas 2D API 渲染,简单易用,适合小型游戏
 */

import { BaseRenderer } from '../core/IRenderer';
import type { Node } from '../core/Node';

type NodeWithAlpha = Node & { alpha?: number };

export class Canvas2DRenderer extends BaseRenderer {
  readonly type = 'canvas2d' as const;

  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;
  }

  async init(): Promise<void> {
    console.log('✓ Canvas2D Renderer initialized');
  }

  beginFrame(clearColor: string = '#1a1a2e'): void {
    super.beginFrame(clearColor);

    // 清屏
    this.ctx.fillStyle = clearColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  renderScene(root: Node): void {
    this.ctx.save();

    // 居中坐标系
    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);

    // 递归渲染
    this.renderNode(root);

    this.ctx.restore();
  }

  protected renderNodeComponents(node: Node, transform: DOMMatrix): void {
    this.ctx.save();

    // 应用变换
    this.ctx.setTransform(transform);

    // 应用透明度
    const nodeWithAlpha = node as NodeWithAlpha;
    if (nodeWithAlpha.alpha !== undefined && nodeWithAlpha.alpha < 1) {
      this.ctx.globalAlpha = nodeWithAlpha.alpha;
    }

    // 渲染所有组件
    for (const component of node.components) {
      if (component.onRender) {
        component.onRender(this.ctx);
        this.stats.drawCalls++;
      }
    }

    this.ctx.restore();
  }

  endFrame(): void {
    super.endFrame();
  }

  destroy(): void {
    // Canvas 2D 没有需要清理的资源
  }
}
