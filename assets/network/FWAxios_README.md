# FWAxios - 基于 Axios 的二次封装

FWAxios 是一个基于 axios 的现代化 HTTP 客户端封装，提供了统一的请求/响应拦截、错误处理、重试机制等功能，让 HTTP 请求更加简单和可靠。

## 特性

- 🚀 **现代化 API**: 基于 Promise 和 async/await 的现代化接口
- 🔄 **自动重试**: 支持请求失败自动重试机制
- 🛡️ **统一错误处理**: 统一的错误格式和处理机制
- 📤 **文件上传**: 支持文件上传和下载
- 🔐 **认证管理**: 内置 token 认证管理
- 🎯 **拦截器系统**: 灵活的请求/响应/错误拦截器
- 📱 **加载提示**: 内置加载状态管理
- 🔧 **类型安全**: 完整的 TypeScript 类型支持

## 安装依赖

```bash
npm install axios
```

## 基础使用

### 1. 导入模块

```typescript
import { FWAxios, http, defaultAxios } from './FWAxios';
```

### 2. 简单请求

```typescript
// GET 请求
const response = await http.get('https://api.example.com/users', { page: 1, limit: 10 });
console.log(response.data);

// POST 请求
const response = await http.post('https://api.example.com/users', {
    name: '张三',
    email: 'zhangsan@example.com'
});
console.log(response.data);
```

### 3. 创建自定义实例

```typescript
const customAxios = new FWAxios('https://api.example.com', {
    timeout: 15000,
    showLoading: true,
    showError: true,
    retryCount: 3,
    retryDelay: 2000,
    headers: {
        'X-Custom-Header': 'custom-value'
    }
});

const response = await customAxios.get('/users/profile');
```

## 配置选项

### RequestConfig 接口

```typescript
interface RequestConfig extends AxiosRequestConfig {
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
}
```

### 默认配置

```typescript
const defaultConfig = {
    timeout: 10000,
    withCredentials: false,
    showLoading: false,
    showError: true,
    retryCount: 0,
    retryDelay: 1000
};
```

## API 方法

### 基础请求方法

```typescript
// GET 请求
http.get<T>(url: string, params?: any, config?: RequestConfig): Promise<ResponseData<T>>

// POST 请求
http.post<T>(url: string, data?: any, config?: RequestConfig): Promise<ResponseData<T>>

// PUT 请求
http.put<T>(url: string, data?: any, config?: RequestConfig): Promise<ResponseData<T>>

// DELETE 请求
http.delete<T>(url: string, config?: RequestConfig): Promise<ResponseData<T>>

// PATCH 请求
http.patch<T>(url: string, data?: any, config?: RequestConfig): Promise<ResponseData<T>>
```

### 文件操作

```typescript
// 文件上传
http.upload<T>(url: string, formData: FWFormData | FormData, config?: RequestConfig): Promise<ResponseData<T>>

// 文件下载
http.download(url: string, config?: RequestConfig): Promise<Blob>
```

### 实例方法

```typescript
// 设置默认请求头
customAxios.setDefaultHeaders(headers: Record<string, string>): void

// 设置认证token
customAxios.setAuthToken(token: string): void

// 清除认证token
customAxios.clearAuthToken(): void

// 添加请求拦截器
customAxios.addRequestInterceptor(interceptor: Function): void

// 添加响应拦截器
customAxios.addResponseInterceptor(interceptor: Function): void

// 添加错误拦截器
customAxios.addErrorInterceptor(interceptor: Function): void
```

## 拦截器使用

### 请求拦截器

```typescript
customAxios.addRequestInterceptor((config) => {
    console.log('发送请求:', config.url);
    
    // 添加认证token
    config.headers.Authorization = `Bearer ${getToken()}`;
    
    // 添加时间戳
    config.headers['X-Request-Time'] = Date.now().toString();
    
    return config;
});
```

### 响应拦截器

```typescript
customAxios.addResponseInterceptor((response) => {
    console.log('收到响应:', response.status);
    
    // 处理响应数据
    if (response.data.code === 0) {
        return response;
    } else {
        throw new Error(response.data.message);
    }
});
```

### 错误拦截器

```typescript
customAxios.addErrorInterceptor((error) => {
    console.log('请求错误:', error.message);
    
    // 处理特定错误
    if (error.response?.status === 401) {
        // 跳转到登录页面
        redirectToLogin();
        return Promise.resolve({ data: null, status: 401 });
    }
    
    // 返回 undefined 继续默认错误处理
    return undefined;
});
```

## 错误处理

### 错误类型

```typescript
interface RequestError {
    code: string;        // 错误码
    message: string;     // 错误信息
    originalError?: any; // 原始错误
}
```

### 错误码说明

- `NETWORK_ERROR`: 网络连接失败
- `HTTP_404`: 请求的资源不存在
- `HTTP_500`: 服务器内部错误
- `REQUEST_ERROR`: 请求配置错误
- `UNKNOWN_ERROR`: 未知错误

### 错误处理示例

```typescript
try {
    const response = await http.get('https://api.example.com/data');
    console.log('请求成功:', response.data);
} catch (error) {
    const requestError = error as RequestError;
    
    switch (requestError.code) {
        case 'NETWORK_ERROR':
            console.log('网络连接失败，请检查网络设置');
            break;
        case 'HTTP_404':
            console.log('请求的资源不存在');
            break;
        case 'HTTP_500':
            console.log('服务器内部错误');
            break;
        default:
            console.log('其他错误:', requestError.message);
    }
}
```

## 文件上传

### 使用自定义 FormData

```typescript
import { FWFormData } from './FWHttp';

const formData = new FWFormData();
formData.append('file', fileContent, 'example.txt');
formData.append('description', '这是一个示例文件');

const response = await http.upload('https://api.example.com/upload', formData, {
    showLoading: true,
    loadingText: '文件上传中...'
});
```

### 使用浏览器 FormData

```typescript
const formData = new FormData();
formData.append('file', file);
formData.append('description', '这是一个示例文件');

const response = await http.upload('https://api.example.com/upload', formData);
```

## 文件下载

```typescript
const blob = await http.download('https://api.example.com/files/document.pdf', {
    showLoading: true,
    loadingText: '文件下载中...'
});

// 创建下载链接
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'document.pdf';
a.click();

// 清理URL对象
URL.revokeObjectURL(url);
```

## 认证管理

### 设置认证Token

```typescript
// 设置全局认证token
defaultAxios.setAuthToken('your-jwt-token-here');

// 或者设置自定义实例的认证token
customAxios.setAuthToken('your-jwt-token-here');
```

### 清除认证Token

```typescript
// 清除全局认证token
defaultAxios.clearAuthToken();

// 或者清除自定义实例的认证token
customAxios.clearAuthToken();
```

## 并发请求

```typescript
// 并发发送多个请求
const promises = [
    http.get('https://api.example.com/users'),
    http.get('https://api.example.com/posts'),
    http.get('https://api.example.com/comments')
];

const results = await Promise.all(promises);

console.log('用户数据:', results[0].data);
console.log('文章数据:', results[1].data);
console.log('评论数据:', results[2].data);
```

## 响应数据格式

```typescript
interface ResponseData<T = any> {
    data: T;                    // 响应数据
    status: number;             // 状态码
    statusText: string;         // 状态文本
    headers: Record<string, string>; // 响应头
    url: string;                // 请求URL
    success: boolean;           // 是否成功
    message?: string;           // 错误信息
}
```

## 最佳实践

### 1. 创建统一的API客户端

```typescript
// api-client.ts
import { FWAxios } from './FWAxios';

class ApiClient {
    private axios: FWAxios;
    
    constructor() {
        this.axios = new FWAxios('https://api.example.com', {
            timeout: 10000,
            showLoading: true,
            showError: true,
            retryCount: 2
        });
        
        this.setupInterceptors();
    }
    
    private setupInterceptors() {
        // 请求拦截器
        this.axios.addRequestInterceptor((config) => {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        });
        
        // 响应拦截器
        this.axios.addResponseInterceptor((response) => {
            if (response.data.code === 0) {
                return response;
            } else {
                throw new Error(response.data.message);
            }
        });
        
        // 错误拦截器
        this.axios.addErrorInterceptor((error) => {
            if (error.response?.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/login';
            }
        });
    }
    
    // API 方法
    async getUsers(params?: any) {
        return this.axios.get('/users', params);
    }
    
    async createUser(data: any) {
        return this.axios.post('/users', data);
    }
    
    async updateUser(id: string, data: any) {
        return this.axios.put(`/users/${id}`, data);
    }
    
    async deleteUser(id: string) {
        return this.axios.delete(`/users/${id}`);
    }
}

export const apiClient = new ApiClient();
```

### 2. 使用示例

```typescript
// 使用统一的API客户端
import { apiClient } from './api-client';

// 获取用户列表
const users = await apiClient.getUsers({ page: 1, limit: 10 });

// 创建新用户
const newUser = await apiClient.createUser({
    name: '张三',
    email: 'zhangsan@example.com'
});

// 更新用户
const updatedUser = await apiClient.updateUser('123', {
    name: '李四'
});

// 删除用户
await apiClient.deleteUser('123');
```

## 注意事项

1. **依赖要求**: 需要安装 `axios` 依赖
2. **浏览器兼容性**: 支持现代浏览器，需要支持 Promise 和 async/await
3. **错误处理**: 建议始终使用 try-catch 包装请求
4. **类型安全**: 使用 TypeScript 可以获得更好的类型提示
5. **性能考虑**: 合理使用重试机制，避免无限重试

## 更新日志

### v1.0.0
- 初始版本发布
- 支持基础的 HTTP 请求方法
- 支持请求/响应/错误拦截器
- 支持自动重试机制
- 支持文件上传和下载
- 支持认证token管理
- 完整的 TypeScript 类型支持 