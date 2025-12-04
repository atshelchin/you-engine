# You Engine

A lightweight, pluggable 2D Canvas game framework.

[English](README.md) | [中文](README.zh-CN.md)

## Introduction

You Engine is a modern TypeScript game engine designed for 2D Canvas games. It uses a modular system architecture that allows you to include only the features you need, keeping your project lean.

### Features

- **Lightweight**: Core modules are just a few KB, loaded on demand
- **TypeScript Native**: Complete type support with IntelliSense
- **ECS Architecture**: Lightweight entity-component system based on miniplex
- **Pluggable Systems**: Input, rendering, physics, audio, particles - use what you need
- **Gamepad Support**: Xbox, PlayStation, Switch, and more
- **Physics Engine**: Built-in simple collision and Matter.js integration
- **Animation System**: Easing animations based on tween.js
- **Audio System**: Sound management based on Howler.js
- **Particle System**: Built-in preset effects

## Installation

```bash
pnpm add you-engine
```

## Quick Start

```typescript
import { Engine, InputSystem, RenderSystem, CameraSystem } from 'you-engine';

// Create engine
const engine = new Engine({
  canvas: '#gameCanvas',
  width: 1600,
  height: 900,
  backgroundColor: '#1a1a2e'
});

// Register systems
engine
  .use(InputSystem)
  .use(CameraSystem)
  .use(RenderSystem);

// Create entity
const player = engine.spawn({
  transform: { x: 400, y: 300, rotation: 0, scaleX: 1, scaleY: 1 },
  velocity: { x: 0, y: 0 },
  sprite: { width: 32, height: 32, color: '#4ecdc4', alpha: 1, visible: true },
  collider: { type: 'circle', radius: 16 }
});

// Start game
engine.start();
```

## Core Concepts

### Engine

The engine is the core of your game, managing the game loop, systems, and scenes.

```typescript
const engine = new Engine({
  canvas: HTMLCanvasElement | string,  // Canvas element or selector
  width?: number,           // Design width, default 1600
  height?: number,          // Design height, default 900
  backgroundColor?: string, // Background color, default '#000'
  autoScale?: boolean,      // Auto scale, default true
  targetFPS?: number,       // Target FPS, default 60
  debug?: boolean           // Debug mode, default false
});
```

### Entity

Entities are game objects composed of multiple components.

```typescript
interface GameEntity {
  id?: string;              // Entity ID
  transform?: Transform;    // Transform component
  velocity?: Velocity;      // Velocity component
  sprite?: Sprite;          // Sprite component
  collider?: Collider;      // Collider component
  lifecycle?: Lifecycle;    // Lifecycle component
  tags?: Tags;              // Tags component
  onUpdate?: (dt: number) => void;    // Custom update
  onRender?: (ctx: CanvasRenderingContext2D) => void;  // Custom render
  onDestroy?: () => void;   // Destroy callback
}
```

### Tags

Tags are used for categorizing and querying entities.

```typescript
interface Tags {
  values: string[];  // Tag array
}

// Using helper functions
import { hasTag, addTag } from 'you-engine';

// Create entity with tags
const player = engine.spawn({
  transform: createTransform(100, 100),
  tags: { values: ['player', 'movable'] }
});

// Check for tag
if (hasTag(player, 'player')) {
  // ...
}

// Add tag
addTag(player, 'invincible');

// Query entities by tag
const players = engine.world.entities.filter(
  e => e.tags?.values.includes('player')
);
```

### System

Systems are logic processors that update entities and handle game logic.

```typescript
import { System } from 'you-engine';

class MySystem extends System {
  static priority = 0;  // Priority, lower runs first

  onCreate(): void {
    // System initialization
  }

  onUpdate(dt: number): void {
    // Per-frame update, dt in milliseconds
    for (const entity of this.engine.world.entities) {
      // Process entity
    }
  }

  onRender(ctx: CanvasRenderingContext2D): void {
    // Render
  }
}

// Register system
engine.use(MySystem);
```

### Scene

Scenes organize game levels and states.

```typescript
import { Scene } from 'you-engine';

class GameScene extends Scene {
  onCreate(): void {
    // Called when scene is created (once)
  }

  onEnter(): void {
    // Called when entering scene
    const player = this.spawn({
      transform: createTransform(100, 100),
      sprite: createSprite({ width: 32, height: 32, color: '#fff' })
    });
  }

  onUpdate(dt: number): void {
    // Per-frame update
  }

  onExit(): void {
    // Called when leaving scene
  }
}

// Register scene
engine.addScene('game', GameScene);

// Switch scene
engine.goto('game');
```

## Built-in Systems

### InputSystem

Handles keyboard and gamepad input.

```typescript
import { InputSystem, GamepadButton } from 'you-engine';

engine.use(InputSystem);
const input = engine.system(InputSystem);

// Check actions
if (input.isPressed('jump')) { /* just pressed */ }
if (input.isHeld('fire')) { /* being held */ }
if (input.isReleased('dash')) { /* just released */ }

// Get axis values (-1 to 1)
const moveX = input.axisX();
const moveY = input.axisY();

// Gamepad vibration
input.vibrate(0, { strong: 0.5, weak: 0.3, duration: 200 });

// Get gamepad type and button names
const type = input.getGamepadType(0);  // 'xbox' | 'playstation' | 'switch' | 'generic'
const buttonName = input.getButtonName(GamepadButton.A, 0);
```

### CameraSystem

Camera control with follow, shake, zoom effects.

```typescript
import { CameraSystem } from 'you-engine';

const camera = engine.system(CameraSystem);

camera.setPosition(400, 300);
camera.moveTo(800, 600);
camera.follow(player, { smoothing: 0.1 });
camera.shake({ intensity: 20 });
camera.flash({ color: '#fff', duration: 100 });
camera.zoomTo(1.5);
```

### PhysicsSystem

Simple collision detection and physics simulation.

```typescript
import { PhysicsSystem } from 'you-engine';

const physics = engine.system(PhysicsSystem);

physics.gravity = { x: 0, y: 980 };

physics.onCollision((pair) => {
  console.log('Collision:', pair.a, pair.b);
});

const hit = physics.raycast(startX, startY, dirX, dirY, maxDistance);
```

### AudioSystem

Sound and music management based on Howler.js.

```typescript
import { AudioSystem } from 'you-engine';

const audio = engine.system(AudioSystem);

await audio.loadSound('explosion', { src: '/sounds/explosion.mp3' });
audio.playSound('explosion', { volume: 0.8 });

await audio.loadMusic('bgm', { src: '/music/bgm.mp3' });
audio.playMusic('bgm', { fadeIn: 1000 });
```

### TweenSystem

Animation and easing effects based on tween.js.

```typescript
import { TweenSystem, Easing } from 'you-engine';

const tween = engine.system(TweenSystem);

tween.to(entity.transform, { x: 500, y: 300 }, {
  duration: 1000,
  easing: Easing.QuadOut
});

tween.moveTo(entity.transform, 500, 300, 1000);
tween.fadeIn(entity.sprite, 500);
tween.shake(entity.transform, 10, 500);
```

### ParticleSystem

Particle effects with built-in presets.

```typescript
import { ParticleSystem } from 'you-engine';

const particles = engine.system(ParticleSystem);

const emitter = particles.createEmitter({
  x: 400, y: 300,
  rate: 20,
  life: [500, 1000],
  startColor: ['#ff0', '#f80'],
  endColor: '#f00'
});

// Preset effects
particles.explode(x, y);
particles.fire(x, y);
particles.smoke(x, y);
```

## Math Utilities

### Vec2

```typescript
import { Vec2 } from 'you-engine';

const v1 = new Vec2(10, 20);
v1.add(v2);
v1.normalize();
v1.rotate(Math.PI/4);

Vec2.distance(v1, v2);
Vec2.dot(v1, v2);
Vec2.lerp(v1, v2, 0.5);
```

### MathUtils

```typescript
import { clamp, lerp, smoothstep, randomFloat, randomInt } from 'you-engine';

clamp(value, min, max);
lerp(a, b, t);
randomFloat(0, 100);
randomInt(1, 10);
```

## Events

```typescript
engine.emit('player:death', { playerId: 0 });

const sub = engine.on('player:death', (data) => {
  console.log('Player died:', data.playerId);
});

sub.unsubscribe();
```

## Building

```bash
# Development
pnpm dev

# Build
pnpm build

# Preview
pnpm preview
```

## License

MIT License
