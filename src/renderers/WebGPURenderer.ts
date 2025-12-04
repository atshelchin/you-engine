/**
 * WebGPU Renderer
 *
 * 使用最新的 WebGPU API,性能最强,但浏览器支持有限
 * 适合未来的高性能游戏
 */

import { BaseRenderer } from '../core/IRenderer';
import type { Node } from '../core/Node';
import { CircleRenderer, SpriteRenderer } from '../components/Renderer';

type NodeWithAlpha = Node & { alpha?: number };

export class WebGPURenderer extends BaseRenderer {
  readonly type = 'webgpu' as const;

  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private format!: GPUTextureFormat;

  // Pipeline
  private pipeline!: GPURenderPipeline;
  private bindGroupLayout!: GPUBindGroupLayout;

  // Buffers
  private vertexBuffer!: GPUBuffer;
  private indexBuffer!: GPUBuffer;
  private uniformBuffer!: GPUBuffer;

  // 批次数据
  private maxSprites = 10000;
  private vertices: Float32Array;
  private indices: Uint16Array;
  private currentIndex = 0;

  // 纹理缓存
  private textureCache: Map<HTMLImageElement | HTMLCanvasElement, GPUTexture> = new Map();
  private currentTexture: GPUTexture | null = null;

  // 白色圆形纹理 (用于所有圆形的批量渲染)
  private whiteCircleTexture: HTMLCanvasElement | null = null;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);

    this.vertices = new Float32Array(this.maxSprites * 4 * 9); // x,y,z,u,v,r,g,b,a
    this.indices = new Uint16Array(this.maxSprites * 6);

    this.initIndices();
  }

  async init(): Promise<void> {
    // 检查 WebGPU 支持
    if (!navigator.gpu) {
      throw new Error('WebGPU not supported in this browser');
    }

    // 获取 adapter 和 device
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      throw new Error('Failed to get WebGPU adapter');
    }

    this.device = await adapter.requestDevice();

    // 配置 canvas context
    this.context = this.canvas.getContext('webgpu') as GPUCanvasContext;
    this.format = navigator.gpu.getPreferredCanvasFormat();

    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: 'premultiplied',
    });

    // 创建 pipeline 和 buffers
    await this.createPipeline();
    this.createBuffers();

    console.log('✓ WebGPU Renderer initialized');
  }

  private initIndices(): void {
    for (let i = 0; i < this.maxSprites; i++) {
      const offset = i * 6;
      const vertexOffset = i * 4;

      this.indices[offset + 0] = vertexOffset + 0;
      this.indices[offset + 1] = vertexOffset + 1;
      this.indices[offset + 2] = vertexOffset + 2;

      this.indices[offset + 3] = vertexOffset + 2;
      this.indices[offset + 4] = vertexOffset + 3;
      this.indices[offset + 5] = vertexOffset + 0;
    }
  }

  private async createPipeline(): Promise<void> {
    // Shader 代码
    const shaderCode = `
      struct Uniforms {
        projection: mat4x4<f32>,
      };

      @group(0) @binding(0) var<uniform> uniforms: Uniforms;
      @group(0) @binding(1) var textureSampler: sampler;
      @group(0) @binding(2) var texture: texture_2d<f32>;

      struct VertexInput {
        @location(0) position: vec3<f32>,
        @location(1) texCoord: vec2<f32>,
        @location(2) color: vec4<f32>,
      };

      struct VertexOutput {
        @builtin(position) position: vec4<f32>,
        @location(0) texCoord: vec2<f32>,
        @location(1) color: vec4<f32>,
      };

      @vertex
      fn vertexMain(input: VertexInput) -> VertexOutput {
        var output: VertexOutput;
        output.position = uniforms.projection * vec4<f32>(input.position, 1.0);
        output.texCoord = input.texCoord;
        output.color = input.color;
        return output;
      }

      @fragment
      fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
        return textureSample(texture, textureSampler, input.texCoord) * input.color;
      }
    `;

    const shaderModule = this.device.createShaderModule({
      code: shaderCode,
    });

    // 创建 bind group layout
    this.bindGroupLayout = this.device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: 'uniform' },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: {},
        },
        {
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {},
        },
      ],
    });

    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts: [this.bindGroupLayout],
    });

    // 创建 render pipeline
    this.pipeline = this.device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vertexMain',
        buffers: [
          {
            arrayStride: 9 * 4, // 9 floats per vertex
            attributes: [
              { shaderLocation: 0, offset: 0, format: 'float32x3' }, // position
              { shaderLocation: 1, offset: 3 * 4, format: 'float32x2' }, // texCoord
              { shaderLocation: 2, offset: 5 * 4, format: 'float32x4' }, // color
            ],
          },
        ],
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fragmentMain',
        targets: [
          {
            format: this.format,
            blend: {
              color: {
                srcFactor: 'src-alpha',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add',
              },
              alpha: {
                srcFactor: 'one',
                dstFactor: 'one-minus-src-alpha',
                operation: 'add',
              },
            },
          },
        ],
      },
      primitive: {
        topology: 'triangle-list',
      },
    });
  }

  private createBuffers(): void {
    // 顶点 buffer
    this.vertexBuffer = this.device.createBuffer({
      size: this.vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    // 索引 buffer
    this.indexBuffer = this.device.createBuffer({
      size: this.indices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });

    // 写入索引 (固定的)
    this.device.queue.writeBuffer(this.indexBuffer, 0, this.indices);

    // Uniform buffer (投影矩阵)
    this.uniformBuffer = this.device.createBuffer({
      size: 64, // mat4x4
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.updateProjectionMatrix();
  }

  beginFrame(clearColor: string = '#1a1a2e'): void {
    super.beginFrame(clearColor);

    this.currentIndex = 0;
    this.currentTexture = null;
  }

  renderScene(root: Node): void {
    this.renderNode(root);

    // 刷新剩余批次
    this.flush();
  }

  protected renderNodeComponents(node: Node, transform: DOMMatrix): void {
    const x = transform.m41;
    const y = transform.m42;
    const rotation = Math.atan2(transform.m12, transform.m11);
    const scaleX = Math.sqrt(transform.m11 * transform.m11 + transform.m12 * transform.m12);

    const alpha = (node as NodeWithAlpha).alpha ?? 1.0;

    for (const component of node.components) {
      if (component instanceof SpriteRenderer) {
        this.drawSprite(
          component.image,
          x,
          y,
          component.width * scaleX,
          component.height * scaleX,
          rotation,
          alpha * component.opacity,
          [1, 1, 1, 1]
        );
      } else if (component instanceof CircleRenderer) {
        // 使用白色纹理 + 颜色调制 (所有圆形可批量渲染)
        const texture = this.getWhiteCircleTexture();
        const color = this.parseColorToRGBA(component.color);
        this.drawSprite(
          texture,
          x,
          y,
          component.radius * 2 * scaleX,
          component.radius * 2 * scaleX,
          rotation,
          alpha,
          color
        );
      }
    }
  }

  private drawSprite(
    image: HTMLImageElement | HTMLCanvasElement,
    x: number,
    y: number,
    width: number,
    height: number,
    rotation: number,
    alpha: number,
    color: [number, number, number, number] = [1, 1, 1, 1]
  ): void {
    // 获取或创建纹理
    let texture = this.textureCache.get(image);
    if (!texture) {
      texture = this.createTexture(image);
      this.textureCache.set(image, texture);
    }

    // 纹理切换或批次满了
    if (this.currentTexture !== texture || this.currentIndex >= this.maxSprites) {
      this.flush();
      this.currentTexture = texture;
    }

    // 添加顶点 - 使用颜色调制
    this.addQuad(x, y, width, height, rotation, [color[0], color[1], color[2], alpha * color[3]]);
    this.currentIndex++;
  }

  private addQuad(
    x: number,
    y: number,
    width: number,
    height: number,
    rotation: number,
    color: [number, number, number, number]
  ): void {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const hw = width / 2;
    const hh = height / 2;

    const vertices = [
      { x: -hw, y: -hh, u: 0, v: 0 },
      { x: hw, y: -hh, u: 1, v: 0 },
      { x: hw, y: hh, u: 1, v: 1 },
      { x: -hw, y: hh, u: 0, v: 1 },
    ];

    const idx = this.currentIndex * 4 * 9;

    for (let i = 0; i < 4; i++) {
      const v = vertices[i];
      const offset = idx + i * 9;

      const rx = v.x * cos - v.y * sin;
      const ry = v.x * sin + v.y * cos;

      this.vertices[offset + 0] = x + rx;
      this.vertices[offset + 1] = y + ry;
      this.vertices[offset + 2] = 0;
      this.vertices[offset + 3] = v.u;
      this.vertices[offset + 4] = v.v;
      this.vertices[offset + 5] = color[0];
      this.vertices[offset + 6] = color[1];
      this.vertices[offset + 7] = color[2];
      this.vertices[offset + 8] = color[3];
    }
  }

  private flush(): void {
    if (this.currentIndex === 0 || !this.currentTexture) return;

    // 创建 command encoder
    const commandEncoder = this.device.createCommandEncoder();

    // 创建 render pass
    const textureView = this.context.getCurrentTexture().createView();
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          loadOp: 'load',
          storeOp: 'store',
        },
      ],
    });

    // 上传顶点数据
    this.device.queue.writeBuffer(
      this.vertexBuffer,
      0,
      this.vertices,
      0,
      this.currentIndex * 4 * 9 * 4
    );

    // 创建 bind group
    const sampler = this.device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
    });

    const bindGroup = this.device.createBindGroup({
      layout: this.bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuffer } },
        { binding: 1, resource: sampler },
        { binding: 2, resource: this.currentTexture.createView() },
      ],
    });

    // 绘制
    renderPass.setPipeline(this.pipeline);
    renderPass.setBindGroup(0, bindGroup);
    renderPass.setVertexBuffer(0, this.vertexBuffer);
    renderPass.setIndexBuffer(this.indexBuffer, 'uint16');
    renderPass.drawIndexed(this.currentIndex * 6);
    renderPass.end();

    // 提交
    this.device.queue.submit([commandEncoder.finish()]);

    this.stats.drawCalls++;
    this.currentIndex = 0;
  }

  endFrame(): void {
    super.endFrame();
  }

  private updateProjectionMatrix(): void {
    const w = this.canvas.width;
    const h = this.canvas.height;

    const left = -w / 2;
    const right = w / 2;
    const bottom = h / 2;
    const top = -h / 2;

    const matrix = new Float32Array(16);
    matrix[0] = 2 / (right - left);
    matrix[5] = 2 / (top - bottom);
    matrix[10] = -1;
    matrix[12] = -(right + left) / (right - left);
    matrix[13] = -(top + bottom) / (top - bottom);
    matrix[15] = 1;

    this.device.queue.writeBuffer(this.uniformBuffer, 0, matrix);
  }

  private createTexture(image: HTMLImageElement | HTMLCanvasElement): GPUTexture {
    if (!this.device) {
      throw new Error('WebGPU device not initialized. Call init() first.');
    }

    const texture = this.device.createTexture({
      size: [image.width, image.height],
      format: 'rgba8unorm',
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });

    this.device.queue.copyExternalImageToTexture({ source: image }, { texture }, [
      image.width,
      image.height,
    ]);

    return texture;
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

  resize(width: number, height: number): void {
    super.resize(width, height);
    this.updateProjectionMatrix();
  }

  destroy(): void {
    this.vertexBuffer?.destroy();
    this.indexBuffer?.destroy();
    this.uniformBuffer?.destroy();

    for (const texture of this.textureCache.values()) {
      texture.destroy();
    }
    this.textureCache.clear();
    this.whiteCircleTexture = null;
  }
}
