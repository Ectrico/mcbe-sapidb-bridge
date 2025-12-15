"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDbRouter = createDbRouter;
const express_1 = require("express");
const bridge_1 = require("../bridge");
const logger_1 = require("../logger");
function sendError(res, err, fallback) {
    const status = err?.status && Number(err.status) ? Number(err.status) : 500;
    res.status(status).json({ code: status, msg: err?.message || fallback });
}
function createRoute(action, handler) {
    const fallback = `${action} error`;
    return async (req, res) => {
        const payload = req.body;
        try {
            const result = await handler(payload);
            res.json({ code: 0, data: result });
            (0, logger_1.logOperation)({
                action,
                status: "success",
                detail: { url: req.originalUrl, body: payload }
            });
        }
        catch (err) {
            console.error(err);
            (0, logger_1.logOperation)({
                action,
                level: "ERROR",
                status: "failed",
                message: err?.message || fallback,
                detail: { url: req.originalUrl, body: payload }
            });
            sendError(res, err, fallback);
        }
    };
}
function createDbRouter() {
    const router = (0, express_1.Router)();
    router.post("/insert", createRoute("insert", body => bridge_1.bridge.insert(body)));
    router.post("/select", createRoute("select", body => bridge_1.bridge.select(body)));
    router.post("/getOne", createRoute("getOne", body => bridge_1.bridge.getOne(body)));
    router.post("/list", createRoute("list", body => bridge_1.bridge.list(body)));
    router.post("/batchGet", createRoute("batchGet", body => bridge_1.bridge.batchGet(body)));
    router.post("/rangeList", createRoute("rangeList", body => bridge_1.bridge.rangeList(body)));
    router.post("/cursorList", createRoute("cursorList", body => bridge_1.bridge.cursorList(body)));
    router.post("/deleteOne", createRoute("deleteOne", body => bridge_1.bridge.deleteOne(body)));
    router.post("/batchDelete", createRoute("batchDelete", body => bridge_1.bridge.batchDelete(body)));
    router.post("/conditionalDelete", createRoute("conditionalDelete", body => bridge_1.bridge.conditionalDelete(body)));
    router.post("/update", createRoute("update", body => bridge_1.bridge.update(body)));
    router.post("/updateOne", createRoute("updateOne", body => bridge_1.bridge.updateOne(body)));
    router.post("/batchUpdate", createRoute("batchUpdate", body => bridge_1.bridge.batchUpdate(body)));
    router.post("/conditionalUpdate", createRoute("conditionalUpdate", body => bridge_1.bridge.conditionalUpdate(body)));
    router.post("/atomicUpdate", createRoute("atomicUpdate", body => bridge_1.bridge.atomicUpdate(body)));
    router.post("/nullUpdate", createRoute("nullUpdate", body => bridge_1.bridge.nullUpdate(body)));
    router.post("/delete", createRoute("delete", body => bridge_1.bridge.delete(body)));
    return router;
}
