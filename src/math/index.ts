/**
 * 数学工具
 */

// 常量
export const PI = Math.PI;
export const TAU = Math.PI * 2;
export const RAD_TO_DEG = 180 / Math.PI;
export const DEG_TO_RAD = Math.PI / 180;

// 基础数学
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function inverseLerp(a: number, b: number, value: number): number {
  return a === b ? 0 : (value - a) / (b - a);
}

export function map(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return lerp(outMin, outMax, inverseLerp(inMin, inMax, value));
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function damp(current: number, target: number, smoothing: number, dt: number): number {
  return lerp(current, target, 1 - Math.exp(-smoothing * dt));
}

export function moveTowards(current: number, target: number, maxDelta: number): number {
  const diff = target - current;
  return Math.abs(diff) <= maxDelta ? target : current + Math.sign(diff) * maxDelta;
}

// 角度
export function degToRad(degrees: number): number {
  return degrees * DEG_TO_RAD;
}

export function radToDeg(radians: number): number {
  return radians * RAD_TO_DEG;
}

export function normalizeAngle(angle: number): number {
  while (angle > PI) angle -= TAU;
  while (angle < -PI) angle += TAU;
  return angle;
}

export function angleDiff(from: number, to: number): number {
  return normalizeAngle(to - from);
}

export function lerpAngle(from: number, to: number, t: number): number {
  return from + angleDiff(from, to) * t;
}

// 随机
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function randomBool(probability = 0.5): boolean {
  return Math.random() < probability;
}

export function randomSign(): number {
  return Math.random() < 0.5 ? -1 : 1;
}

export function randomAngle(): number {
  return Math.random() * TAU;
}

// 工具
export function approxEqual(a: number, b: number, epsilon = 0.0001): boolean {
  return Math.abs(a - b) < epsilon;
}

export function wrap(value: number, min: number, max: number): number {
  const range = max - min;
  return ((((value - min) % range) + range) % range) + min;
}

export function pingPong(t: number, length: number): number {
  t = wrap(t, 0, length * 2);
  return length - Math.abs(t - length);
}

export function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

// Vec2 类
export class Vec2 {
  constructor(
    public x = 0,
    public y = 0
  ) {}

  static zero(): Vec2 {
    return new Vec2(0, 0);
  }
  static one(): Vec2 {
    return new Vec2(1, 1);
  }
  static fromAngle(angle: number): Vec2 {
    return new Vec2(Math.cos(angle), Math.sin(angle));
  }

  static distance(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1,
      dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  static distanceSq(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1,
      dy = y2 - y1;
    return dx * dx + dy * dy;
  }

  static dot(x1: number, y1: number, x2: number, y2: number): number {
    return x1 * x2 + y1 * y2;
  }
  dot(v: Vec2): number {
    return Vec2.dot(this.x, this.y, v.x, v.y);
  }

  static cross(x1: number, y1: number, x2: number, y2: number): number {
    return x1 * y2 - y1 * x2;
  }
  cross(v: Vec2): number {
    return Vec2.cross(this.x, this.y, v.x, v.y);
  }

  clone(): Vec2 {
    return new Vec2(this.x, this.y);
  }
  set(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }
  copy(v: Vec2): this {
    this.x = v.x;
    this.y = v.y;
    return this;
  }

  add(v: Vec2): this {
    this.x += v.x;
    this.y += v.y;
    return this;
  }
  addXY(x: number, y: number): this {
    this.x += x;
    this.y += y;
    return this;
  }
  sub(v: Vec2): this {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }
  scale(s: number): this {
    this.x *= s;
    this.y *= s;
    return this;
  }
  negate(): this {
    this.x = -this.x;
    this.y = -this.y;
    return this;
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
  lengthSq(): number {
    return this.x * this.x + this.y * this.y;
  }

  normalize(): this {
    const len = this.length();
    if (len > 0) {
      this.x /= len;
      this.y /= len;
    }
    return this;
  }

  setLength(len: number): this {
    return this.normalize().scale(len);
  }

  clampLength(max: number): this {
    const len = this.length();
    if (len > max) this.scale(max / len);
    return this;
  }

  distanceTo(v: Vec2): number {
    return Vec2.distance(this.x, this.y, v.x, v.y);
  }
  angle(): number {
    return Math.atan2(this.y, this.x);
  }
  angleTo(v: Vec2): number {
    return Math.atan2(v.y - this.y, v.x - this.x);
  }

  rotate(angle: number): this {
    const cos = Math.cos(angle),
      sin = Math.sin(angle);
    const nx = this.x * cos - this.y * sin;
    const ny = this.x * sin + this.y * cos;
    this.x = nx;
    this.y = ny;
    return this;
  }

  perpendicular(): this {
    const tx = this.x;
    this.x = -this.y;
    this.y = tx;
    return this;
  }

  reflect(normal: Vec2): this {
    const d = 2 * this.dot(normal);
    this.x -= d * normal.x;
    this.y -= d * normal.y;
    return this;
  }

  lerp(target: Vec2, t: number): this {
    this.x += (target.x - this.x) * t;
    this.y += (target.y - this.y) * t;
    return this;
  }

  equals(v: Vec2, epsilon = 0.0001): boolean {
    return Math.abs(this.x - v.x) < epsilon && Math.abs(this.y - v.y) < epsilon;
  }

  isZero(epsilon = 0.0001): boolean {
    return this.lengthSq() < epsilon * epsilon;
  }

  toArray(): [number, number] {
    return [this.x, this.y];
  }

  toString(): string {
    return `Vec2(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`;
  }
}
