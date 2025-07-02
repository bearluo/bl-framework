# 网络模块使用说明

本模块提供了两种 HTTP 客户端实现：

## 1. FWHttp (基于 XMLHttpRequest)

传统的 HTTP 客户端，基于 XMLHttpRequest 实现。

### 基础使用

```typescript
import { FWHttp } from './FWHttp';

// GET 请求
FWHttp.get('https://api.example.com/users', { page: 1 }, (error, response) => {
    if (error) {
        console.error('请求失败:', error.message);
    } else {
        console.log('请求成功:', response.data);
    }
});

// POST 请求
FWHttp.post('https://api.example.com/users', { name: '张三' }, (error, response) => {
    if (error) {
        console.error('请求失败:', error.message);
    } else {
        console.log('请求成功:', response.data);
    }
});
```

## 2. FWAxios (基于 Axios) ⭐ 推荐

现代化的 HTTP 客户端，基于 axios 实现，提供更好的功能和类型支持。

### 安装依赖

```bash
npm install axios
```

### 基础使用

```typescript
import { http } from './FWAxios';

// GET 请求
try {
    const response = await http.get('https://api.example.com/users', { page: 1 });
    console.log('请求成功:', response.data);
} catch (error) {
    console.error('请求失败:', error.message);
}

// POST 请求
try {
    const response = await http.post('https://api.example.com/users', { name: '张三' });
    console.log('请求成功:', response.data);
} catch (error) {
    console.error('请求失败:', error.message);
}
```

### 创建自定义实例

```typescript
import { FWAxios } from './FWAxios';

const customAxios = new FWAxios('https://api.example.com', {
    timeout: 15000,
    showLoading: true,
    showError: true,
    retryCount: 3,
    retryDelay: 2000
});

// 添加拦截器
customAxios.addRequestInterceptor((config) => {
    config.headers.Authorization = 'Bearer your-token';
    return config;
});

const response = await customAxios.get('/users/profile');
```

### 文件上传

```typescript
import { http } from './FWAxios';
import { FWFormData } from './FWHttp';

const formData = new FWFormData();
formData.append('file', fileContent, 'example.txt');
formData.append('description', '这是一个示例文件');

const response = await http.upload('https://api.example.com/upload', formData);
```

### 错误处理

```typescript
try {
    const response = await http.get('https://api.example.com/data');
    console.log('请求成功:', response.data);
} catch (error) {
    switch (error.code) {
        case 'NETWORK_ERROR':
            console.log('网络连接失败');
            break;
        case 'HTTP_404':
            console.log('资源不存在');
            break;
        default:
            console.log('其他错误:', error.message);
    }
}
```

## 主要特性对比

| 特性 | FWHttp | FWAxios |
|------|--------|---------|
| 现代化 API | ❌ | ✅ |
| Promise 支持 | ❌ | ✅ |
| TypeScript 支持 | 基础 | 完整 |
| 自动重试 | ❌ | ✅ |
| 拦截器系统 | ❌ | ✅ |
| 文件上传 | ✅ | ✅ |
| 错误处理 | 基础 | 完善 |
| 并发请求 | ❌ | ✅ |

## 推荐使用

- **新项目**: 推荐使用 FWAxios
- **现有项目**: 可以继续使用 FWHttp，或逐步迁移到 FWAxios

## 更多信息

详细的使用说明请参考：
- [FWAxios 详细文档](./FWAxios_README.md)
- [使用示例](./FWAxiosExample.ts)
- [测试文件](../../../assets/test/FWAxiosTest.ts) 