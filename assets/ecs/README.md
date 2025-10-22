# ECS 框架

## 概述

ECS（Entity-Component-System）是一种游戏开发架构模式，将游戏对象分解为：
- **Entity（实体）**：唯一的标识符
- **Component（组件）**：纯数据结构
- **System（系统）**：处理逻辑

## 目录结构

```
ecs/
├── core/                    # 核心类
│   ├── Entity.ts           # 实体类
│   ├── Component.ts        # 组件基类
│   ├── System.ts           # 系统基类
│   ├── World.ts            # ECS世界
│   ├── Query.ts            # 查询器
│   ├── ComponentManager.ts # 组件管理器
│   ├── EntityManager.ts    # 实体管理器
│   ├── SystemManager.ts    # 系统管理器
│   └── index.ts            # 核心模块导出
├── decorators/             # 装饰器
│   ├── component.ts        # 组件装饰器
│   ├── system.ts           # 系统装饰器
│   └── index.ts            # 装饰器导出
├── types/                  # 类型定义
│   └── index.ts            # 类型导出
├── utils/                  # 工具类
│   ├── ComponentPool.ts    # 组件对象池
│   ├── BitSet.ts           # 位集合
│   └── index.ts            # 工具导出
└── index.ts                # ECS框架总入口
```

## 使用示例

请查看 `assets/test/ecs/` 目录下的示例代码。

## 特性

- ✅ 高性能实体管理
- ✅ 组件对象池
- ✅ 灵活的查询系统
- ✅ 装饰器支持
- ✅ TypeScript 类型安全

