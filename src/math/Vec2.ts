/**
 * 2D 向量类
 * 提供常用向量运算
 */

export class Vec2 {
  constructor(
    public x = 0,
    public y = 0
  ) {}

  /** 创建零向量 */
  static zero(): Vec2 {
    return new Vec2(0, 0);
  }

  /** 创建单位向量 */
  static one(): Vec2 {
    return new Vec2(1, 1);
  }

  /** 从角度创建单位向量 */
  static fromAngle(angle: number): Vec2 {
    return new Vec2(Math.cos(angle), Math.sin(angle));
  }

  /** 从两点创建向量 */
  static fromPoints(x1: number, y1: number, x2: number, y2: number): Vec2 {
    return new Vec2(x2 - x1, y2 - y1);
  }

  /** 两点之间的距离 */
  static distance(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /** 两点之间的距离平方（避免开方，性能更好） */
  static distanceSq(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return dx * dx + dy * dy;
  }

  /** 两向量点积 */
  static dot(x1: number, y1: number, x2: number, y2: number): number {
    return x1 * x2 + y1 * y2;
  }

  /** 两向量叉积（返回 z 分量） */
  static cross(x1: number, y1: number, x2: number, y2: number): number {
    return x1 * y2 - y1 * x2;
  }

  /** 线性插值 */
  static lerp(x1: number, y1: number, x2: number, y2: number, t: number): Vec2 {
    return new Vec2(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t);
  }

  /** 克隆 */
  clone(): Vec2 {
    return new Vec2(this.x, this.y);
  }

  /** 设置值 */
  set(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }

  /** 复制另一个向量 */
  copy(v: Vec2): this {
    this.x = v.x;
    this.y = v.y;
    return this;
  }

  /** 加法 */
  add(v: Vec2): this {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  /** 加法（分量） */
  addXY(x: number, y: number): this {
    this.x += x;
    this.y += y;
    return this;
  }

  /** 减法 */
  sub(v: Vec2): this {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  /** 减法（分量） */
  subXY(x: number, y: number): this {
    this.x -= x;
    this.y -= y;
    return this;
  }

  /** 标量乘法 */
  scale(s: number): this {
    this.x *= s;
    this.y *= s;
    return this;
  }

  /** 分量乘法 */
  multiply(v: Vec2): this {
    this.x *= v.x;
    this.y *= v.y;
    return this;
  }

  /** 分量除法 */
  divide(v: Vec2): this {
    this.x /= v.x;
    this.y /= v.y;
    return this;
  }

  /** 取反 */
  negate(): this {
    this.x = -this.x;
    this.y = -this.y;
    return this;
  }

  /** 长度 */
  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /** 长度平方 */
  lengthSq(): number {
    return this.x * this.x + this.y * this.y;
  }

  /** 归一化 */
  normalize(): this {
    const len = this.length();
    if (len > 0) {
      this.x /= len;
      this.y /= len;
    }
    return this;
  }

  /** 设置长度 */
  setLength(length: number): this {
    return this.normalize().scale(length);
  }

  /** 限制长度 */
  clampLength(max: number): this {
    const len = this.length();
    if (len > max) {
      this.scale(max / len);
    }
    return this;
  }

  /** 到另一个向量的距离 */
  distanceTo(v: Vec2): number {
    return Vec2.distance(this.x, this.y, v.x, v.y);
  }

  /** 到另一个向量的距离平方 */
  distanceToSq(v: Vec2): number {
    return Vec2.distanceSq(this.x, this.y, v.x, v.y);
  }

  /** 点积 */
  // biome-ignore lint/suspicious/useAdjacentOverloadSignatures: Instance method intentionally shares name with static method
  dot(v: Vec2): number {
    return Vec2.dot(this.x, this.y, v.x, v.y);
  }

  /** 叉积 */
  cross(v: Vec2): number {
    return Vec2.cross(this.x, this.y, v.x, v.y);
  }

  /** 角度（弧度） */
  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  /** 到另一个向量的角度 */
  angleTo(v: Vec2): number {
    return Math.atan2(v.y - this.y, v.x - this.x);
  }

  /** 旋转 */
  rotate(angle: number): this {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const x = this.x * cos - this.y * sin;
    const y = this.x * sin + this.y * cos;
    this.x = x;
    this.y = y;
    return this;
  }

  /** 垂直向量（逆时针旋转 90 度） */
  perpendicular(): this {
    const x = this.x;
    this.x = -this.y;
    this.y = x;
    return this;
  }

  /** 反射（基于法线） */
  reflect(normal: Vec2): this {
    const d = 2 * this.dot(normal);
    this.x -= d * normal.x;
    this.y -= d * normal.y;
    return this;
  }

  /** 线性插值到目标 */
  lerp(target: Vec2, t: number): this {
    this.x += (target.x - this.x) * t;
    this.y += (target.y - this.y) * t;
    return this;
  }

  /** 判断是否相等 */
  equals(v: Vec2, epsilon = 0.0001): boolean {
    return Math.abs(this.x - v.x) < epsilon && Math.abs(this.y - v.y) < epsilon;
  }

  /** 判断是否为零向量 */
  isZero(epsilon = 0.0001): boolean {
    return this.lengthSq() < epsilon * epsilon;
  }

  /** 转为数组 */
  toArray(): [number, number] {
    return [this.x, this.y];
  }

  /** 转为对象 */
  toObject(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  /** 字符串表示 */
  toString(): string {
    return `Vec2(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`;
  }
}
