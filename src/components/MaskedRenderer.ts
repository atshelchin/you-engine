/**
 * Masked Renderer - 遮罩渲染器
 *
 * 支持任意形状的贴图遮罩
 */

import { Component } from '../core/Component';

// ==================== 遮罩形状定义 ====================

export type MaskShape =
  | { type: 'circle'; radius: number }
  | { type: 'rect'; width: number; height: number; cornerRadius?: number }
  | { type: 'star'; points: number; radius: number; innerRadius?: number }
  | { type: 'polygon'; vertices: { x: number; y: number }[] }
  | { type: 'custom'; path: (ctx: CanvasRenderingContext2D) => void };

// ==================== 遮罩渲染器 ====================

export interface MaskedSpriteConfig {
  image: HTMLImageElement | HTMLCanvasElement;
  mask: MaskShape;
  imageScale?: number; // 图片缩放
  imageOffsetX?: number; // 图片偏移
  imageOffsetY?: number;
  opacity?: number;
}

export class MaskedSprite extends Component {
  image: HTMLImageElement | HTMLCanvasElement;
  mask: MaskShape;
  imageScale: number;
  imageOffsetX: number;
  imageOffsetY: number;
  opacity: number;

  constructor(config: MaskedSpriteConfig) {
    super();
    this.image = config.image;
    this.mask = config.mask;
    this.imageScale = config.imageScale || 1.0;
    this.imageOffsetX = config.imageOffsetX || 0;
    this.imageOffsetY = config.imageOffsetY || 0;
    this.opacity = config.opacity ?? 1.0;
  }

  onRender(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    // 设置透明度
    if (this.opacity < 1.0) {
      ctx.globalAlpha = this.opacity;
    }

    // 开始裁剪路径
    ctx.beginPath();
    this.drawMaskPath(ctx, this.mask);
    ctx.closePath();
    ctx.clip();

    // 在裁剪区域内绘制图片
    const w = this.image.width * this.imageScale;
    const h = this.image.height * this.imageScale;
    ctx.drawImage(this.image, -w / 2 + this.imageOffsetX, -h / 2 + this.imageOffsetY, w, h);

    ctx.restore();
  }

  private drawMaskPath(ctx: CanvasRenderingContext2D, mask: MaskShape): void {
    switch (mask.type) {
      case 'circle':
        this.drawCirclePath(ctx, mask.radius);
        break;

      case 'rect':
        this.drawRectPath(ctx, mask.width, mask.height, mask.cornerRadius);
        break;

      case 'star':
        this.drawStarPath(ctx, mask.points, mask.radius, mask.innerRadius);
        break;

      case 'polygon':
        this.drawPolygonPath(ctx, mask.vertices);
        break;

      case 'custom':
        mask.path(ctx);
        break;
    }
  }

  private drawCirclePath(ctx: CanvasRenderingContext2D, radius: number): void {
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
  }

  private drawRectPath(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    cornerRadius?: number
  ): void {
    const x = -width / 2;
    const y = -height / 2;

    if (cornerRadius && cornerRadius > 0) {
      // 圆角矩形
      const r = Math.min(cornerRadius, width / 2, height / 2);
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + width - r, y);
      ctx.arcTo(x + width, y, x + width, y + r, r);
      ctx.lineTo(x + width, y + height - r);
      ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
      ctx.lineTo(x + r, y + height);
      ctx.arcTo(x, y + height, x, y + height - r, r);
      ctx.lineTo(x, y + r);
      ctx.arcTo(x, y, x + r, y, r);
    } else {
      // 普通矩形
      ctx.rect(x, y, width, height);
    }
  }

  private drawStarPath(
    ctx: CanvasRenderingContext2D,
    points: number,
    radius: number,
    innerRadius?: number
  ): void {
    const innerR = innerRadius || radius * 0.5;

    for (let i = 0; i < points * 2; i++) {
      const angle = (Math.PI * i) / points - Math.PI / 2;
      const r = i % 2 === 0 ? radius : innerR;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
  }

  private drawPolygonPath(
    ctx: CanvasRenderingContext2D,
    vertices: { x: number; y: number }[]
  ): void {
    if (vertices.length === 0) return;

    ctx.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
      ctx.lineTo(vertices[i].x, vertices[i].y);
    }
  }
}

// ==================== 预定义形状工厂 ====================

/**
 * 快捷创建各种形状遮罩
 */
export const Masks = {
  /**
   * 圆形遮罩
   */
  circle(radius: number): MaskShape {
    return { type: 'circle', radius };
  },

  /**
   * 矩形遮罩
   */
  rect(width: number, height: number, cornerRadius?: number): MaskShape {
    return { type: 'rect', width, height, cornerRadius };
  },

  /**
   * 圆角矩形遮罩
   */
  roundRect(width: number, height: number, radius: number): MaskShape {
    return { type: 'rect', width, height, cornerRadius: radius };
  },

  /**
   * 星形遮罩
   */
  star(points: number, radius: number, innerRadius?: number): MaskShape {
    return { type: 'star', points, radius, innerRadius };
  },

  /**
   * 五角星
   */
  pentagram(radius: number): MaskShape {
    return Masks.star(5, radius, radius * 0.38);
  },

  /**
   * 六角星
   */
  hexagram(radius: number): MaskShape {
    return Masks.star(6, radius);
  },

  /**
   * 正多边形
   */
  polygon(sides: number, radius: number): MaskShape {
    const vertices: { x: number; y: number }[] = [];
    for (let i = 0; i < sides; i++) {
      const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
      vertices.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    }
    return { type: 'polygon', vertices };
  },

  /**
   * 三角形
   */
  triangle(radius: number): MaskShape {
    return Masks.polygon(3, radius);
  },

  /**
   * 六边形
   */
  hexagon(radius: number): MaskShape {
    return Masks.polygon(6, radius);
  },

  /**
   * 八边形
   */
  octagon(radius: number): MaskShape {
    return Masks.polygon(8, radius);
  },

  /**
   * 心形
   */
  heart(size: number): MaskShape {
    return {
      type: 'custom',
      path: (ctx) => {
        const x = 0;
        const y = 0;
        const width = size;
        const height = size;

        ctx.moveTo(x, y + height / 4);
        ctx.quadraticCurveTo(x, y, x + width / 4, y);
        ctx.quadraticCurveTo(x + width / 2, y, x + width / 2, y + height / 4);
        ctx.quadraticCurveTo(x + width / 2, y, x + (width * 3) / 4, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + height / 4);
        ctx.quadraticCurveTo(x + width, y + height / 2, x + width / 2, y + (height * 3) / 4);
        ctx.quadraticCurveTo(x, y + height / 2, x, y + height / 4);
      },
    };
  },

  /**
   * 自定义路径
   */
  custom(path: (ctx: CanvasRenderingContext2D) => void): MaskShape {
    return { type: 'custom', path };
  },
};

// ==================== 使用示例 ====================

/*
// 1. 圆形头像
const avatar = new Node();
avatar.addComponent(MaskedSprite, {
  image: playerImage,
  mask: Masks.circle(32)
});

// 2. 五角星图标
const star = new Node();
star.addComponent(MaskedSprite, {
  image: iconImage,
  mask: Masks.pentagram(24)
});

// 3. 六边形贴图
const hex = new Node();
hex.addComponent(MaskedSprite, {
  image: tileImage,
  mask: Masks.hexagon(40)
});

// 4. 心形贴图
const heart = new Node();
heart.addComponent(MaskedSprite, {
  image: loveImage,
  mask: Masks.heart(50)
});

// 5. 圆角矩形
const card = new Node();
card.addComponent(MaskedSprite, {
  image: cardImage,
  mask: Masks.roundRect(100, 140, 12)
});

// 6. 自定义形状
const custom = new Node();
custom.addComponent(MaskedSprite, {
  image: myImage,
  mask: Masks.custom((ctx) => {
    // 绘制任意路径
    ctx.moveTo(0, -50);
    ctx.lineTo(50, 50);
    ctx.lineTo(-50, 50);
  })
});
*/
