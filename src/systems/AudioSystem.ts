/**
 * 音频系统
 * 基于 Howler.js 封装，提供简单易用的音频 API
 */

import { Howl, Howler } from 'howler';
import { System } from '../core/System';
import { SystemPhase } from '../core/SystemPhase';

export interface SoundConfig {
  /** 音频源（URL 或 base64） */
  src: string | string[];
  /** 音量 (0-1) */
  volume?: number;
  /** 是否循环 */
  loop?: boolean;
  /** 是否预加载 */
  preload?: boolean;
  /** 音频格式 */
  format?: string[];
  /** 精灵图定义 */
  sprite?: { [key: string]: [number, number] | [number, number, boolean] };
}

export interface SoundInstance {
  /** Howl 实例 */
  howl: Howl;
  /** 配置 */
  config: SoundConfig;
  /** 当前播放 ID */
  currentId?: number;
}

export class AudioSystem extends System {
  static phase = SystemPhase.Update; // 常规执行：音频管理

  /** 音效库 */
  private sounds = new Map<string, SoundInstance>();

  /** 音乐库 */
  private music = new Map<string, SoundInstance>();

  /** 当前播放的音乐 */
  private currentMusic: string | null = null;

  /** 主音量 */
  private _masterVolume = 1;

  /** 音效音量 */
  private _sfxVolume = 1;

  /** 音乐音量 */
  private _musicVolume = 1;

  /** 是否静音 */
  private _muted = false;

  get masterVolume(): number {
    return this._masterVolume;
  }

  set masterVolume(value: number) {
    this._masterVolume = Math.max(0, Math.min(1, value));
    Howler.volume(this._masterVolume);
  }

  get sfxVolume(): number {
    return this._sfxVolume;
  }

  set sfxVolume(value: number) {
    this._sfxVolume = Math.max(0, Math.min(1, value));
    this.updateSoundVolumes();
  }

  get musicVolume(): number {
    return this._musicVolume;
  }

  set musicVolume(value: number) {
    this._musicVolume = Math.max(0, Math.min(1, value));
    this.updateMusicVolumes();
  }

  get muted(): boolean {
    return this._muted;
  }

  set muted(value: boolean) {
    this._muted = value;
    Howler.mute(value);
  }

  onCreate(): void {
    // 处理页面可见性变化（切换标签页时暂停音频）
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseAll();
      } else {
        this.resumeAll();
      }
    });
  }

  onDestroy(): void {
    this.stopAll();
    this.unloadAll();
  }

  /**
   * 加载音效
   */
  loadSound(name: string, config: SoundConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      const howl = new Howl({
        src: Array.isArray(config.src) ? config.src : [config.src],
        volume: (config.volume ?? 1) * this._sfxVolume,
        loop: config.loop ?? false,
        preload: config.preload ?? true,
        format: config.format,
        sprite: config.sprite,
        onload: () => resolve(),
        onloaderror: (_id, error) => reject(error),
      });

      this.sounds.set(name, { howl, config });
    });
  }

  /**
   * 加载音乐
   */
  loadMusic(name: string, config: SoundConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      const howl = new Howl({
        src: Array.isArray(config.src) ? config.src : [config.src],
        volume: (config.volume ?? 1) * this._musicVolume,
        loop: config.loop ?? true,
        preload: config.preload ?? true,
        format: config.format,
        html5: true, // 使用 HTML5 Audio 以支持流式播放
        onload: () => resolve(),
        onloaderror: (_id, error) => reject(error),
      });

      this.music.set(name, { howl, config });
    });
  }

  /**
   * 批量加载
   */
  async loadAll(manifest: {
    sounds?: Record<string, SoundConfig>;
    music?: Record<string, SoundConfig>;
  }): Promise<void> {
    const promises: Promise<void>[] = [];

    if (manifest.sounds) {
      for (const [name, config] of Object.entries(manifest.sounds)) {
        promises.push(this.loadSound(name, config));
      }
    }

    if (manifest.music) {
      for (const [name, config] of Object.entries(manifest.music)) {
        promises.push(this.loadMusic(name, config));
      }
    }

    await Promise.all(promises);
  }

  /**
   * 播放音效
   */
  playSound(
    name: string,
    options: { volume?: number; rate?: number; sprite?: string } = {}
  ): number {
    const sound = this.sounds.get(name);
    if (!sound) {
      console.warn(`Sound not found: ${name}`);
      return -1;
    }

    const id = sound.howl.play(options.sprite);

    if (options.volume !== undefined) {
      sound.howl.volume(options.volume * this._sfxVolume, id);
    }

    if (options.rate !== undefined) {
      sound.howl.rate(options.rate, id);
    }

    return id;
  }

  /**
   * 停止音效
   */
  stopSound(name: string, id?: number): void {
    const sound = this.sounds.get(name);
    if (!sound) return;

    if (id !== undefined) {
      sound.howl.stop(id);
    } else {
      sound.howl.stop();
    }
  }

  /**
   * 播放音乐
   */
  playMusic(name: string, options: { fadeIn?: number; restart?: boolean } = {}): void {
    const music = this.music.get(name);
    if (!music) {
      console.warn(`Music not found: ${name}`);
      return;
    }

    // 如果已经在播放同一首，且不需要重新开始
    if (this.currentMusic === name && !options.restart) {
      if (!music.howl.playing()) {
        music.howl.play();
      }
      return;
    }

    // 停止当前音乐
    if (this.currentMusic && this.currentMusic !== name) {
      const current = this.music.get(this.currentMusic);
      if (current) {
        current.howl.stop();
      }
    }

    this.currentMusic = name;

    // 播放新音乐
    if (options.fadeIn && options.fadeIn > 0) {
      music.howl.volume(0);
      music.howl.play();
      music.howl.fade(0, (music.config.volume ?? 1) * this._musicVolume, options.fadeIn);
    } else {
      music.howl.play();
    }
  }

  /**
   * 停止音乐
   */
  stopMusic(options: { fadeOut?: number } = {}): void {
    if (!this.currentMusic) return;

    const music = this.music.get(this.currentMusic);
    if (!music) return;

    if (options.fadeOut && options.fadeOut > 0) {
      music.howl.fade(music.howl.volume(), 0, options.fadeOut);
      music.howl.once('fade', () => {
        music.howl.stop();
      });
    } else {
      music.howl.stop();
    }

    this.currentMusic = null;
  }

  /**
   * 暂停音乐
   */
  pauseMusic(): void {
    if (!this.currentMusic) return;

    const music = this.music.get(this.currentMusic);
    if (music) {
      music.howl.pause();
    }
  }

  /**
   * 恢复音乐
   */
  resumeMusic(): void {
    if (!this.currentMusic) return;

    const music = this.music.get(this.currentMusic);
    if (music) {
      music.howl.play();
    }
  }

  /**
   * 暂停所有音频
   */
  pauseAll(): void {
    for (const sound of this.sounds.values()) {
      sound.howl.pause();
    }
    for (const music of this.music.values()) {
      music.howl.pause();
    }
  }

  /**
   * 恢复所有音频
   */
  resumeAll(): void {
    for (const sound of this.sounds.values()) {
      // 只恢复之前在播放的
      if (sound.currentId !== undefined) {
        sound.howl.play(sound.currentId);
      }
    }
    // 恢复音乐
    this.resumeMusic();
  }

  /**
   * 停止所有音频
   */
  stopAll(): void {
    for (const sound of this.sounds.values()) {
      sound.howl.stop();
    }
    for (const music of this.music.values()) {
      music.howl.stop();
    }
    this.currentMusic = null;
  }

  /**
   * 卸载所有音频
   */
  unloadAll(): void {
    for (const sound of this.sounds.values()) {
      sound.howl.unload();
    }
    for (const music of this.music.values()) {
      music.howl.unload();
    }
    this.sounds.clear();
    this.music.clear();
    this.currentMusic = null;
  }

  /**
   * 卸载指定音效
   */
  unloadSound(name: string): void {
    const sound = this.sounds.get(name);
    if (sound) {
      sound.howl.unload();
      this.sounds.delete(name);
    }
  }

  /**
   * 卸载指定音乐
   */
  unloadMusic(name: string): void {
    const music = this.music.get(name);
    if (music) {
      music.howl.unload();
      this.music.delete(name);
      if (this.currentMusic === name) {
        this.currentMusic = null;
      }
    }
  }

  /**
   * 检查音效是否已加载
   */
  hasSound(name: string): boolean {
    return this.sounds.has(name);
  }

  /**
   * 检查音乐是否已加载
   */
  hasMusic(name: string): boolean {
    return this.music.has(name);
  }

  /**
   * 检查音乐是否正在播放
   */
  isMusicPlaying(): boolean {
    if (!this.currentMusic) return false;
    const music = this.music.get(this.currentMusic);
    return music?.howl.playing() ?? false;
  }

  /**
   * 获取当前播放的音乐名称
   */
  getCurrentMusic(): string | null {
    return this.currentMusic;
  }

  /**
   * 更新音效音量
   */
  private updateSoundVolumes(): void {
    for (const [, sound] of this.sounds) {
      sound.howl.volume((sound.config.volume ?? 1) * this._sfxVolume);
    }
  }

  /**
   * 更新音乐音量
   */
  private updateMusicVolumes(): void {
    for (const [, music] of this.music) {
      music.howl.volume((music.config.volume ?? 1) * this._musicVolume);
    }
  }

  /**
   * 解锁音频上下文（移动端需要用户交互后才能播放）
   */
  unlock(): Promise<void> {
    return new Promise((resolve) => {
      if (Howler.ctx?.state === 'suspended') {
        const unlock = () => {
          Howler.ctx?.resume().then(() => {
            document.removeEventListener('touchstart', unlock);
            document.removeEventListener('touchend', unlock);
            document.removeEventListener('click', unlock);
            resolve();
          });
        };

        document.addEventListener('touchstart', unlock, { once: true });
        document.addEventListener('touchend', unlock, { once: true });
        document.addEventListener('click', unlock, { once: true });
      } else {
        resolve();
      }
    });
  }
}
