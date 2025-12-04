# You Engine v3

**A zero-dependency, lightweight 2D/2.5D game engine with multi-renderer support (Canvas2D/WebGL/WebGPU).**

[English](README.md) | [中文](README.zh-CN.md)

## Introduction

You Engine v3 is a complete rewrite featuring a React-like component system, multi-renderer architecture, and comprehensive game development tools. It supports traditional 2D, isometric 2.5D, and high-performance GPU rendering.

**⚡ Zero Dependencies**: Built entirely from scratch with no external runtime dependencies.

### Features

- **Zero Dependencies**: Pure TypeScript, no external libraries required
- **Multi-Renderer Architecture**: Choose between Canvas2D, WebGL, or WebGPU with runtime switching
- **Node/Component/Signal System**: React-like component architecture
- **TypeScript Native**: Complete type support with IntelliSense
- **9 Major Component Categories**: Rendering, Physics, Isometric, Camera, Particles, Animation, Input, Audio
- **Batch Rendering**: Optimized WebGL/WebGPU with 2-5x performance improvement
- **Gamepad Support**: Xbox, PlayStation, Switch, Steam Deck controllers with automatic detection
- **Built-in Physics**: Custom physics engine with circle/rect/polygon collision detection
- **Isometric System**: Built-in 2.5D isometric rendering
- **Particle System**: GPU-accelerated particle effects
- **Audio System**: Web Audio API with 3D spatial sound
- **Lightweight**: ~85KB minified bundle size

## Installation

```bash
npm install you-engine
# or
pnpm add you-engine
# or
yarn add you-engine
```

## Quick Start

```typescript
import { Engine, WebGLRenderer, Node, CircleRenderer } from 'you-engine';

// Create engine with WebGL renderer
const canvas = document.getElementById('game') as HTMLCanvasElement;
const engine = new Engine({
  canvas,
  renderer: new WebGLRenderer(canvas),
  width: 1280,
  height: 720,
  backgroundColor: '#1a1a2e'
});

// Create a player node
class Player extends Node {
  onInit() {
    this.addComponent(CircleRenderer, {
      radius: 20,
      color: '#4ecdc4'
    });
  }

  onUpdate(dt: number) {
    this.rotation += 180 * dt * (Math.PI / 180);
  }
}

// Add to scene
const player = engine.root.add(new Player());
player.x = 400;
player.y = 300;

// Start engine
await engine.init();
engine.start();
```

## Core Concepts

### Node System

Nodes are the fundamental building blocks - they form a scene graph hierarchy:

```typescript
class MyNode extends Node {
  onInit() {
    // Called once when node is initialized
  }

  onUpdate(dt: number) {
    // Called every frame
  }

  onDestroy() {
    // Called when node is removed
  }
}

// Scene graph hierarchy
const parent = new Node();
const child = new Node();
parent.add(child);

// Query nodes
const enemy = parent.find('enemy');
```

### Component System

Components add functionality to nodes using the addComponent method:

```typescript
import { Component, Node, CircleRenderer } from 'you-engine';

class MyComponent extends Component {
  onInit() {
    // Component initialization
  }

  onUpdate(dt: number) {
    // Per-frame update
    console.log(this.node.x, this.node.y);
  }
}

// Add components to nodes (supports constructor parameters)
const node = new Node();
node.addComponent(CircleRenderer, { radius: 10, color: '#f00' });
node.addComponent(MyComponent);
```

### Signal System

Type-safe event system:

```typescript
import { Signal } from 'you-engine';

const onHit = new Signal<{ damage: number }>();

// Subscribe
onHit.on((data) => {
  console.log('Hit! Damage:', data.damage);
});

// Emit
onHit.emit({ damage: 25 });
```

## Multi-Renderer Architecture

### Available Renderers

```typescript
import {
  Canvas2DRenderer,  // Traditional 2D rendering
  WebGLRenderer,     // GPU batch rendering (2-5x faster)
  WebGPURenderer     // Next-gen GPU (Chrome 113+)
} from 'you-engine';
```

### Performance Comparison

| Sprite Count | Canvas 2D | WebGL | WebGPU |
|-------------|-----------|-------|---------|
| 100         | 60 FPS    | 60 FPS | 60 FPS |
| 1000        | 30 FPS    | 60 FPS | 60 FPS |
| 5000        | 12 FPS    | 58 FPS | 60 FPS |

### Runtime Switching

```typescript
// Switch renderer at runtime
const newRenderer = new WebGLRenderer(canvas);
await engine.switchRenderer(newRenderer);
```

### Renderer Selection Guide

- **Canvas2D**: <500 nodes, 100% compatibility, simple rendering
- **WebGL**: 500-10000 nodes, 95%+ compatibility, **recommended**
- **WebGPU**: 10000+ nodes, Chrome 113+, maximum performance

## Component Categories

### 1. Rendering Components

```typescript
import {
  CircleRenderer,
  RectRenderer,
  SpriteRenderer,
  AnimatedSprite,
  TextRenderer,
  MaskedSprite
} from 'you-engine';

// Animated sprite
node.addComponent(AnimatedSprite, {
  spriteSheet: image,
  frameWidth: 64,
  frameHeight: 64,
  animations: {
    walk: { frames: [0, 1, 2, 3], fps: 10, loop: true }
  }
});
```

### 2. Physics Components (Zero Dependencies)

Built-in physics engine with no external dependencies:

```typescript
import { PhysicsBody, PhysicsWorld } from 'you-engine';

// Add physics world to root
root.addComponent(PhysicsWorld, {
  gravity: { x: 0, y: 9.8 }
});

// Add physics body
node.addComponent(PhysicsBody, {
  shape: 'circle',
  radius: 20,
  mass: 1,
  friction: 0.1,
  restitution: 0.5
});

// Apply forces
const body = node.getComponent(PhysicsBody);
body.applyForce(100, 0);
body.applyImpulse(50, -50);

// Check collision
if (body1.checkCollision(body2)) {
  body1.resolveCollision(body2);
}
```

Supported collision shapes:
- Circle vs Circle
- Rectangle vs Rectangle
- Circle vs Rectangle

### 3. Isometric Components

```typescript
import { IsometricView, IsometricRenderer, IsometricTile } from 'you-engine';

node.addComponent(IsometricView, {
  tileWidth: 64,
  tileHeight: 32,
  ratio: 2
});

node.addComponent(IsometricTile, {
  color: '#4ecdc4',
  stroke: '#2c3e50',
  strokeWidth: 2
});
```

### 4. Camera Components

```typescript
import { Camera } from 'you-engine';

node.addComponent(Camera, {
  target: player,
  smoothness: 0.1,
  bounds: { minX: 0, maxX: 1000, minY: 0, maxY: 1000 }
});
```

### 5. Particle Components

```typescript
import { ParticleEmitter, ParticlePresets } from 'you-engine';

node.addComponent(ParticleEmitter, ParticlePresets.Fire);

// Or custom config
node.addComponent(ParticleEmitter, {
  maxParticles: 500,
  emissionRate: 20,
  lifetime: [0.5, 1.0],
  velocity: [100, 200],
  size: [5, 10],
  color: ['#ff0000', '#ff6600']
});
```

### 6. Animation Components

```typescript
import { Tween, Animate, Easing } from 'you-engine';

// Simple tween
node.addComponent(Tween, {
  to: { x: 500, y: 300 },
  duration: 1.0,
  easing: Easing.cubicOut
});

// Helper functions
Animate.moveTo(node, 500, 300, 1.0, Easing.quadInOut);
Animate.fadeIn(node, 0.5);
Animate.scaleTo(node, 2.0, 1.0);
Animate.rotateTo(node, Math.PI, 1.5);
Animate.bounce(node, 50, 1.0);
Animate.shake(node, 10, 0.5);
```

### 7. Input Components

Full gamepad support with automatic controller type detection:

```typescript
import { InputManager, Keys, GamepadButtons } from 'you-engine';

// Keyboard
if (Input.isKeyDown(Keys.W)) { }
if (Input.isKeyPressed(Keys.Space)) { }

// Mouse
const { x, y } = Input.getMousePosition();
if (Input.isMouseDown(0)) { }

// Gamepad (Xbox, PlayStation, Switch, Steam Deck)
const padType = Input.getGamepadType(0); // 'xbox' | 'playstation' | 'switch' | 'steamdeck' | 'generic'
const buttonName = Input.getButtonName(GamepadButtons.A, 0); // Platform-specific name

if (Input.isGamepadButtonDown(0, GamepadButtons.A)) { }
const axisX = Input.getGamepadAxis(0, 0);

// Vibration
Input.vibrate(0, { weak: 0.5, strong: 1.0, duration: 200 });
```

### 8. Audio Components

```typescript
import { AudioManager } from 'you-engine';

await AudioManager.load('explosion', '/sounds/explosion.mp3');
AudioManager.playSound('explosion', { volume: 0.8 });

await AudioManager.load('bgm', '/music/bgm.mp3');
AudioManager.playMusic('bgm', { loop: true, fadeIn: 1.0 });

// 3D spatial sound
AudioManager.play3DSound('footstep', x, y, listenerX, listenerY, maxDistance);

// Volume control
AudioManager.setMasterVolume(0.8);
AudioManager.setMusicVolume(0.6);
AudioManager.setSfxVolume(1.0);
```

## Examples

### Multi-Renderer Performance Test

```typescript
import { Engine, Canvas2DRenderer, WebGLRenderer, WebGPURenderer, Node, CircleRenderer } from 'you-engine';

class MovingCircle extends Node {
  vx = Math.random() * 200 - 100;
  vy = Math.random() * 200 - 100;

  onInit() {
    this.addComponent(CircleRenderer, {
      radius: Math.random() * 20 + 10,
      color: `hsl(${Math.random() * 360}, 70%, 60%)`
    });
  }

  onUpdate(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.x < 0 || this.x > 1280) this.vx *= -1;
    if (this.y < 0 || this.y > 720) this.vy *= -1;
  }
}

const canvas = document.getElementById('game') as HTMLCanvasElement;
const engine = new Engine({
  canvas,
  renderer: new WebGLRenderer(canvas),
  width: 1280,
  height: 720
});

// Spawn 100 circles
for (let i = 0; i < 100; i++) {
  const circle = engine.root.add(new MovingCircle());
  circle.x = Math.random() * 1280;
  circle.y = Math.random() * 720;
}

await engine.init();
engine.start();

// Runtime renderer switching
document.getElementById('webgl-btn').onclick = async () => {
  await engine.switchRenderer(new WebGLRenderer(canvas));
};
```

## Performance Tips

### WebGL Optimization

1. **Shared textures**: All circles share one white texture with color modulation (30x performance boost)
2. **Batch rendering**: Minimize texture switches to reduce draw calls
3. **Node limits**: Keep scene graph under 10000 nodes for best performance

### Performance Monitoring

```typescript
const stats = engine.getStats();
console.log('FPS:', stats.fps);
console.log('Draw Calls:', stats.drawCalls);
console.log('Render Time:', stats.renderTime);
```

## Project Structure

```
you-engine/
├── src/
│   ├── core/              # Core engine (Node, Component, Signal, Engine)
│   ├── components/        # All component categories
│   │   ├── Renderer.ts    # Rendering components
│   │   ├── Physics.ts     # Built-in physics engine
│   │   ├── Isometric.ts   # Isometric rendering
│   │   ├── Camera.ts      # Camera system
│   │   ├── Particles.ts   # Particle system
│   │   ├── Animation.ts   # Animation system
│   │   ├── Input.ts       # Input handling
│   │   └── Audio.ts       # Audio system
│   ├── renderers/         # Canvas2D, WebGL, WebGPU renderers
│   └── index.ts           # Main export
├── dist/                  # Built files
├── README.md
└── package.json
```

## Building

```bash
# Install dependencies
pnpm install

# Development
pnpm dev

# Build
pnpm build

# Type checking
tsc --noEmit
```

## Browser Support

- **Canvas2D**: All modern browsers
- **WebGL**: Chrome 9+, Firefox 4+, Safari 5.1+, Edge 12+
- **WebGPU**: Chrome 113+, Edge 113+

## Migration from v2

v3 is a complete rewrite with **zero external dependencies**. Key changes:

- **Dependencies**: Removed miniplex, @tweenjs/tween.js, howler, matter-js
- **Physics**: Built-in physics engine (no Matter.js)
- **Architecture**: ECS → Node/Component architecture
- **System classes** → Component classes
- **World** → Scene graph (root Node)
- **Multi-renderer** support
- **Performance**: WebGL batch rendering (2-5x improvement)
- **addComponent**: Now supports constructor parameters

## Why Zero Dependencies?

1. **Smaller bundle size**: ~85KB minified
2. **Faster install**: No dependency resolution
3. **Security**: No supply chain vulnerabilities
4. **Control**: Full control over all features
5. **Performance**: Optimized for game development use cases

## Documentation

- [API Reference](https://you-engine.dev/api) (coming soon)
- [Examples](./examples/)
- [Boomerang Game Guide](../BOOMERANG_GAME_TWO_VERSIONS.md)

## License

MIT License

---

**You Engine v3** - Zero Dependencies, Maximum Performance 🚀
