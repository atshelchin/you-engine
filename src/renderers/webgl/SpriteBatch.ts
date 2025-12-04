/**
 * Sprite Batch - WebGL 批量渲染
 *
 * 将多个精灵合并为一次 draw call,大幅提升性能
 */

export class SpriteBatch {
  private gl: WebGLRenderingContext;
  private maxSprites: number;

  // 顶点数据 (每个精灵 4 个顶点,每个顶点 9 个 float)
  // x, y, z, u, v, r, g, b, a
  private vertices: Float32Array;
  private vertexBuffer: WebGLBuffer;

  // 索引数据 (每个精灵 6 个索引)
  private indices: Uint16Array;
  private indexBuffer: WebGLBuffer;

  // Shader
  private program: WebGLProgram;
  private attributes: {
    position: number;
    texCoord: number;
    color: number;
  };
  private uniforms: {
    projection: WebGLUniformLocation | null;
    texture: WebGLUniformLocation | null;
  };

  // 批次状态
  private currentIndex = 0;
  private currentTexture: WebGLTexture | null = null;
  private drawCallCount = 0;

  // 纹理缓存
  private textureCache: Map<HTMLImageElement | HTMLCanvasElement, WebGLTexture> = new Map();

  constructor(gl: WebGLRenderingContext, maxSprites: number = 10000) {
    this.gl = gl;
    this.maxSprites = maxSprites;

    // 分配内存
    this.vertices = new Float32Array(maxSprites * 4 * 9);
    this.indices = new Uint16Array(maxSprites * 6);

    // 创建 buffer
    this.vertexBuffer = gl.createBuffer()!;
    this.indexBuffer = gl.createBuffer()!;

    // 初始化索引 (固定的,不会变)
    this.initIndices();

    // 创建 shader
    this.program = this.createShaderProgram();
    this.attributes = this.getAttributes();
    this.uniforms = this.getUniforms();

    // 设置 buffer
    this.setupBuffers();
  }

  // ==================== 初始化 ====================

  private initIndices(): void {
    for (let i = 0; i < this.maxSprites; i++) {
      const offset = i * 6;
      const vertexOffset = i * 4;

      // 两个三角形组成一个矩形
      this.indices[offset + 0] = vertexOffset + 0;
      this.indices[offset + 1] = vertexOffset + 1;
      this.indices[offset + 2] = vertexOffset + 2;

      this.indices[offset + 3] = vertexOffset + 2;
      this.indices[offset + 4] = vertexOffset + 3;
      this.indices[offset + 5] = vertexOffset + 0;
    }
  }

  private createShaderProgram(): WebGLProgram {
    const gl = this.gl;

    // 顶点着色器
    const vertexShaderSource = `
      attribute vec3 a_position;
      attribute vec2 a_texCoord;
      attribute vec4 a_color;

      uniform mat4 u_projection;

      varying vec2 v_texCoord;
      varying vec4 v_color;

      void main() {
        gl_Position = u_projection * vec4(a_position, 1.0);
        v_texCoord = a_texCoord;
        v_color = a_color;
      }
    `;

    // 片段着色器
    const fragmentShaderSource = `
      precision mediump float;

      uniform sampler2D u_texture;

      varying vec2 v_texCoord;
      varying vec4 v_color;

      void main() {
        gl_FragColor = texture2D(u_texture, v_texCoord) * v_color;
      }
    `;

    // 编译 shader
    const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

    // 链接程序
    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error('Failed to link shader program: ' + gl.getProgramInfoLog(program));
    }

    return program;
  }

  private compileShader(type: number, source: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type)!;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error('Failed to compile shader: ' + gl.getShaderInfoLog(shader));
    }

    return shader;
  }

  private getAttributes() {
    const gl = this.gl;
    return {
      position: gl.getAttribLocation(this.program, 'a_position'),
      texCoord: gl.getAttribLocation(this.program, 'a_texCoord'),
      color: gl.getAttribLocation(this.program, 'a_color'),
    };
  }

  private getUniforms() {
    const gl = this.gl;
    return {
      projection: gl.getUniformLocation(this.program, 'u_projection'),
      texture: gl.getUniformLocation(this.program, 'u_texture'),
    };
  }

  private setupBuffers(): void {
    const gl = this.gl;

    // 上传索引数据 (一次性)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);

    // 预分配顶点数据空间
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices.byteLength, gl.DYNAMIC_DRAW);
  }

  // ==================== 批量渲染 ====================

  begin(projectionMatrix: Float32Array): void {
    const gl = this.gl;

    this.currentIndex = 0;
    this.currentTexture = null;
    this.drawCallCount = 0;

    // 使用 shader
    gl.useProgram(this.program);

    // 设置投影矩阵
    gl.uniformMatrix4fv(this.uniforms.projection, false, projectionMatrix);

    // 启用混合
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // 绑定 buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

    // 设置顶点属性
    const stride = 9 * 4; // 9 floats per vertex

    gl.enableVertexAttribArray(this.attributes.position);
    gl.vertexAttribPointer(this.attributes.position, 3, gl.FLOAT, false, stride, 0);

    gl.enableVertexAttribArray(this.attributes.texCoord);
    gl.vertexAttribPointer(this.attributes.texCoord, 2, gl.FLOAT, false, stride, 3 * 4);

    gl.enableVertexAttribArray(this.attributes.color);
    gl.vertexAttribPointer(this.attributes.color, 4, gl.FLOAT, false, stride, 5 * 4);
  }

  /**
   * 添加一个精灵到批次
   */
  draw(
    texture: HTMLImageElement | HTMLCanvasElement,
    x: number,
    y: number,
    width: number,
    height: number,
    rotation: number = 0,
    color: [number, number, number, number] = [1, 1, 1, 1]
  ): void {
    // 获取或创建纹理
    let glTexture = this.textureCache.get(texture);
    if (!glTexture) {
      glTexture = this.createTexture(texture);
      this.textureCache.set(texture, glTexture);
    }

    // 如果纹理切换或批次满了,先刷新
    if (this.currentTexture !== glTexture || this.currentIndex >= this.maxSprites) {
      this.flush();
      this.currentTexture = glTexture;
    }

    // 计算四个顶点
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const hw = width / 2;
    const hh = height / 2;

    const vertices = [
      { x: -hw, y: -hh, u: 0, v: 0 }, // 左上
      { x: hw, y: -hh, u: 1, v: 0 }, // 右上
      { x: hw, y: hh, u: 1, v: 1 }, // 右下
      { x: -hw, y: hh, u: 0, v: 1 }, // 左下
    ];

    // 写入顶点数据
    const idx = this.currentIndex * 4 * 9;

    for (let i = 0; i < 4; i++) {
      const v = vertices[i];
      const offset = idx + i * 9;

      // 旋转并平移
      const rx = v.x * cos - v.y * sin;
      const ry = v.x * sin + v.y * cos;

      this.vertices[offset + 0] = x + rx; // x
      this.vertices[offset + 1] = y + ry; // y
      this.vertices[offset + 2] = 0; // z
      this.vertices[offset + 3] = v.u; // u
      this.vertices[offset + 4] = v.v; // v
      this.vertices[offset + 5] = color[0]; // r
      this.vertices[offset + 6] = color[1]; // g
      this.vertices[offset + 7] = color[2]; // b
      this.vertices[offset + 8] = color[3]; // a
    }

    this.currentIndex++;
  }

  /**
   * 刷新批次
   */
  flush(): void {
    if (this.currentIndex === 0) return;

    const gl = this.gl;

    // 绑定纹理
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.currentTexture);
    gl.uniform1i(this.uniforms.texture, 0);

    // 上传顶点数据
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertices.subarray(0, this.currentIndex * 4 * 9));

    // 绘制
    gl.drawElements(gl.TRIANGLES, this.currentIndex * 6, gl.UNSIGNED_SHORT, 0);

    this.drawCallCount++;
    this.currentIndex = 0;
  }

  end(): void {
    this.flush();
  }

  // ==================== 纹理管理 ====================

  private createTexture(image: HTMLImageElement | HTMLCanvasElement): WebGLTexture {
    const gl = this.gl;
    const texture = gl.createTexture()!;

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    // 设置纹理参数
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    return texture;
  }

  getDrawCallCount(): number {
    return this.drawCallCount;
  }

  destroy(): void {
    const gl = this.gl;

    gl.deleteBuffer(this.vertexBuffer);
    gl.deleteBuffer(this.indexBuffer);
    gl.deleteProgram(this.program);

    // 删除所有纹理
    for (const texture of this.textureCache.values()) {
      gl.deleteTexture(texture);
    }
    this.textureCache.clear();
  }
}
