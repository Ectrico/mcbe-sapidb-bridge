"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDbRouter = createDbRouter;
const express_1 = require("express");
const bridge_1 = require("../bridge");
function sendError(res, err, fallback) {
    const status = err?.status && Number(err.status) ? Number(err.status) : 500;
    res.status(status).json({ code: status, msg: err?.message || fallback });
}
function createDbRouter() {
    const router = (0, express_1.Router)();
    router.post("/insert", async (req, res) => {
        try {
            const result = await bridge_1.bridge.insert(req.body);
            res.json({ code: 0, data: result });
        }
        catch (err) {
            console.error(err);
            sendError(res, err, "insert error");
        }
    });
    router.post("/select", async (req, res) => {
        try {
            const rows = await bridge_1.bridge.select(req.body);
            res.json({ code: 0, data: rows });
        }
        catch (err) {
            console.error(err);
            sendError(res, err, "select error");
        }
    });
    router.post("/getOne", async (req, res) => {
        try {
            const row = await bridge_1.bridge.getOne(req.body);
            res.json({ code: 0, data: row });
        }
        catch (err) {
            console.error(err);
            sendError(res, err, "getOne error");
        }
    });
    router.post("/list", async (req, res) => {
        try {
            const rows = await bridge_1.bridge.list(req.body);
            res.json({ code: 0, data: rows });
        }
        catch (err) {
            console.error(err);
            sendError(res, err, "list error");
        }
    });
    router.post("/batchGet", async (req, res) => {
        try {
            const rows = await bridge_1.bridge.batchGet(req.body);
            res.json({ code: 0, data: rows });
        }
        catch (err) {
            console.error(err);
            sendError(res, err, "batchGet error");
        }
    });
    router.post("/rangeList", async (req, res) => {
        try {
            const rows = await bridge_1.bridge.rangeList(req.body);
            res.json({ code: 0, data: rows });
        }
        catch (err) {
            console.error(err);
            sendError(res, err, "rangeList error");
        }
    });
    router.post("/cursorList", async (req, res) => {
        try {
            const rows = await bridge_1.bridge.cursorList(req.body);
            res.json({ code: 0, data: rows });
        }
        catch (err) {
            console.error(err);
            sendError(res, err, "cursorList error");
        }
    });
    router.post("/deleteOne", async (req, res) => {
        try {
            const result = await bridge_1.bridge.deleteOne(req.body);
            res.json({ code: 0, data: result });
        }
        catch (err) {
            console.error(err);
            sendError(res, err, "deleteOne error");
        }
    });
    router.post("/batchDelete", async (req, res) => {
        try {
            const result = await bridge_1.bridge.batchDelete(req.body);
            res.json({ code: 0, data: result });
        }
        catch (err) {
            console.error(err);
            sendError(res, err, "batchDelete error");
        }
    });
    router.post("/conditionalDelete", async (req, res) => {
        try {
            const result = await bridge_1.bridge.conditionalDelete(req.body);
            res.json({ code: 0, data: result });
        }
        catch (err) {
            console.error(err);
            sendError(res, err, "conditionalDelete error");
        }
    });
    router.post("/update", async (req, res) => {
        try {
            const result = await bridge_1.bridge.update(req.body);
            res.json({ code: 0, data: result });
        }
        catch (err) {
            console.error(err);
            sendError(res, err, "update error");
        }
    });
    router.post("/updateOne", async (req, res) => {
        try {
            const result = await bridge_1.bridge.updateOne(req.body);
            res.json({ code: 0, data: result });
        }
        catch (err) {
            console.error(err);
            sendError(res, err, "updateOne error");
        }
    });
    router.post("/batchUpdate", async (req, res) => {
        try {
            const result = await bridge_1.bridge.batchUpdate(req.body);
            res.json({ code: 0, data: result });
        }
        catch (err) {
            console.error(err);
            sendError(res, err, "batchUpdate error");
        }
    });
    router.post("/conditionalUpdate", async (req, res) => {
        try {
            const result = await bridge_1.bridge.conditionalUpdate(req.body);
            res.json({ code: 0, data: result });
        }
        catch (err) {
            console.error(err);
            sendError(res, err, "conditionalUpdate error");
        }
    });
    router.post("/atomicUpdate", async (req, res) => {
        try {
            const result = await bridge_1.bridge.atomicUpdate(req.body);
            res.json({ code: 0, data: result });
        }
        catch (err) {
            console.error(err);
            sendError(res, err, "atomicUpdate error");
        }
    });
    router.post("/nullUpdate", async (req, res) => {
        try {
            const result = await bridge_1.bridge.nullUpdate(req.body);
            res.json({ code: 0, data: result });
        }
        catch (err) {
            console.error(err);
            sendError(res, err, "nullUpdate error");
        }
    });
    router.post("/delete", async (req, res) => {
        try {
            const result = await bridge_1.bridge.delete(req.body);
            res.json({ code: 0, data: result });
        }
        catch (err) {
            console.error(err);
            sendError(res, err, "delete error");
        }
    });
    return router;
}
