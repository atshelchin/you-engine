/**
 * 资源加载系统
 * 支持图片、精灵图、音频的加载和管理
 */

/** 资源类型 */
export type AssetType = 'image' | 'audio' | 'json';

/** 资源状态 */
export type AssetStatus = 'pending' | 'loading' | 'loaded' | 'error';

/** 精灵帧定义 */
export interface SpriteFrame {
  x: number;
  y: number;
  width: number;
  height: number;
  /** 可选的偏移量（用于精灵的锚点调整） */
  offsetX?: number;
  offsetY?: number;
}

/** 精灵图集定义 */
export interface SpriteSheet {
  image: HTMLImageElement;
  frames: Map<string, SpriteFrame>;
  /** 帧宽度（用于均匀网格） */
  frameWidth?: number;
  /** 帧高度（用于均匀网格） */
  frameHeight?: number;
}

/** 资源项 */
interface AssetEntry {
  type: AssetType;
  url: string;
  status: AssetStatus;
  data: HTMLImageElement | AudioBuffer | object | null;
  error?: Error;
}

/** 加载进度回调 */
export type ProgressCallback = (loaded: number, total: number, current: string) => void;

/**
 * 资源加载器
 * 提供资源预加载、缓存和管理
 */
export class AssetLoader {
  private assets = new Map<string, AssetEntry>();
  private spriteSheets = new Map<string, SpriteSheet>();
  private audioContext: AudioContext | null = null;

  /**
   * 预加载单个图片
   */
  loadImage(key: string, url: string): Promise<HTMLImageElement> {
    const existing = this.assets.get(key);
    if (existing?.status === 'loaded' && existing.data instanceof HTMLImageElement) {
      return Promise.resolve(existing.data);
    }

    return new Promise((resolve, reject) => {
      const entry: AssetEntry = { type: 'image', url, status: 'loading', data: null };
      this.assets.set(key, entry);

      const img = new Image();
      img.onload = () => {
        entry.status = 'loaded';
        entry.data = img;
        resolve(img);
      };
      img.onerror = () => {
        entry.status = 'error';
        entry.error = new Error(`Failed to load image: ${url}`);
        reject(entry.error);
      };
      img.src = url;
    });
  }

  /**
   * 预加载音频
   */
  async loadAudio(key: string, url: string): Promise<AudioBuffer> {
    const existing = this.assets.get(key);
    if (existing?.status === 'loaded' && existing.data instanceof AudioBuffer) {
      return existing.data;
    }

    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    const entry: AssetEntry = { type: 'audio', url, status: 'loading', data: null };
    this.assets.set(key, entry);

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      entry.status = 'loaded';
      entry.data = audioBuffer;
      return audioBuffer;
    } catch (e) {
      entry.status = 'error';
      entry.error = e instanceof Error ? e : new Error(String(e));
      throw entry.error;
    }
  }

  /**
   * 预加载 JSON
   */
  async loadJSON<T = object>(key: string, url: string): Promise<T> {
    const existing = this.assets.get(key);
    if (existing?.status === 'loaded' && existing.data) {
      return existing.data as T;
    }

    const entry: AssetEntry = { type: 'json', url, status: 'loading', data: null };
    this.assets.set(key, entry);

    try {
      const response = await fetch(url);
      const data = await response.json();
      entry.status = 'loaded';
      entry.data = data;
      return data as T;
    } catch (e) {
      entry.status = 'error';
      entry.error = e instanceof Error ? e : new Error(String(e));
      throw entry.error;
    }
  }

  /**
   * 加载精灵图集（均匀网格）
   */
  async loadSpriteSheetGrid(
    key: string,
    url: string,
    frameWidth: number,
    frameHeight: number,
    frameNames?: string[]
  ): Promise<SpriteSheet> {
    const existing = this.spriteSheets.get(key);
    if (existing) return existing;

    const img = await this.loadImage(`${key}_image`, url);
    const frames = new Map<string, SpriteFrame>();

    const cols = Math.floor(img.width / frameWidth);
    const rows = Math.floor(img.height / frameHeight);

    let index = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const name = frameNames?.[index] ?? `${index}`;
        frames.set(name, {
          x: col * frameWidth,
          y: row * frameHeight,
          width: frameWidth,
          height: frameHeight,
        });
        index++;
      }
    }

    const sheet: SpriteSheet = { image: img, frames, frameWidth, frameHeight };
    this.spriteSheets.set(key, sheet);
    return sheet;
  }

  /**
   * 加载精灵图集（JSON 定义）
   * 支持 TexturePacker JSON Hash 格式
   */
  async loadSpriteSheetJSON(key: string, imageUrl: string, jsonUrl: string): Promise<SpriteSheet> {
    const existing = this.spriteSheets.get(key);
    if (existing) return existing;

    const [img, json] = await Promise.all([
      this.loadImage(`${key}_image`, imageUrl),
      this.loadJSON<{
        frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }>;
      }>(`${key}_json`, jsonUrl),
    ]);

    const frames = new Map<string, SpriteFrame>();
    for (const [name, data] of Object.entries(json.frames)) {
      frames.set(name, {
        x: data.frame.x,
        y: data.frame.y,
        width: data.frame.w,
        height: data.frame.h,
      });
    }

    const sheet: SpriteSheet = { image: img, frames };
    this.spriteSheets.set(key, sheet);
    return sheet;
  }

  /**
   * 批量预加载资源 (数组格式)
   */
  async loadAll(
    manifest: Array<{ key: string; url: string; type: AssetType }>,
    onProgress?: ProgressCallback
  ): Promise<void> {
    const total = manifest.length;
    let loaded = 0;

    const promises = manifest.map(async (item) => {
      try {
        switch (item.type) {
          case 'image':
            await this.loadImage(item.key, item.url);
            break;
          case 'audio':
            await this.loadAudio(item.key, item.url);
            break;
          case 'json':
            await this.loadJSON(item.key, item.url);
            break;
        }
      } finally {
        loaded++;
        onProgress?.(loaded, total, item.key);
      }
    });

    await Promise.all(promises);
  }

  /**
   * 批量预加载资源 (对象格式，更简洁)
   * @example
   * await assets.load({
   *   images: { bg: '/bg.png', player: '/player.png' },
   *   audio: { bgm: '/bgm.mp3', jump: '/jump.wav' },
   *   json: { config: '/config.json' }
   * }, (progress) => console.log(`${progress}%`));
   */
  async load(
    resources: {
      images?: Record<string, string>;
      audio?: Record<string, string>;
      json?: Record<string, string>;
    },
    onProgress?: (percentage: number) => void
  ): Promise<void> {
    const manifest: Array<{ key: string; url: string; type: AssetType }> = [];

    // 收集所有资源
    if (resources.images) {
      for (const [key, url] of Object.entries(resources.images)) {
        manifest.push({ key, url, type: 'image' });
      }
    }
    if (resources.audio) {
      for (const [key, url] of Object.entries(resources.audio)) {
        manifest.push({ key, url, type: 'audio' });
      }
    }
    if (resources.json) {
      for (const [key, url] of Object.entries(resources.json)) {
        manifest.push({ key, url, type: 'json' });
      }
    }

    // 批量加载
    await this.loadAll(manifest, (loaded, total) => {
      const percentage = Math.floor((loaded / total) * 100);
      onProgress?.(percentage);
    });
  }

  /**
   * 获取已加载的图片
   */
  getImage(key: string): HTMLImageElement | null {
    const entry = this.assets.get(key);
    if (entry?.status === 'loaded' && entry.data instanceof HTMLImageElement) {
      return entry.data;
    }
    return null;
  }

  /**
   * 获取已加载的音频
   */
  getAudio(key: string): AudioBuffer | null {
    const entry = this.assets.get(key);
    if (entry?.status === 'loaded' && entry.data instanceof AudioBuffer) {
      return entry.data;
    }
    return null;
  }

  /**
   * 获取已加载的 JSON
   */
  getJSON<T = object>(key: string): T | null {
    const entry = this.assets.get(key);
    if (entry?.status === 'loaded' && entry.data && !(entry.data instanceof HTMLImageElement)) {
      return entry.data as T;
    }
    return null;
  }

  /**
   * 获取精灵图集
   */
  getSpriteSheet(key: string): SpriteSheet | null {
    return this.spriteSheets.get(key) ?? null;
  }

  /**
   * 获取精灵帧
   */
  getFrame(
    sheetKey: string,
    frameName: string
  ): { image: HTMLImageElement; frame: SpriteFrame } | null {
    const sheet = this.spriteSheets.get(sheetKey);
    if (!sheet) return null;
    const frame = sheet.frames.get(frameName);
    if (!frame) return null;
    return { image: sheet.image, frame };
  }

  /**
   * 绘制精灵帧到 canvas
   */
  drawFrame(
    ctx: CanvasRenderingContext2D,
    sheetKey: string,
    frameName: string,
    x: number,
    y: number,
    width?: number,
    height?: number
  ): boolean {
    const data = this.getFrame(sheetKey, frameName);
    if (!data) return false;

    const { image, frame } = data;
    const w = width ?? frame.width;
    const h = height ?? frame.height;

    ctx.drawImage(image, frame.x, frame.y, frame.width, frame.height, x - w / 2, y - h / 2, w, h);
    return true;
  }

  /**
   * 绘制图片到 canvas（居中）
   */
  drawImage(
    ctx: CanvasRenderingContext2D,
    key: string,
    x: number,
    y: number,
    width?: number,
    height?: number
  ): boolean {
    const img = this.getImage(key);
    if (!img) return false;

    const w = width ?? img.width;
    const h = height ?? img.height;
    ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
    return true;
  }

  /**
   * 检查资源是否已加载
   */
  isLoaded(key: string): boolean {
    return this.assets.get(key)?.status === 'loaded';
  }

  /**
   * 获取资源状态
   */
  getStatus(key: string): AssetStatus | null {
    return this.assets.get(key)?.status ?? null;
  }

  /**
   * 获取加载进度
   */
  getProgress(): { loaded: number; total: number; percentage: number } {
    let loaded = 0;
    let total = 0;
    for (const entry of this.assets.values()) {
      total++;
      if (entry.status === 'loaded') loaded++;
    }
    return { loaded, total, percentage: total > 0 ? loaded / total : 1 };
  }

  /**
   * 卸载资源
   */
  unload(key: string): void {
    this.assets.delete(key);
    this.spriteSheets.delete(key);
  }

  /**
   * 清空所有资源
   */
  clear(): void {
    this.assets.clear();
    this.spriteSheets.clear();
  }

  /**
   * 获取 AudioContext（用于高级音频操作）
   */
  getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }
}

/** 全局资源加载器实例 */
export const assets = new AssetLoader();
