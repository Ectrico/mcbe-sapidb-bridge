import { Router, Request, Response } from "express";
import { bridge } from "../bridge";
import { logOperation } from "../logger";

function sendError(res: Response, err: any, fallback: string) {
  const status = err?.status && Number(err.status) ? Number(err.status) : 500;
  res.status(status).json({ code: status, msg: err?.message || fallback });
}

type RouteHandler<T> = (body: any) => Promise<T>;

function createRoute<T>(action: string, handler: RouteHandler<T>) {
  const fallback = `${action} error`;
  return async (req: Request, res: Response) => {
    const payload = req.body;
    try {
      const result = await handler(payload);
      res.json({ code: 0, data: result });
      logOperation({
        action,
        status: "success",
        detail: { url: req.originalUrl, body: payload }
      });
    } catch (err: any) {
      console.error(err);
      logOperation({
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

export function createDbRouter(): Router {
  const router = Router();

  router.post("/insert", createRoute("insert", body => bridge.insert(body)));

  router.post("/select", createRoute("select", body => bridge.select(body)));

  router.post("/getOne", createRoute("getOne", body => bridge.getOne(body)));

  router.post("/list", createRoute("list", body => bridge.list(body)));

  router.post("/batchGet", createRoute("batchGet", body => bridge.batchGet(body)));

  router.post("/rangeList", createRoute("rangeList", body => bridge.rangeList(body)));

  router.post("/cursorList", createRoute("cursorList", body => bridge.cursorList(body)));

  router.post("/deleteOne", createRoute("deleteOne", body => bridge.deleteOne(body)));

  router.post("/batchDelete", createRoute("batchDelete", body => bridge.batchDelete(body)));

  router.post("/conditionalDelete", createRoute("conditionalDelete", body => bridge.conditionalDelete(body)));

  router.post("/update", createRoute("update", body => bridge.update(body)));

  router.post("/updateOne", createRoute("updateOne", body => bridge.updateOne(body)));

  router.post("/batchUpdate", createRoute("batchUpdate", body => bridge.batchUpdate(body)));

  router.post("/conditionalUpdate", createRoute("conditionalUpdate", body => bridge.conditionalUpdate(body)));

  router.post("/atomicUpdate", createRoute("atomicUpdate", body => bridge.atomicUpdate(body)));

  router.post("/nullUpdate", createRoute("nullUpdate", body => bridge.nullUpdate(body)));

  router.post("/delete", createRoute("delete", body => bridge.delete(body)));

  return router;
}
