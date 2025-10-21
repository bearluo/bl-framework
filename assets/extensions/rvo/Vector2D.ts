/**
 * Vector2D 向量类（带对象池优化）
 */
export default class Vector2D {
    static ZERO: Vector2D = new Vector2D();

    x = 0;
    y = 0;

    constructor(x: number = 0, y: number = 0) {
        this.x = x;
        this.y = y;
    }

    // ========== 原有方法（创建新对象） ==========

    /**
     * 向量加法（创建新对象）
     */
    plus(vector: Vector2D): Vector2D {
        return new Vector2D(this.x + vector.x, this.y + vector.y);
    }

    /**
     * 向量减法（创建新对象）
     */
    minus(vector: Vector2D): Vector2D {
        return new Vector2D(this.x - vector.x, this.y - vector.y);
    }

    /**
     * 点积
     */
    multiply(vector: Vector2D): number {
        return this.x * vector.x + this.y * vector.y;
    }

    /**
     * 标量乘法（创建新对象）
     */
    scale(k: number): Vector2D {
        return new Vector2D(this.x * k, this.y * k);
    }

    /**
     * 归一化（创建新对象）
     */
    normalize(): Vector2D {
        return this.scale(1 / this.abs());
    }

    /**
     * 长度的平方
     */
    absSq(): number {
        return this.multiply(this);
    }

    /**
     * 向量长度
     */
    abs(): number {
        return Math.sqrt(this.absSq());
    }

    /**
     * 克隆（创建新对象）
     */
    clone(): Vector2D {
        return new Vector2D(this.x, this.y);
    }

    // ========== 优化方法（修改自身，避免创建对象） ==========

    /**
     * 设置向量值
     */
    set(x: number, y: number): this {
        this.x = x;
        this.y = y;
        return this;
    }

    /**
     * 从另一个向量复制值
     */
    copy(vector: Vector2D): this {
        this.x = vector.x;
        this.y = vector.y;
        return this;
    }

    /**
     * 向量加法（修改自身）
     */
    addSelf(vector: Vector2D): this {
        this.x += vector.x;
        this.y += vector.y;
        return this;
    }

    /**
     * 向量减法（修改自身）
     */
    subSelf(vector: Vector2D): this {
        this.x -= vector.x;
        this.y -= vector.y;
        return this;
    }

    /**
     * 标量乘法（修改自身）
     */
    scaleSelf(k: number): this {
        this.x *= k;
        this.y *= k;
        return this;
    }

    /**
     * 归一化（修改自身）
     */
    normalizeSelf(): this {
        const length = this.abs();
        if (length > 0) {
            this.x /= length;
            this.y /= length;
        }
        return this;
    }

    /**
     * 重置为零向量
     */
    reset(): this {
        this.x = 0;
        this.y = 0;
        return this;
    }

    // ========== 静态对象池 ==========

    private static _pool: Vector2D[] = [];
    private static _poolSize = 0;
    private static readonly MAX_POOL_SIZE = 1000; // 最大池容量

    /**
     * 从对象池获取 Vector2D（推荐用于高频运算）
     */
    static get(x: number = 0, y: number = 0): Vector2D {
        let vector: Vector2D;
        if (this._poolSize > 0) {
            vector = this._pool[--this._poolSize];
            vector.x = x;
            vector.y = y;
        } else {
            vector = new Vector2D(x, y);
        }
        return vector;
    }

    /**
     * 回收到对象池
     */
    static put(vector: Vector2D): void {
        if (this._poolSize < this.MAX_POOL_SIZE) {
            vector.reset();
            this._pool[this._poolSize++] = vector;
        }
    }

    /**
     * 批量回收
     */
    static putArray(vectors: Vector2D[]): void {
        for (const vector of vectors) {
            this.put(vector);
        }
    }

    /**
     * 清空对象池
     */
    static clearPool(): void {
        this._pool.length = 0;
        this._poolSize = 0;
    }

    /**
     * 预热对象池
     */
    static warmupPool(size: number): void {
        for (let i = 0; i < size; i++) {
            this._pool.push(new Vector2D());
        }
        this._poolSize = size;
    }

    /**
     * 获取池状态
     */
    static getPoolStats(): { size: number; capacity: number; usage: string } {
        return {
            size: this._poolSize,
            capacity: this.MAX_POOL_SIZE,
            usage: `${this._poolSize}/${this.MAX_POOL_SIZE}`,
        };
    }
}
