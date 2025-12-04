# You Engine

一个轻量级、可插拔的 2D Canvas 游戏框架。

[English](README.md) | [中文](README.zh-CN.md)

## 简介

You Engine 是一个现代化的 TypeScript 游戏引擎，专为 2D Canvas 游戏设计。它采用模块化的系统架构，让你可以只引入需要的功能，保持项目精简。

### 特性

- **轻量级**: 核心模块仅几 KB，按需加载
- **TypeScript 原生**: 完整的类型支持，智能提示
- **ECS 架构**: 基于 miniplex 的轻量级实体组件系统
- **可插拔系统**: 输入、渲染、物理、音频、粒子等系统按需使用
- **手柄支持**: 支持 Xbox、PlayStation、Switch 等多种控制器
- **物理引擎**: 内置简单碰撞和 Matter.js 集成
- **动画系统**: 基于 tween.js 的缓动动画
- **音频系统**: 基于 Howler.js 的音效管理
- **粒子系统**: 内置多种预设特效

## 安装

```bash
pnpm add you-engine
```

## 快速开始

```typescript
import { Engine, InputSystem, RenderSystem, CameraSystem } from 'you-engine';

// 创建引擎
const engine = new Engine({
  canvas: '#gameCanvas',
  width: 1600,
  height: 900,
  backgroundColor: '#1a1a2e'
});

// 注册系统
engine
  .use(InputSystem)
  .use(CameraSystem)
  .use(RenderSystem);

// 创建实体
const player = engine.spawn({
  transform: { x: 400, y: 300, rotation: 0, scaleX: 1, scaleY: 1 },
  velocity: { x: 0, y: 0 },
  sprite: { width: 32, height: 32, color: '#4ecdc4', alpha: 1, visible: true },
  collider: { type: 'circle', radius: 16 }
});

// 启动游戏
engine.start();
```

## 核心概念

### Engine（引擎）

引擎是游戏的核心，负责管理游戏循环、系统和场景。

```typescript
const engine = new Engine({
  canvas: HTMLCanvasElement | string,  // Canvas 元素或选择器
  width?: number,           // 设计宽度，默认 1600
  height?: number,          // 设计高度，默认 900
  backgroundColor?: string, // 背景色，默认 '#000'
  autoScale?: boolean,      // 自动缩放，默认 true
  targetFPS?: number,       // 目标帧率，默认 60
  debug?: boolean           // 调试模式，默认 false
});
```

### Entity（实体）

实体是游戏对象，由多个组件组成。

```typescript
interface GameEntity {
  id?: string;              // 实体 ID
  transform?: Transform;    // 变换组件
  velocity?: Velocity;      // 速度组件
  sprite?: Sprite;          // 精灵组件
  collider?: Collider;      // 碰撞体组件
  lifecycle?: Lifecycle;    // 生命周期组件
  tags?: Tags;              // 标签组件
  onUpdate?: (dt: number) => void;    // 自定义更新
  onRender?: (ctx: CanvasRenderingContext2D) => void;  // 自定义渲染
  onDestroy?: () => void;   // 销毁回调
}
```

### Component（组件）

组件是数据容器，定义实体的属性。

#### Transform（变换）

```typescript
interface Transform {
  x: number;
  y: number;
  rotation: number;   // 弧度
  scaleX: number;
  scaleY: number;
}

// 辅助函数
import { createTransform } from 'you-engine';
const transform = createTransform(100, 200);  // x, y, rotation=0, scaleX=1, scaleY=1
```

#### Velocity（速度）

```typescript
interface Velocity {
  x: number;
  y: number;
  angularVelocity?: number;  // 角速度
  damping?: number;          // 阻尼 (0-1)
}

// 辅助函数
import { createVelocity } from 'you-engine';
const velocity = createVelocity(5, 0);  // x, y
```

#### Sprite（精灵）

```typescript
interface Sprite {
  texture?: string;         // 纹理（暂未实现）
  width: number;
  height: number;
  color?: string;           // 填充颜色
  alpha: number;            // 透明度 (0-1)
  visible: boolean;
  render?: (ctx, entity) => void;  // 自定义渲染
}

// 辅助函数
import { createSprite } from 'you-engine';
const sprite = createSprite({ width: 32, height: 32, color: '#ff0000' });
```

#### Collider（碰撞体）

```typescript
interface Collider {
  type: 'circle' | 'rect';
  radius?: number;          // 圆形半径
  width?: number;           // 矩形宽度
  height?: number;          // 矩形高度
  layer?: number;           // 碰撞层（位掩码）
  mask?: number;            // 碰撞掩码
  isTrigger?: boolean;      // 是否为触发器
  offsetX?: number;         // X 偏移
  offsetY?: number;         // Y 偏移
}

// 辅助函数
import { createCollider } from 'you-engine';
const circleCollider = createCollider('circle', { radius: 16 });
const rectCollider = createCollider('rect', { width: 32, height: 32 });
```

#### Tags（标签）

标签用于对实体进行分类和查询。

```typescript
interface Tags {
  values: string[];  // 标签数组
}

// 使用辅助函数
import { hasTag, addTag } from 'you-engine';

// 创建带标签的实体
const player = engine.spawn({
  transform: createTransform(100, 100),
  tags: { values: ['player', 'movable'] }
});

// 检查标签
if (hasTag(player, 'player')) {
  // ...
}

// 添加标签
addTag(player, 'invincible');

// 按标签查询实体
const players = engine.world.entities.filter(
  e => e.tags?.values.includes('player')
);
```

### System（系统）

系统是逻辑处理器，负责更新实体和处理游戏逻辑。

```typescript
import { System } from 'you-engine';

class MySystem extends System {
  static priority = 0;  // 优先级，越小越先执行

  onCreate(): void {
    // 系统初始化
  }

  onUpdate(dt: number): void {
    // 每帧更新，dt 是毫秒
    for (const entity of this.engine.world.entities) {
      // 处理实体
    }
  }

  onRender(ctx: CanvasRenderingContext2D): void {
    // 渲染
  }

  onDestroy(): void {
    // 系统销毁
  }
}

// 注册系统
engine.use(MySystem);
```

### Scene（场景）

场景用于组织游戏关卡和状态。

```typescript
import { Scene } from 'you-engine';

class GameScene extends Scene {
  onCreate(): void {
    // 场景创建时调用（只调用一次）
  }

  onEnter(): void {
    // 进入场景时调用
    const player = this.spawn({
      transform: createTransform(100, 100),
      sprite: createSprite({ width: 32, height: 32, color: '#fff' })
    });
  }

  onUpdate(dt: number): void {
    // 每帧更新
  }

  onExit(): void {
    // 离开场景时调用
  }
}

// 注册场景
engine.addScene('game', GameScene);

// 切换场景
engine.goto('game');
```

## 内置系统

### InputSystem（输入系统）

处理键盘和手柄输入。

```typescript
import { InputSystem, GamepadButton } from 'you-engine';

engine.use(InputSystem);

// 获取系统实例
const input = engine.system(InputSystem);

// 检查动作
if (input.isPressed('jump')) {
  // 跳跃键刚按下
}

if (input.isHeld('fire')) {
  // 开火键按住中
}

if (input.isReleased('dash')) {
  // 冲刺键刚释放
}

// 获取轴值 (-1 到 1)
const moveX = input.axisX();  // 水平移动
const moveY = input.axisY();  // 垂直移动

// 手柄震动
input.vibrate(0, { strong: 0.5, weak: 0.3, duration: 200 });

// 获取手柄类型
const type = input.getGamepadType(0);  // 'xbox' | 'playstation' | 'switch' | 'generic'

// 获取按钮显示名称
const buttonName = input.getButtonName(GamepadButton.A, 0);  // Xbox: 'A', PS: '✕', Switch: 'B'

// 自定义输入映射
input.setMapping('attack', {
  keyboard: ['KeyJ', 'Space'],
  gamepadButton: [0, 2]
});
```

### RenderSystem（渲染系统）

渲染带有 sprite 组件的实体。

```typescript
import { RenderSystem } from 'you-engine';

engine.use(RenderSystem);

const render = engine.system(RenderSystem);

// 显示碰撞体调试
render.showColliders = true;
render.showDebug = true;

// 静态绘图方法
RenderSystem.drawCircle(ctx, x, y, radius, { fill: '#fff', stroke: '#000' });
RenderSystem.drawRect(ctx, x, y, w, h, { fill: '#fff', centered: true });
RenderSystem.drawLine(ctx, x1, y1, x2, y2, { color: '#fff', lineWidth: 2 });
RenderSystem.drawText(ctx, 'Hello', x, y, { font: '24px Arial', color: '#fff' });
```

### CameraSystem（摄像机系统）

摄像机控制，支持跟随、震屏、缩放等效果。

```typescript
import { CameraSystem } from 'you-engine';

engine.use(CameraSystem);

const camera = engine.system(CameraSystem);

// 设置位置
camera.setPosition(400, 300);

// 平滑移动
camera.moveTo(800, 600);

// 跟随实体
camera.follow(player, { smoothing: 0.1, offsetX: 0, offsetY: -50 });

// 停止跟随
camera.unfollow();

// 震屏效果
camera.shake({ intensity: 20, decay: 0.9 });

// 闪屏效果
camera.flash({ color: '#fff', duration: 100, alpha: 0.8 });

// 缩放
camera.zoomTo(1.5);

// 设置边界
camera.setBounds(0, 0, 3200, 1800);

// 坐标转换
const worldPos = camera.screenToWorld(mouseX, mouseY);
const screenPos = camera.worldToScreen(entity.transform.x, entity.transform.y);

// 检查是否在视口内
if (camera.isInView(x, y, margin)) {
  // 在视口内
}
```

### PhysicsSystem（物理系统）

简单的碰撞检测和物理模拟。

```typescript
import { PhysicsSystem } from 'you-engine';

engine.use(PhysicsSystem);

const physics = engine.system(PhysicsSystem);

// 设置重力
physics.gravity = { x: 0, y: 980 };

// 碰撞检测
physics.onCollision((pair) => {
  console.log('碰撞:', pair.a, pair.b);
  // pair.normalX, pair.normalY - 碰撞法线
  // pair.depth - 穿透深度
});

// 分离碰撞体
physics.separate(pair, 0.5);  // 各分离 50%

// 弹性碰撞响应
physics.bounce(pair, 0.8);  // 弹性系数

// 射线检测
const hit = physics.raycast(startX, startY, dirX, dirY, maxDistance);
if (hit) {
  console.log('击中:', hit.entity, hit.point, hit.distance);
}

// 点检测
if (physics.pointInEntity(mouseX, mouseY, entity)) {
  // 点在实体内
}
```

### MatterPhysicsSystem（Matter.js 物理）

完整的 2D 物理模拟，基于 Matter.js。

```typescript
import { MatterPhysicsSystem } from 'you-engine';

engine.use(MatterPhysicsSystem);

const matter = engine.system(MatterPhysicsSystem);

// 为实体添加物理体
matter.addBody(entity, {
  type: 'dynamic',      // 'dynamic' | 'static' | 'kinematic'
  shape: 'circle',      // 'circle' | 'rect' | 'polygon'
  radius: 20,
  mass: 1,
  friction: 0.1,
  restitution: 0.8,     // 弹性
  fixedRotation: false
});

// 设置重力
matter.gravity = { x: 0, y: 1 };

// 施加力
matter.applyForce(entity, { x: 100, y: 0 });

// 施加冲量
matter.applyImpulse(entity, { x: 50, y: -100 });

// 设置速度
matter.setVelocity(entity, { x: 10, y: 0 });

// 创建约束（连接两个物体）
const constraint = matter.createConstraint(entityA, entityB, {
  stiffness: 0.9,
  damping: 0.1
});

// 碰撞事件
engine.on('matter:collisionStart', ({ a, b }) => {
  console.log('开始碰撞:', a, b);
});

engine.on('matter:collisionEnd', ({ a, b }) => {
  console.log('结束碰撞:', a, b);
});
```

### AudioSystem（音频系统）

音效和背景音乐管理，基于 Howler.js。

```typescript
import { AudioSystem } from 'you-engine';

engine.use(AudioSystem);

const audio = engine.system(AudioSystem);

// 加载音效
await audio.loadSound('explosion', { src: '/sounds/explosion.mp3' });
await audio.loadSound('coin', { src: ['/sounds/coin.mp3', '/sounds/coin.ogg'] });

// 加载音乐
await audio.loadMusic('bgm', { src: '/music/bgm.mp3', loop: true });

// 批量加载
await audio.loadAll({
  sounds: {
    jump: { src: '/sounds/jump.mp3' },
    hit: { src: '/sounds/hit.mp3' }
  },
  music: {
    menu: { src: '/music/menu.mp3' },
    game: { src: '/music/game.mp3' }
  }
});

// 播放音效
audio.playSound('explosion', { volume: 0.8, rate: 1.2 });

// 播放音乐
audio.playMusic('bgm', { fadeIn: 1000 });

// 停止音乐
audio.stopMusic({ fadeOut: 500 });

// 暂停/恢复
audio.pauseMusic();
audio.resumeMusic();

// 音量控制
audio.masterVolume = 0.8;   // 主音量
audio.sfxVolume = 1.0;      // 音效音量
audio.musicVolume = 0.5;    // 音乐音量

// 静音
audio.muted = true;

// 解锁音频（移动端需要用户交互）
await audio.unlock();
```

### TweenSystem（缓动系统）

动画和缓动效果，基于 @tweenjs/tween.js。

```typescript
import { TweenSystem, Easing } from 'you-engine';

engine.use(TweenSystem);

const tween = engine.system(TweenSystem);

// 基本动画
tween.to(entity.transform, { x: 500, y: 300 }, {
  duration: 1000,
  easing: Easing.QuadOut,
  onUpdate: () => console.log('更新中'),
  onComplete: () => console.log('完成')
});

// 便捷方法
tween.moveTo(entity.transform, 500, 300, 1000);
tween.scaleTo(entity.transform, 2, 2, 500);
tween.rotateTo(entity.transform, Math.PI, 800);

// 精灵动画
tween.fadeIn(entity.sprite, 500);
tween.fadeOut(entity.sprite, 500);

// 特效
tween.bounce(entity.transform, 0.2, 300);  // 弹跳
tween.shake(entity.transform, 10, 500);    // 抖动
tween.pulse(entity.transform, 1.2, 300);   // 脉冲

// 链式动画
tween.chain(entity.transform, [
  { target: { x: 100 }, options: { duration: 500 } },
  { target: { y: 200 }, options: { duration: 500 } },
  { target: { x: 0, y: 0 }, options: { duration: 1000, easing: Easing.BounceOut } }
]);

// 延迟执行
await tween.delay(1000);

// 数值动画
tween.animate(0, 100, 1000, (value) => {
  healthBar.width = value;
});

// 可用的缓动函数
// Linear, QuadIn/Out/InOut, CubicIn/Out/InOut, QuartIn/Out/InOut
// QuintIn/Out/InOut, SineIn/Out/InOut, ExpoIn/Out/InOut, CircIn/Out/InOut
// ElasticIn/Out/InOut, BackIn/Out/InOut, BounceIn/Out/InOut
```

### ParticleSystem（粒子系统）

粒子效果，内置多种预设。

```typescript
import { ParticleSystem } from 'you-engine';

engine.use(ParticleSystem);

const particles = engine.system(ParticleSystem);

// 创建发射器
const emitter = particles.createEmitter({
  x: 400,
  y: 300,
  rate: 20,              // 每秒发射数
  maxParticles: 100,
  life: [500, 1000],     // 生命周期（毫秒）
  speed: [50, 150],      // 速度范围
  angle: [0, Math.PI * 2],  // 发射角度范围
  startSize: [5, 10],    // 初始大小
  endSize: [0, 2],       // 结束大小
  startColor: ['#ff0', '#f80'],  // 初始颜色（随机选择）
  endColor: '#f00',      // 结束颜色
  gravity: 200,          // 重力
  drag: 0.1,             // 阻力
  blendMode: 'lighter'   // 混合模式
});

// 更新发射器位置
emitter.config.x = player.transform.x;
emitter.config.y = player.transform.y;

// 停止发射器
particles.stopEmitter(emitter);
particles.stopEmitter(emitter, true);  // 立即清除所有粒子

// 预设特效
particles.explode(x, y);                // 爆炸
particles.smoke(x, y);                  // 烟雾
particles.fire(x, y);                   // 火焰
particles.sparkle(x, y);                // 闪光
particles.trail(x, y);                  // 轨迹

// 自定义预设参数
particles.explode(x, y, {
  burst: 50,
  startColor: ['#00f', '#0ff'],
  gravity: 100
});

// 全局重力
particles.gravity = { x: 0, y: 100 };

// 统计
console.log('粒子数:', particles.getParticleCount());
console.log('发射器数:', particles.getEmitterCount());
```

## 数学工具

### Vec2（2D 向量）

```typescript
import { Vec2 } from 'you-engine';

const v1 = new Vec2(10, 20);
const v2 = Vec2.from({ x: 5, y: 5 });

// 运算
v1.add(v2);           // 加法
v1.sub(v2);           // 减法
v1.scale(2);          // 缩放
v1.normalize();       // 归一化
v1.rotate(Math.PI/4); // 旋转

// 属性
v1.length;            // 长度
v1.lengthSq;          // 长度平方
v1.angle;             // 角度

// 静态方法
Vec2.distance(v1, v2);
Vec2.dot(v1, v2);
Vec2.cross(v1, v2);
Vec2.lerp(v1, v2, 0.5);
Vec2.reflect(v1, normal);
```

### MathUtils（数学工具）

```typescript
import { clamp, lerp, smoothstep, degToRad, radToDeg, randomFloat, randomInt, randomChoice } from 'you-engine';

// 范围限制
clamp(value, min, max);

// 线性插值
lerp(a, b, t);

// 平滑插值
smoothstep(a, b, t);

// 角度转换
degToRad(90);   // 1.5707...
radToDeg(Math.PI);  // 180

// 随机数
randomFloat(0, 100);
randomInt(1, 10);
randomChoice(['a', 'b', 'c']);

// 阻尼
damp(current, target, smoothing, dt);

// 循环
wrap(value, min, max);

// 来回
pingPong(t, length);
```

## 事件系统

```typescript
// 发送事件
engine.emit('player:death', { playerId: 0 });

// 监听事件
const subscription = engine.on('player:death', (data) => {
  console.log('玩家死亡:', data.playerId);
});

// 取消监听
subscription.unsubscribe();

// 一次性监听
engine.once('game:start', () => {
  console.log('游戏开始');
});
```

## 对象池

用于优化频繁创建/销毁的对象。

```typescript
import { ObjectPool } from 'you-engine';

// 创建对象池
const bulletPool = new ObjectPool({
  create: () => ({ x: 0, y: 0, vx: 0, vy: 0, active: false }),
  reset: (bullet) => { bullet.x = 0; bullet.y = 0; },
  initialSize: 100,
  maxSize: 500
});

// 或简单用法
const pool = new ObjectPool(() => ({ value: 0 }));

// 获取对象
const bullet = bulletPool.acquire();
bullet.x = player.x;
bullet.y = player.y;

// 归还对象
bulletPool.release(bullet);

// 统计
console.log('活跃:', bulletPool.activeCount);
console.log('可用:', bulletPool.availableCount);
```

## 完整示例

```typescript
import {
  Engine, Scene,
  InputSystem, RenderSystem, CameraSystem, PhysicsSystem,
  ParticleSystem, AudioSystem, TweenSystem,
  createTransform, createVelocity, createSprite, createCollider,
  Vec2, Easing
} from 'you-engine';

// 创建引擎
const engine = new Engine({
  canvas: '#game',
  width: 1280,
  height: 720,
  backgroundColor: '#1a1a2e'
});

// 注册系统
engine
  .use(InputSystem)
  .use(PhysicsSystem)
  .use(CameraSystem)
  .use(TweenSystem)
  .use(ParticleSystem)
  .use(AudioSystem)
  .use(RenderSystem);

// 定义游戏场景
class GameScene extends Scene {
  player: any;

  async onEnter() {
    const audio = this.getSystem(AudioSystem);
    await audio.loadAll({
      sounds: { jump: { src: '/sounds/jump.mp3' } }
    });

    // 创建玩家
    this.player = this.spawn({
      transform: createTransform(640, 360),
      velocity: createVelocity(),
      sprite: createSprite({ width: 48, height: 48, color: '#4ecdc4' }),
      collider: createCollider('circle', { radius: 24 })
    });

    // 摄像机跟随
    const camera = this.getSystem(CameraSystem);
    camera.follow(this.player, { smoothing: 0.08 });
  }

  onUpdate(dt: number) {
    const input = this.getSystem(InputSystem);
    const { transform, velocity } = this.player;

    // 移动
    velocity.x = input.axisX() * 300;
    velocity.y = input.axisY() * 300;

    // 跳跃/动作
    if (input.isPressed('jump')) {
      const audio = this.getSystem(AudioSystem);
      audio.playSound('jump');

      const particles = this.getSystem(ParticleSystem);
      particles.explode(transform.x, transform.y + 24);
    }
  }
}

// 注册并启动
engine.addScene('game', GameScene);
engine.start('game');
```

## 构建

```bash
# 开发
pnpm dev

# 构建
pnpm build

# 预览
pnpm preview
```

## 许可证

MIT License
