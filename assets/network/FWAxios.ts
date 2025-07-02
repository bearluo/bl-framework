import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'ccc-axios';
import { FWFormData } from 'db://bl-framework/network';


/** HTTP 请求方法枚举 */
export enum AxiosHttpMethod {
    GET = 'GET',
    POST = 'POST',
    PUT = 'PUT',
    DELETE = 'DELETE',
    PATCH = 'PATCH',
    HEAD = 'HEAD',
    OPTIONS = 'OPTIONS'
}

/** 扩展的请求配置接口 */
export interface RequestConfig extends AxiosRequestConfig {
    /** 是否显示加载提示 */
    showLoading?: boolean;
    /** 加载提示文本 */
    loadingText?: string;
    /** 是否显示错误提示 */
    showError?: boolean;
    /** 错误提示文本 */
    errorText?: string;
    /** 重试次数 */
    retryCount?: number;
    /** 重试延迟（毫秒） */
    retryDelay?: number;
    /** 请求拦截器 */
    requestInterceptor?: (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>;
    /** 响应拦截器 */
    responseInterceptor?: (response: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>;
}

/** 内部请求配置类型 */
export interface InternalRequestConfig extends InternalAxiosRequestConfig {
    showLoading?: boolean;
    loadingText?: string;
    showError?: boolean;
    errorText?: string;
    retryCount?: number;
    retryDelay?: number;
    _retryCount?: number;
}

/** 响应数据接口 */
export interface ResponseData<T = any> {
    /** 响应数据 */
    data: T;
    /** 状态码 */
    status: number;
    /** 状态文本 */
    statusText: string;
    /** 响应头 */
    headers: Record<string, string>;
    /** 请求URL */
    url: string;
    /** 是否成功 */
    success: boolean;
    /** 错误信息 */
    message?: string;
}

/** 请求错误接口 */
export interface RequestError {
    /** 错误码 */
    code: string;
    /** 错误信息 */
    message: string;
    /** 原始错误 */
    originalError?: any;
}

/**
 * FWAxios - 基于 axios 的二次封装
 * 提供统一的请求/响应拦截、错误处理、重试机制等功能
 */
export class FWAxios {
    /** axios 实例 */
    private instance: AxiosInstance;
    
    /** 基础配置 */
    private baseConfig: RequestConfig;
    
    /** 请求拦截器 */
    private requestInterceptors: Array<(config: InternalRequestConfig) => InternalRequestConfig | Promise<InternalRequestConfig>> = [];
    
    /** 响应拦截器 */
    private responseInterceptors: Array<(response: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>> = [];
    
    /** 错误拦截器 */
    private errorInterceptors: Array<(error: AxiosError) => any> = [];

    /**
     * 构造函数
     * @param baseURL 基础URL
     * @param config 基础配置
     */
    constructor(baseURL: string = '', config: RequestConfig = {}) {
        this.baseConfig = {
            timeout: 10000,
            withCredentials: false,
            showLoading: false,
            showError: true,
            retryCount: 0,
            retryDelay: 1000,
            ...config
        };

        this.instance = axios.create({
            baseURL,
            timeout: this.baseConfig.timeout,
            withCredentials: this.baseConfig.withCredentials,
            headers: {
                'Content-Type': 'application/json',
                ...this.baseConfig.headers
            }
        });

        this.setupInterceptors();
    }

    /**
     * 设置拦截器
     */
    private setupInterceptors(): void {
        // 请求拦截器
        this.instance.interceptors.request.use(
            (config) => {
                const internalConfig = config as InternalRequestConfig;
                
                // 显示加载提示
                if (internalConfig.showLoading) {
                    this.showLoading(internalConfig.loadingText);
                }

                // 执行自定义请求拦截器
                for (const interceptor of this.requestInterceptors) {
                    const result = interceptor(internalConfig);
                    if (result instanceof Promise) {
                        return result;
                    } else {
                        Object.assign(internalConfig, result);
                    }
                }

                return internalConfig;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        // 响应拦截器
        this.instance.interceptors.response.use(
            (response) => {
                const internalConfig = response.config as InternalRequestConfig;
                
                // 隐藏加载提示
                if (internalConfig.showLoading) {
                    this.hideLoading();
                }

                // 执行自定义响应拦截器
                for (const interceptor of this.responseInterceptors) {
                    const result = interceptor(response);
                    if (result instanceof Promise) {
                        return result;
                    } else {
                        Object.assign(response, result);
                    }
                }

                return response;
            },
            (error: AxiosError) => {
                const internalConfig = error.config as InternalRequestConfig;
                
                // 隐藏加载提示
                if (internalConfig?.showLoading) {
                    this.hideLoading();
                }

                // 处理重试逻辑
                const retryCount = internalConfig?.retryCount || this.baseConfig.retryCount || 0;
                const retryDelay = internalConfig?.retryDelay || this.baseConfig.retryDelay || 1000;
                
                if (retryCount > 0 && internalConfig) {
                    const currentRetryCount = internalConfig._retryCount || 0;
                    if (currentRetryCount < retryCount) {
                        internalConfig._retryCount = currentRetryCount + 1;
                        
                        return new Promise(resolve => {
                            setTimeout(() => {
                                resolve(this.instance.request(internalConfig));
                            }, retryDelay);
                        });
                    }
                }

                // 执行错误拦截器
                for (const interceptor of this.errorInterceptors) {
                    const result = interceptor(error);
                    if (result !== undefined) {
                        return Promise.resolve(result);
                    }
                }

                // 显示错误提示
                if (internalConfig?.showError !== false) {
                    this.showError(this.getErrorMessage(error));
                }

                return Promise.reject(this.formatError(error));
            }
        );
    }

    /**
     * 添加请求拦截器
     * @param interceptor 拦截器函数
     */
    public addRequestInterceptor(interceptor: (config: InternalRequestConfig) => InternalRequestConfig | Promise<InternalRequestConfig>): void {
        this.requestInterceptors.push(interceptor);
    }

    /**
     * 添加响应拦截器
     * @param interceptor 拦截器函数
     */
    public addResponseInterceptor(interceptor: (response: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>): void {
        this.responseInterceptors.push(interceptor);
    }

    /**
     * 添加错误拦截器
     * @param interceptor 拦截器函数
     */
    public addErrorInterceptor(interceptor: (error: AxiosError) => any): void {
        this.errorInterceptors.push(interceptor);
    }

    /**
     * 发送请求
     * @param config 请求配置
     * @returns Promise<ResponseData>
     */
    public async request<T = any>(config: RequestConfig): Promise<ResponseData<T>> {
        try {
            const response = await this.instance.request(config);
            return this.formatResponse<T>(response);
        } catch (error) {
            throw this.formatError(error as AxiosError);
        }
    }

    /**
     * GET 请求
     * @param url 请求URL
     * @param params 查询参数
     * @param config 请求配置
     * @returns Promise<ResponseData>
     */
    public async get<T = any>(url: string, params?: any, config: RequestConfig = {}): Promise<ResponseData<T>> {
        return this.request<T>({
            method: AxiosHttpMethod.GET,
            url,
            params,
            ...config
        });
    }

    /**
     * POST 请求
     * @param url 请求URL
     * @param data 请求数据
     * @param config 请求配置
     * @returns Promise<ResponseData>
     */
    public async post<T = any>(url: string, data?: any, config: RequestConfig = {}): Promise<ResponseData<T>> {
        return this.request<T>({
            method: AxiosHttpMethod.POST,
            url,
            data,
            ...config
        });
    }

    /**
     * PUT 请求
     * @param url 请求URL
     * @param data 请求数据
     * @param config 请求配置
     * @returns Promise<ResponseData>
     */
    public async put<T = any>(url: string, data?: any, config: RequestConfig = {}): Promise<ResponseData<T>> {
        return this.request<T>({
            method: AxiosHttpMethod.PUT,
            url,
            data,
            ...config
        });
    }

    /**
     * DELETE 请求
     * @param url 请求URL
     * @param config 请求配置
     * @returns Promise<ResponseData>
     */
    public async delete<T = any>(url: string, config: RequestConfig = {}): Promise<ResponseData<T>> {
        return this.request<T>({
            method: AxiosHttpMethod.DELETE,
            url,
            ...config
        });
    }

    /**
     * PATCH 请求
     * @param url 请求URL
     * @param data 请求数据
     * @param config 请求配置
     * @returns Promise<ResponseData>
     */
    public async patch<T = any>(url: string, data?: any, config: RequestConfig = {}): Promise<ResponseData<T>> {
        return this.request<T>({
            method: AxiosHttpMethod.PATCH,
            url,
            data,
            ...config
        });
    }

    /**
     * 文件上传
     * @param url 请求URL
     * @param formData 表单数据
     * @param config 请求配置
     * @returns Promise<ResponseData>
     */
    public async upload<T = any>(url: string, formData: FWFormData | FormData, config: RequestConfig = {}): Promise<ResponseData<T>> {
        let data: any;
        let headers: any = {};

        if (formData instanceof FWFormData) {
            data = formData.arrayBuffer;
            headers['Content-Type'] = `multipart/form-data; boundary=${formData.boundary_key}`;
        } else {
            data = formData;
        }

        return this.request<T>({
            method: AxiosHttpMethod.POST,
            url,
            data,
            headers: {
                ...headers,
                ...config.headers
            },
            ...config
        });
    }

    /**
     * 下载文件
     * @param url 请求URL
     * @param config 请求配置
     * @returns Promise<Blob>
     */
    public async download(url: string, config: RequestConfig = {}): Promise<Blob> {
        const response = await this.instance.request({
            method: AxiosHttpMethod.GET,
            url,
            responseType: 'blob',
            ...config
        });
        return response.data;
    }

    /**
     * 格式化响应数据
     * @param response axios响应
     * @returns ResponseData
     */
    private formatResponse<T>(response: AxiosResponse): ResponseData<T> {
        return {
            data: response.data,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers as Record<string, string>,
            url: response.config.url || '',
            success: true
        };
    }

    /**
     * 格式化错误信息
     * @param error axios错误
     * @returns RequestError
     */
    private formatError(error: AxiosError): RequestError {
        let code = 'UNKNOWN_ERROR';
        let message = '未知错误';

        if (error.response) {
            // 服务器响应了错误状态码
            code = `HTTP_${error.response.status}`;
            message = error.response.statusText || `HTTP ${error.response.status} 错误`;
        } else if (error.request) {
            // 请求已发出但没有收到响应
            code = 'NETWORK_ERROR';
            message = '网络连接失败';
        } else {
            // 请求配置出错
            code = 'REQUEST_ERROR';
            message = error.message || '请求配置错误';
        }

        return {
            code,
            message,
            originalError: error
        };
    }

    /**
     * 获取错误信息
     * @param error axios错误
     * @returns 错误信息字符串
     */
    private getErrorMessage(error: AxiosError): string {
        if (error.response) {
            return `请求失败: ${error.response.status} ${error.response.statusText}`;
        } else if (error.request) {
            return '网络连接失败，请检查网络设置';
        } else {
            return error.message || '请求失败';
        }
    }

    /**
     * 显示加载提示
     * @param text 提示文本
     */
    private showLoading(text?: string): void {
        // 这里可以集成您的加载提示组件
        console.log('显示加载提示:', text || '加载中...');
    }

    /**
     * 隐藏加载提示
     */
    private hideLoading(): void {
        // 这里可以集成您的加载提示组件
        console.log('隐藏加载提示');
    }

    /**
     * 显示错误提示
     * @param message 错误信息
     */
    private showError(message: string): void {
        // 这里可以集成您的错误提示组件
        console.error('显示错误提示:', message);
    }

    /**
     * 设置默认请求头
     * @param headers 请求头
     */
    public setDefaultHeaders(headers: Record<string, string>): void {
        this.instance.defaults.headers.common = {
            ...this.instance.defaults.headers.common,
            ...headers
        };
    }

    /**
     * 设置认证token
     * @param token 认证token
     */
    public setAuthToken(token: string): void {
        this.setDefaultHeaders({
            'Authorization': `Bearer ${token}`
        });
    }

    /**
     * 清除认证token
     */
    public clearAuthToken(): void {
        delete this.instance.defaults.headers.common['Authorization'];
    }

    /**
     * 获取axios实例
     * @returns AxiosInstance
     */
    public getInstance(): AxiosInstance {
        return this.instance;
    }

    /**
     * 取消请求
     * @param requestId 请求ID
     */
    public cancelRequest(requestId: string): void {
        // 这里可以实现请求取消逻辑
        console.log('取消请求:', requestId);
    }
}

/**
 * 创建默认的 FWAxios 实例
 */
export const defaultAxios = new FWAxios();

/**
 * 便捷的请求方法
 */
export const http = {
    get: <T = any>(url: string, params?: any, config?: RequestConfig) => defaultAxios.get<T>(url, params, config),
    post: <T = any>(url: string, data?: any, config?: RequestConfig) => defaultAxios.post<T>(url, data, config),
    put: <T = any>(url: string, data?: any, config?: RequestConfig) => defaultAxios.put<T>(url, data, config),
    delete: <T = any>(url: string, config?: RequestConfig) => defaultAxios.delete<T>(url, config),
    patch: <T = any>(url: string, data?: any, config?: RequestConfig) => defaultAxios.patch<T>(url, data, config),
    upload: <T = any>(url: string, formData: FWFormData | FormData, config?: RequestConfig) => defaultAxios.upload<T>(url, formData, config),
    download: (url: string, config?: RequestConfig) => defaultAxios.download(url, config)
}; 