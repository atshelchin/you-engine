/**
 * You Engine v3 - Main Export
 *
 * 全新架构，完全重写，策划文档即代码
 *
 * 特性：
 * ✅ 单一架构 (Node/Component/Signal)
 * ✅ React-like 开发体验
 * ✅ 完全集成等距视角、物理、音频
 * ✅ 对策划师友好
 * ✅ 代码减少 60-80%
 *
 * @example
 * ```typescript
 * import { Node, Engine } from 'you-engine/v3';
 * import { CircleRenderer, IsometricView } from 'you-engine/v3/components';
 *
 * class Player extends Node {
 *   onReady() {
 *     this.addComponent(CircleRenderer, { radius: 12, color: '#4ecdc4' });
 *   }
 * }
 *
 * const engine = new Engine(canvas);
 * const player = engine.root.spawn(Player, { x: 100, y: 100 });
 * engine.start();
 * ```
 */

// ==================== 核心 ====================
export { Node } from './core/Node';
export { Component } from './core/Component';
export { Signal } from './core/Signal';
export { Engine } from './core/Engine'; // Alias for backward compatibility

// Component interface is removed - use Component class directly
export type { IRenderer, RenderStats, RendererType } from './core/IRenderer';

// ==================== 所有组件 ====================
export * from './components/index';

// ==================== 渲染器 ====================
export { Canvas2DRenderer } from './renderers/Canvas2DRenderer';
export { WebGLRenderer } from './renderers/WebGLRenderer';
export { WebGPURenderer } from './renderers/WebGPURenderer';

// ==================== 版本信息 ====================
export const VERSION = '3.0.0';
export const ENGINE_NAME = 'You Engine v3';

console.log(`%c${ENGINE_NAME} v${VERSION}`, 'color: #4ecdc4; font-weight: bold; font-size: 14px;');
console.log('%c策划文档即代码 | Planning Document as Code', 'color: #95e1d3; font-size: 12px;');
