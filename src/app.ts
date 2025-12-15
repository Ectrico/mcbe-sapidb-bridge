import express from "express";
import bodyParser from "body-parser";
import { createDbRouter } from "./router/dbRouter";

const app = express();

// 解析 JSON
app.use(bodyParser.json());

// 健康检查
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// 数据库桥接路由
app.use("/db", createDbRouter());

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`SapiDBBridge running at http://127.0.0.1:${PORT}`);
});