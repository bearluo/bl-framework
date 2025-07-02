/**
 * 自定义FormData类，用于构建multipart/form-data格式的请求体
 * 支持文本参数和文件上传
 */
export class FWFormData {
    /** 文本编码器，用于字符串转字节数组 */
    static textEncoder = new TextEncoder();
    
    /** form-data 数据信息数组 */
    public infos: any[] = [];
    
    /** boundary键值，用于分隔不同的表单字段 */
    public boundary_key: string = `customformdata`;
    
    /** 参数的boundary，用于分隔每个字段 */
    public boundary: string = `--${this.boundary_key}`;
    
    /** 结尾的boundary，标识表单数据结束 */
    public end_boundary: string = `${this.boundary}--`;

    /**
     * 添加一个参数到表单数据中
     * @param key 参数名
     * @param value 参数值
     * @param filename 文件名（可选，用于文件上传）
     */
    public append(key: string, value: any, filename?: string) {
        this.infos.push(`\r\n`);
        this.infos.push(`${this.boundary}\r\n`);
        
        if (filename) {
            // 文件上传格式
            this.infos.push(`Content-Disposition: form-data; name="${key}"; filename="${filename}"\r\n`);
            this.infos.push(`Content-Type: image/png\r\n\r\n`);
        } else {
            // 普通参数格式
            this.infos.push(`Content-Disposition: form-data; name="${key}"\r\n\r\n`);
        }
        this.infos.push(value);
    }

    /**
     * 设置参数（为了和浏览器FormData格式一致）
     * @param key 参数名
     * @param value 参数值
     * @param filename 文件名（可选）
     */
    public set(key: string, value: any, filename?: string) {
        this.append(key, value, filename);
    }

    /**
     * 将表单数据转换为ArrayBuffer
     * @returns ArrayBuffer格式的表单数据
     */
    public get arrayBuffer(): ArrayBuffer {
        let bytes: number[][] = [];
        this.infos.push(`\r\n${this.end_boundary}`);
        
        this.infos.forEach(element => {
            if (typeof element == `string`) {
                // 字符串转换为字节数组
                bytes.push(Array.prototype.slice.call(FWFormData.textEncoder.encode(element)));
            } else if (element instanceof ArrayBuffer) {
                // ArrayBuffer转换为字节数组
                bytes.push(Array.prototype.slice.call(new Uint8Array(element)));
            } else if (element instanceof Uint8Array) {
                // Uint8Array转换为普通数组
                let array: number[] = [];
                for (let i = 0; i < element.length; i++) {
                    array.push(element[i]);
                }
                bytes.push(array);
            }
        });
        
        // 合并所有字节数组
        let data: number[] = [];
        for (let v of bytes) {
            for (let n of v) {
                data.push(n);
            }
        }
        return new Uint8Array(data).buffer;
    }

    /**
     * 清空表单数据
     */
    public clear(): void {
        this.infos = [];
    }

    /**
     * 删除指定参数
     * @param key 要删除的参数名
     */
    public delete(key: string): void {
        // 这里可以实现删除指定参数的逻辑
        // 由于当前实现方式，删除操作比较复杂，建议重新构建
        console.warn('删除操作建议重新构建FormData');
    }
}

/** 任意键类型 */
type AnyKeyType = string | number | symbol;

/** 任意对象类型 */
type AnyObjectType = { [key: AnyKeyType]: any };

/** HTTP请求方法枚举 */
export enum HttpMethod {
    GET = 'GET',
    POST = 'POST',
    PUT = 'PUT',
    DELETE = 'DELETE',
    PATCH = 'PATCH',
    HEAD = 'HEAD',
    OPTIONS = 'OPTIONS'
}

/** HTTP请求配置接口 */
export interface HttpRequestConfig {
    method?: HttpMethod;
    headers?: Record<string, string>;
    timeout?: number;
    withCredentials?: boolean;
    responseType?: XMLHttpRequestResponseType;
}

/** HTTP响应接口 */
export interface HttpResponse<T = any> {
    data: T;
    status: number;
    statusText: string;
    headers: Record<string, string>;
    url: string;
}

/**
 * 自定义HTTP请求类，封装XMLHttpRequest
 * 支持GET、POST、PUT、DELETE等HTTP方法
 * 提供统一的错误处理和响应格式
 */
export class FWHttp {
    /** XMLHttpRequest实例 */
    private xhr: XMLHttpRequest;
    
    /** 请求URL */
    private url: string;
    
    /** 请求体数据 */
    private body: Document | XMLHttpRequestBodyInit | FWFormData | Record<string, any> | null = null;
    
    /** URL参数 */
    private params: AnyObjectType | null = null;
    
    /** 请求配置 */
    private config: HttpRequestConfig;
    
    /** 请求完成回调 */
    private onComplete: (error: Error | null, response?: HttpResponse) => void;

    /**
     * 构造函数
     * @param url 请求URL
     * @param config 请求配置
     */
    constructor(url: string, config: HttpRequestConfig = {}) {
        this.url = url;
        this.config = {
            method: HttpMethod.GET,
            headers: {},
            timeout: 8000,
            withCredentials: false,
            responseType: 'json',
            ...config
        };
        
        this.initXHR();
    }

    /**
     * 初始化XMLHttpRequest
     */
    private initXHR(): void {
        this.xhr = new XMLHttpRequest();
        this.xhr.onload = this.onload.bind(this);
        this.xhr.onerror = this.onerror.bind(this);
        this.xhr.ontimeout = this.ontimeout.bind(this);
        this.xhr.onabort = this.onabort.bind(this);
        this.xhr.withCredentials = this.config.withCredentials!;
        this.xhr.responseType = this.config.responseType!;
        this.xhr.timeout = this.config.timeout!;
    }

    /**
     * 设置请求头
     * @param key 请求头名称
     * @param value 请求头值
     */
    public setRequestHeader(key: string, value: string): FWHttp {
        this.config.headers![key] = value;
        return this;
    }

    /**
     * 设置请求体
     * @param body 请求体数据
     */
    public setBody(body: Document | XMLHttpRequestBodyInit | FWFormData | Record<string, any> | null): FWHttp {
        this.body = body;
        return this;
    }

    /**
     * 设置URL参数
     * @param params URL参数字典
     */
    public setParams(params: AnyObjectType): FWHttp {
        this.params = params;
        return this;
    }

    /**
     * 设置完成回调
     * @param callback 回调函数
     */
    public setCallback(callback: (error: Error | null, response?: HttpResponse) => void): FWHttp {
        this.onComplete = callback;
        return this;
    }

    /**
     * 构建完整URL（包含参数）
     */
    private buildUrl(): string {
        if (!this.params) {
            return this.url;
        }
        
        const queryString = FWHttp.splicingParams(this.params);
        const separator = this.url.includes('?') ? '&' : '?';
        return `${this.url}${separator}${queryString}`;
    }

    /**
     * 设置所有请求头
     */
    private setHeaders(): void {
        // 设置默认Content-Type
        if (!this.config.headers!['Content-Type']) {
            if (this.body instanceof FWFormData) {
                this.xhr.setRequestHeader('Content-Type', `multipart/form-data; boundary=${this.body.boundary_key}`);
            } else if (typeof this.body === 'string') {
                this.xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            } else if (this.body && typeof this.body === 'object') {
                this.xhr.setRequestHeader('Content-Type', 'application/json');
            }
        }
        
        // 设置自定义请求头
        Object.keys(this.config.headers!).forEach(key => {
            this.xhr.setRequestHeader(key, this.config.headers![key]);
        });
    }

    /**
     * 请求成功回调
     */
    private onload(): void {
        if (this.xhr.status >= 200 && this.xhr.status < 300 || this.xhr.status === 0) {
            const response: HttpResponse = {
                data: this.xhr.response,
                status: this.xhr.status,
                statusText: this.xhr.statusText,
                headers: this.parseResponseHeaders(),
                url: this.xhr.responseURL || this.url
            };
            this.onComplete?.(null, response);
        } else {
            this.onFail(`HTTP ${this.xhr.status}: ${this.xhr.statusText}`);
        }
    }

    /**
     * 网络错误回调
     */
    private onerror(): void {
        this.onFail('网络错误');
    }

    /**
     * 超时回调
     */
    private ontimeout(): void {
        this.onFail('请求超时');
    }

    /**
     * 请求中断回调
     */
    private onabort(): void {
        this.onFail('请求被中断');
    }

    /**
     * 请求失败处理
     * @param msg 错误信息
     */
    private onFail(msg: string): void {
        const error = new Error(`${this.errInfo}${msg}`);
        this.onComplete?.(error);
    }

    /**
     * 解析响应头
     */
    private parseResponseHeaders(): Record<string, string> {
        const headers: Record<string, string> = {};
        const headerString = this.xhr.getAllResponseHeaders();
        
        if (headerString) {
            const headerPairs = headerString.split('\u000d\u000a');
            for (let i = 0; i < headerPairs.length; i++) {
                const headerPair = headerPairs[i];
                const index = headerPair.indexOf('\u003a\u0020');
                if (index > 0) {
                    const key = headerPair.substring(0, index);
                    const value = headerPair.substring(index + 2);
                    headers[key] = value;
                }
            }
        }
        
        return headers;
    }

    /**
     * 错误信息前缀
     */
    private get errInfo(): string {
        return `请求失败: ${this.url}, 状态: `;
    }

    /**
     * 发送GET请求
     */
    public get(): void {
        this.config.method = HttpMethod.GET;
        this.send();
    }

    /**
     * 发送POST请求
     */
    public post(): void {
        this.config.method = HttpMethod.POST;
        this.send();
    }

    /**
     * 发送PUT请求
     */
    public put(): void {
        this.config.method = HttpMethod.PUT;
        this.send();
    }

    /**
     * 发送DELETE请求
     */
    public delete(): void {
        this.config.method = HttpMethod.DELETE;
        this.send();
    }

    /**
     * 发送PATCH请求
     */
    public patch(): void {
        this.config.method = HttpMethod.PATCH;
        this.send();
    }

    /**
     * 发送请求
     */
    private send(): void {
        const url = this.buildUrl();
        this.xhr.open(this.config.method!, url, true);
        this.setHeaders();
        
        // 处理请求体
        let requestBody: Document | XMLHttpRequestBodyInit | null = null;
        if (this.body instanceof FWFormData) {
            // 将FWFormData转换为ArrayBuffer
            requestBody = this.body.arrayBuffer;
        } else if (this.body && typeof this.body === 'object' && !(this.body instanceof ArrayBuffer) && !(this.body instanceof Uint8Array) && !(this.body instanceof Document) && !(this.body instanceof Blob) && !(this.body instanceof FormData) && !(this.body instanceof URLSearchParams)) {
            // 将普通对象转换为JSON字符串
            requestBody = JSON.stringify(this.body);
        } else {
            requestBody = this.body as Document | XMLHttpRequestBodyInit | null;
        }
        
        this.xhr.send(requestBody);
    }

    /**
     * 中断请求
     */
    public abort(): void {
        this.xhr.abort();
    }

    /**
     * 拼接URL参数
     * @param params 参数字典
     * @returns 查询字符串
     */
    static splicingParams(params: AnyObjectType): string {
        return Object.keys(params)
            .sort()
            .map(key => {
                const value = params[key];
                return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
            })
            .join('&');
    }

    /**
     * 创建GET请求的便捷方法
     * @param url 请求URL
     * @param params URL参数
     * @param callback 回调函数
     */
    static get(url: string, params?: AnyObjectType, callback?: (error: Error | null, response?: HttpResponse) => void): FWHttp {
        const http = new FWHttp(url);
        if (params) {
            http.setParams(params);
        }
        if (callback) {
            http.setCallback(callback);
        }
        http.get();
        return http;
    }

    /**
     * 创建POST请求的便捷方法
     * @param url 请求URL
     * @param body 请求体
     * @param callback 回调函数
     */
    static post(url: string, body?: any, callback?: (error: Error | null, response?: HttpResponse) => void): FWHttp {
        const http = new FWHttp(url);
        if (body) {
            http.setBody(body);
        }
        if (callback) {
            http.setCallback(callback);
        }
        http.post();
        return http;
    }
}