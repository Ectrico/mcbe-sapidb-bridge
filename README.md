# SapiDBBridge
一个轻量的 HTTP → MySQL 桥接服务，支持 CRUD、批量操作、范围/游标查询，默认软删除，并带基础校验与错误码分层。

## 快速开始
```bash
# 安装依赖
npm install

# 开发运行（使用 tsx + nodemon）
npm run dev

# 构建 & 生产运行
npm run build
npm start
```

## 配置
在项目根目录创建 `.env`（示例）：
```
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=test

# 可选：批量/受限操作上限与白名单
BATCH_DELETE_MAX=200
CONDITIONAL_DELETE_WHITELIST=logs,audit_log
CONDITIONAL_DELETE_LIMIT=100
BATCH_UPDATE_MAX=200
CONDITIONAL_UPDATE_WHITELIST=logs,audit_log
CONDITIONAL_UPDATE_LIMIT=100
```

## 主要接口
- 健康检查：`GET /health`
- CRUD：`/db/insert`、`/db/select`、`/db/update`、`/db/delete`（默认软删，需 `physical:true` 才物理删除）
- 查询增强：`/db/getOne`、`/db/list`、`/db/batchGet`、`/db/rangeList`、`/db/cursorList`
- 更新增强：`/db/updateOne`、`/db/batchUpdate`、`/db/conditionalUpdate`、`/db/atomicUpdate`（自增/自减）、`/db/nullUpdate`
- 删除增强：`/db/deleteOne`、`/db/batchDelete`、`/db/conditionalDelete`
- where 语法：等值、`IN`、范围（`gt/gte/lt/lte`）、`BETWEEN`；AND 组合，不支持 OR

详细参数/示例见 `API_DOC.md`。

## 错误码
- `400` 参数不合法：表/字段名非法、必填缺失、where 为空、批量 values 超上限等。
- `403` 禁止操作：不在白名单的表、受限接口被拒绝、物理删除禁用等。
- `500` 服务端错误：数据库执行异常或未捕获异常。
- 返回格式：`{ "code": <错误码>, "msg": "<错误信息>" }`

## 开发提示
- 软删除默认字段 `deleted_at`，可在请求里用 `softDeleteField`/`softDeleteValue` 覆盖，或显式 `physical:true` 进行物理删除（谨慎）。
- `conditional*` 接口需要表在白名单且强制 limit（可用 env 调整）。
- 代码位置：入口 `src/app.ts`，路由 `src/router/dbRouter.ts`，数据库与 where 逻辑在 `src/bridge/`。
