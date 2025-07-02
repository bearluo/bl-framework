import { FWHttp, HttpMethod, HttpRequestConfig, HttpResponse } from '../FWHttp';

/**
 * JWT 客户端配置接口
 */
export interface JWTClientConfig {
    baseUrl: string;
    tokenKey?: string;
    refreshTokenKey?: string;
    autoRefresh?: boolean;
    refreshThreshold?: number;
    onTokenExpired?: () => void;
    onRefreshFailed?: () => void;
}

/**
 * JWT 客户端
 * 封装带 JWT 认证的 HTTP 请求
 */
export class JWTClient {
    private config: JWTClientConfig;
    private token: string | null = null;
    private refreshTokenValue: string | null = null;
    private refreshPromise: Promise<string> | null = null;

    constructor(config: JWTClientConfig) {
        this.config = {
            tokenKey: 'jwt_token',
            refreshTokenKey: 'jwt_refresh_token',
            autoRefresh: true,
            refreshThreshold: 5 * 60 * 1000, // 5分钟
            ...config
        };
        
        this.loadTokens();
    }

    /**
     * 设置访问令牌
     * @param token JWT 令牌
     */
    public setToken(token: string): void {
        this.token = token;
        this.saveToken(token);
    }

    /**
     * 设置刷新令牌
     * @param refreshToken 刷新令牌
     */
    public setRefreshToken(refreshToken: string): void {
        this.refreshTokenValue = refreshToken;
        this.saveRefreshToken(refreshToken);
    }

    /**
     * 获取访问令牌
     */
    public getToken(): string | null {
        return this.token;
    }

    /**
     * 获取刷新令牌
     */
    public getRefreshToken(): string | null {
        return this.refreshTokenValue;
    }

    /**
     * 清除所有令牌
     */
    public clearTokens(): void {
        this.token = null;
        this.refreshTokenValue = null;
        this.removeToken();
        this.removeRefreshToken();
    }

    /**
     * 发送带认证的 GET 请求
     * @param url 请求URL
     * @param params URL参数
     * @param config 请求配置
     * @returns Promise<HttpResponse>
     */
    public async get<T = any>(url: string, params?: any, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
        return this.request<T>({
            method: HttpMethod.GET,
            url,
            params,
            ...config
        });
    }

    /**
     * 发送带认证的 POST 请求
     * @param url 请求URL
     * @param body 请求体
     * @param config 请求配置
     * @returns Promise<HttpResponse>
     */
    public async post<T = any>(url: string, body?: any, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
        return this.request<T>({
            method: HttpMethod.POST,
            url,
            body,
            ...config
        });
    }

    /**
     * 发送带认证的 PUT 请求
     * @param url 请求URL
     * @param body 请求体
     * @param config 请求配置
     * @returns Promise<HttpResponse>
     */
    public async put<T = any>(url: string, body?: any, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
        return this.request<T>({
            method: HttpMethod.PUT,
            url,
            body,
            ...config
        });
    }

    /**
     * 发送带认证的 DELETE 请求
     * @param url 请求URL
     * @param config 请求配置
     * @returns Promise<HttpResponse>
     */
    public async delete<T = any>(url: string, config?: HttpRequestConfig): Promise<HttpResponse<T>> {
        return this.request<T>({
            method: HttpMethod.DELETE,
            url,
            ...config
        });
    }

    /**
     * 发送带认证的请求
     * @param options 请求选项
     * @returns Promise<HttpResponse>
     */
    public async request<T = any>(options: {
        method: HttpMethod;
        url: string;
        params?: any;
        body?: any;
        headers?: Record<string, string>;
        timeout?: number;
        responseType?: XMLHttpRequestResponseType;
    }): Promise<HttpResponse<T>> {
        // 自动刷新令牌
        if (this.config.autoRefresh) {
            await this.autoRefreshToken();
        }

        // 添加认证头
        const authHeader = this.getAuthHeader();
        if (authHeader) {
            options.headers = options.headers || {};
            options.headers['Authorization'] = authHeader;
        }

        return this.sendRequest<T>(options);
    }

    /**
     * 发送登录请求
     * @param credentials 登录凭据
     * @returns Promise<HttpResponse>
     */
    public async login(credentials: { username: string; password: string; [key: string]: any }): Promise<HttpResponse> {
        const response = await this.post('/auth/login', credentials);
        
        // 处理登录响应，保存令牌
        if (response.data) {
            this.handleAuthResponse(response.data);
        }
        
        return response;
    }

    /**
     * 发送注册请求
     * @param userData 用户数据
     * @returns Promise<HttpResponse>
     */
    public async register(userData: { username: string; password: string; email?: string; [key: string]: any }): Promise<HttpResponse> {
        const response = await this.post('/auth/register', userData);
        
        // 处理注册响应，保存令牌
        if (response.data) {
            this.handleAuthResponse(response.data);
        }
        
        return response;
    }

    /**
     * 发送登出请求
     * @returns Promise<void>
     */
    public async logout(): Promise<void> {
        try {
            await this.post('/auth/logout');
        } catch (error) {
            console.warn('登出请求失败:', error);
        } finally {
            this.clearTokens();
        }
    }

    /**
     * 刷新访问令牌
     * @returns Promise<string>
     */
    public async refreshToken(): Promise<string> {
        // 如果已经有刷新请求在进行中，返回同一个 Promise
        if (this.refreshPromise) {
            return this.refreshPromise;
        }

        if (!this.refreshTokenValue) {
            throw new Error('没有可用的刷新令牌');
        }

        this.refreshPromise = this.performRefreshToken();

        try {
            const newToken = await this.refreshPromise;
            return newToken;
        } finally {
            this.refreshPromise = null;
        }
    }

    /**
     * 检查令牌是否即将过期
     * @returns boolean
     */
    public isTokenExpiringSoon(): boolean {
        if (!this.token) return false;
        
        try {
            const payload = this.decodeToken(this.token);
            if (!payload || !payload.exp) return false;
            
            const expiryTime = payload.exp * 1000; // 转换为毫秒
            return Date.now() + (this.config.refreshThreshold || 0) >= expiryTime;
        } catch (error) {
            return false;
        }
    }

    /**
     * 获取认证头
     * @returns 认证头字符串
     */
    private getAuthHeader(): string | null {
        return this.token ? `Bearer ${this.token}` : null;
    }

    /**
     * 自动刷新令牌
     * @returns Promise<boolean>
     */
    private async autoRefreshToken(): Promise<boolean> {
        if (this.isTokenExpiringSoon()) {
            try {
                await this.refreshToken();
                return true;
            } catch (error) {
                console.error('自动刷新令牌失败:', error);
                this.config.onRefreshFailed?.();
                return false;
            }
        }
        return false;
    }

    /**
     * 执行刷新令牌请求
     * @returns Promise<string>
     */
    private async performRefreshToken(): Promise<string> {
        try {
            const response = await this.sendRequest({
                method: HttpMethod.POST,
                url: '/auth/refresh',
                body: { refresh_token: this.refreshTokenValue }
            });

            if (response.data) {
                this.handleAuthResponse(response.data);
                return response.data.access_token;
            }

            throw new Error('刷新令牌响应格式错误');
        } catch (error) {
            this.clearTokens();
            this.config.onRefreshFailed?.();
            throw new Error(`刷新令牌失败: ${error instanceof Error ? error.message : '未知错误'}`);
        }
    }

    /**
     * 处理认证响应
     * @param authResponse 认证响应
     */
    private handleAuthResponse(authResponse: any): void {
        if (authResponse.access_token) {
            this.setToken(authResponse.access_token);
        }
        
        if (authResponse.refresh_token) {
            this.setRefreshToken(authResponse.refresh_token);
        }
    }

    /**
     * 发送 HTTP 请求
     * @param options 请求选项
     * @returns Promise<HttpResponse>
     */
    private async sendRequest<T = any>(options: {
        method: HttpMethod;
        url: string;
        params?: any;
        body?: any;
        headers?: Record<string, string>;
        timeout?: number;
        responseType?: XMLHttpRequestResponseType;
    }): Promise<HttpResponse<T>> {
        return new Promise((resolve, reject) => {
            const fullUrl = `${this.config.baseUrl}${options.url}`;
            const http = new FWHttp(fullUrl, {
                method: options.method,
                headers: options.headers,
                timeout: options.timeout,
                responseType: options.responseType
            });

            if (options.params) {
                http.setParams(options.params);
            }

            if (options.body) {
                http.setBody(options.body);
            }

            http.setCallback((error, response) => {
                if (error) {
                    // 检查是否是 401 错误（令牌过期）
                    if (response?.status === 401) {
                        this.config.onTokenExpired?.();
                    }
                    reject(error);
                } else if (response) {
                    resolve(response as HttpResponse<T>);
                } else {
                    reject(new Error('No response received'));
                }
            });

            // 根据方法发送请求
            switch (options.method) {
                case HttpMethod.POST:
                    http.post();
                    break;
                case HttpMethod.PUT:
                    http.put();
                    break;
                case HttpMethod.DELETE:
                    http.delete();
                    break;
                default:
                    http.get();
                    break;
            }
        });
    }

    /**
     * 解码 JWT 令牌
     * @param token JWT 令牌
     * @returns 解码后的载荷
     */
    private decodeToken(token: string): any {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) {
                throw new Error('Invalid JWT format');
            }

            const payload = this.base64UrlDecode(parts[1]);
            return JSON.parse(payload);
        } catch (error) {
            console.error('JWT decode error:', error);
            return null;
        }
    }

    /**
     * Base64 URL 解码
     * @param str Base64 URL 编码的字符串
     * @returns 解码后的字符串
     */
    private base64UrlDecode(str: string): string {
        str += '='.repeat((4 - str.length % 4) % 4);
        str = str.replace(/-/g, '+').replace(/_/g, '/');
        
        try {
            if (typeof atob !== 'undefined') {
                return decodeURIComponent(escape(atob(str)));
            } else if (typeof (globalThis as any).Buffer !== 'undefined') {
                return (globalThis as any).Buffer.from(str, 'base64').toString('utf8');
            } else {
                throw new Error('No base64 decoder available');
            }
        } catch (error) {
            throw new Error('Invalid base64 encoding');
        }
    }

    /**
     * 加载令牌
     */
    private loadTokens(): void {
        this.token = this.loadToken();
        this.refreshTokenValue = this.loadRefreshToken();
    }

    /**
     * 保存令牌
     */
    private saveToken(token: string): void {
        this.saveToStorage(this.config.tokenKey!, token);
    }

    /**
     * 保存刷新令牌
     */
    private saveRefreshToken(refreshToken: string): void {
        this.saveToStorage(this.config.refreshTokenKey!, refreshToken);
    }

    /**
     * 加载令牌
     */
    private loadToken(): string | null {
        return this.loadFromStorage(this.config.tokenKey!);
    }

    /**
     * 加载刷新令牌
     */
    private loadRefreshToken(): string | null {
        return this.loadFromStorage(this.config.refreshTokenKey!);
    }

    /**
     * 删除令牌
     */
    private removeToken(): void {
        this.removeFromStorage(this.config.tokenKey!);
    }

    /**
     * 删除刷新令牌
     */
    private removeRefreshToken(): void {
        this.removeFromStorage(this.config.refreshTokenKey!);
    }

    /**
     * 保存到本地存储
     */
    private saveToStorage(key: string, value: string): void {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(key, value);
            }
        } catch (error) {
            console.warn('Failed to save to localStorage:', error);
        }
    }

    /**
     * 从本地存储加载
     */
    private loadFromStorage(key: string): string | null {
        try {
            if (typeof localStorage !== 'undefined') {
                return localStorage.getItem(key);
            }
        } catch (error) {
            console.warn('Failed to load from localStorage:', error);
        }
        return null;
    }

    /**
     * 从本地存储删除
     */
    private removeFromStorage(key: string): void {
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem(key);
            }
        } catch (error) {
            console.warn('Failed to remove from localStorage:', error);
        }
    }
} 