"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const dbRouter_1 = require("./router/dbRouter");
const app = (0, express_1.default)();
// 解析 JSON
app.use(body_parser_1.default.json());
// 健康检查
app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});
// 数据库桥接路由
app.use("/db", (0, dbRouter_1.createDbRouter)());
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`SapiDBBridge running at http://127.0.0.1:${PORT}`);
});
