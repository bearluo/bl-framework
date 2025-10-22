/**
 * 位集合
 * 用于快速标记和查询，常用于组件匹配
 */
export class BitSet {
    /** 位数组 */
    private bits: Uint32Array;

    /** 位集大小（位数） */
    private size: number;

    constructor(size: number = 1024) {
        this.size = size;
        // 每个uint32可以存储32位
        this.bits = new Uint32Array(Math.ceil(size / 32));
    }

    /**
     * 设置某位为1
     */
    set(index: number): void {
        if (index >= this.size) {
            this.resize(index + 1);
        }

        const arrayIndex = Math.floor(index / 32);
        const bitIndex = index % 32;
        this.bits[arrayIndex] |= 1 << bitIndex;
    }

    /**
     * 清除某位（设置为0）
     */
    clear(index: number): void {
        if (index >= this.size) return;

        const arrayIndex = Math.floor(index / 32);
        const bitIndex = index % 32;
        this.bits[arrayIndex] &= ~(1 << bitIndex);
    }

    /**
     * 获取某位的值
     */
    get(index: number): boolean {
        if (index >= this.size) return false;

        const arrayIndex = Math.floor(index / 32);
        const bitIndex = index % 32;
        return (this.bits[arrayIndex] & (1 << bitIndex)) !== 0;
    }

    /**
     * 检查是否包含所有指定的位
     */
    containsAll(other: BitSet): boolean {
        const minLength = Math.min(this.bits.length, other.bits.length);

        for (let i = 0; i < minLength; i++) {
            if ((this.bits[i] & other.bits[i]) !== other.bits[i]) {
                return false;
            }
        }

        // 检查other剩余的位是否都为0
        for (let i = minLength; i < other.bits.length; i++) {
            if (other.bits[i] !== 0) {
                return false;
            }
        }

        return true;
    }

    /**
     * 检查是否包含任意一个指定的位
     */
    containsAny(other: BitSet): boolean {
        const minLength = Math.min(this.bits.length, other.bits.length);

        for (let i = 0; i < minLength; i++) {
            if ((this.bits[i] & other.bits[i]) !== 0) {
                return true;
            }
        }

        return false;
    }

    /**
     * 检查是否不包含任何指定的位
     */
    containsNone(other: BitSet): boolean {
        return !this.containsAny(other);
    }

    /**
     * 清空所有位
     */
    clearAll(): void {
        this.bits.fill(0);
    }

    /**
     * 调整位集大小
     */
    private resize(newSize: number): void {
        const newBits = new Uint32Array(Math.ceil(newSize / 32));
        newBits.set(this.bits);
        this.bits = newBits;
        this.size = newSize;
    }

    /**
     * 获取位集大小
     */
    getSize(): number {
        return this.size;
    }

    /**
     * 克隆位集
     */
    clone(): BitSet {
        const newBitSet = new BitSet(this.size);
        newBitSet.bits.set(this.bits);
        return newBitSet;
    }
}

