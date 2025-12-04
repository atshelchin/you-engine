/**
 * 数学工具函数
 */

/** 圆周率 */
export const PI = Math.PI;

/** 两倍圆周率 */
export const TAU = Math.PI * 2;

/** 弧度转角度系数 */
export const RAD_TO_DEG = 180 / Math.PI;

/** 角度转弧度系数 */
export const DEG_TO_RAD = Math.PI / 180;

/**
 * 限制值在范围内
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * 线性插值
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * 反向线性插值（获取 t 值）
 */
export function inverseLerp(a: number, b: number, value: number): number {
  if (a === b) return 0;
  return (value - a) / (b - a);
}

/**
 * 映射值从一个范围到另一个范围
 */
export function map(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return lerp(outMin, outMax, inverseLerp(inMin, inMax, value));
}

/**
 * 平滑插值（Smoothstep）
 */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * 更平滑的插值（Smootherstep）
 */
export function smootherstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/**
 * 角度转弧度
 */
export function degToRad(degrees: number): number {
  return degrees * DEG_TO_RAD;
}

/**
 * 弧度转角度
 */
export function radToDeg(radians: number): number {
  return radians * RAD_TO_DEG;
}

/**
 * 规范化角度到 [-PI, PI]
 */
export function normalizeAngle(angle: number): number {
  while (angle > PI) angle -= TAU;
  while (angle < -PI) angle += TAU;
  return angle;
}

/**
 * 两个角度之间的最短差值
 */
export function angleDiff(from: number, to: number): number {
  return normalizeAngle(to - from);
}

/**
 * 角度线性插值（考虑最短路径）
 */
export function lerpAngle(from: number, to: number, t: number): number {
  const diff = angleDiff(from, to);
  return from + diff * t;
}

/**
 * 随机整数 [min, max]
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 随机浮点数 [min, max)
 */
export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * 随机选择数组元素
 */
export function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * 洗牌数组（原地）
 */
export function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * 随机布尔值
 */
export function randomBool(probability = 0.5): boolean {
  return Math.random() < probability;
}

/**
 * 随机符号 (1 或 -1)
 */
export function randomSign(): number {
  return Math.random() < 0.5 ? -1 : 1;
}

/**
 * 随机角度 [0, 2PI)
 */
export function randomAngle(): number {
  return Math.random() * TAU;
}

/**
 * 判断两个数是否近似相等
 */
export function approxEqual(
  a: number,
  b: number,
  epsilon = 0.0001
): boolean {
  return Math.abs(a - b) < epsilon;
}

/**
 * 符号函数
 */
export function sign(x: number): number {
  if (x > 0) return 1;
  if (x < 0) return -1;
  return 0;
}

/**
 * 向目标值移动（限制每帧最大移动量）
 */
export function moveTowards(
  current: number,
  target: number,
  maxDelta: number
): number {
  if (Math.abs(target - current) <= maxDelta) {
    return target;
  }
  return current + sign(target - current) * maxDelta;
}

/**
 * 阻尼移动（弹性效果）
 */
export function damp(
  current: number,
  target: number,
  smoothing: number,
  dt: number
): number {
  return lerp(current, target, 1 - Math.exp(-smoothing * dt));
}

/**
 * 环绕值（用于循环范围）
 */
export function wrap(value: number, min: number, max: number): number {
  const range = max - min;
  return ((((value - min) % range) + range) % range) + min;
}

/**
 * 乒乓值（来回反弹）
 */
export function pingPong(t: number, length: number): number {
  t = wrap(t, 0, length * 2);
  return length - Math.abs(t - length);
}

/**
 * 阶梯函数
 */
export function step(edge: number, x: number): number {
  return x < edge ? 0 : 1;
}

/**
 * 判断值是否在范围内
 */
export function inRange(
  value: number,
  min: number,
  max: number
): boolean {
  return value >= min && value <= max;
}

/**
 * 取模（支持负数）
 */
export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}
