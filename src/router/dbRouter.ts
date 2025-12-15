import { Router, Request, Response } from "express";
import { bridge } from "../bridge";

function sendError(res: Response, err: any, fallback: string) {
  const status = err?.status && Number(err.status) ? Number(err.status) : 500;
  res.status(status).json({ code: status, msg: err?.message || fallback });
}

export function createDbRouter(): Router {
  const router = Router();

  router.post("/insert", async (req: Request, res: Response) => {
    try {
      const result = await bridge.insert(req.body);
      res.json({ code: 0, data: result });
    } catch (err: any) {
      console.error(err);
      sendError(res, err, "insert error");
    }
  });

  router.post("/select", async (req: Request, res: Response) => {
    try {
      const rows = await bridge.select(req.body);
      res.json({ code: 0, data: rows });
    } catch (err: any) {
      console.error(err);
      sendError(res, err, "select error");
    }
  });

  router.post("/getOne", async (req: Request, res: Response) => {
    try {
      const row = await bridge.getOne(req.body);
      res.json({ code: 0, data: row });
    } catch (err: any) {
      console.error(err);
      sendError(res, err, "getOne error");
    }
  });

  router.post("/list", async (req: Request, res: Response) => {
    try {
      const rows = await bridge.list(req.body);
      res.json({ code: 0, data: rows });
    } catch (err: any) {
      console.error(err);
      sendError(res, err, "list error");
    }
  });

  router.post("/batchGet", async (req: Request, res: Response) => {
    try {
      const rows = await bridge.batchGet(req.body);
      res.json({ code: 0, data: rows });
    } catch (err: any) {
      console.error(err);
      sendError(res, err, "batchGet error");
    }
  });

  router.post("/rangeList", async (req: Request, res: Response) => {
    try {
      const rows = await bridge.rangeList(req.body);
      res.json({ code: 0, data: rows });
    } catch (err: any) {
      console.error(err);
      sendError(res, err, "rangeList error");
    }
  });

  router.post("/cursorList", async (req: Request, res: Response) => {
    try {
      const rows = await bridge.cursorList(req.body);
      res.json({ code: 0, data: rows });
    } catch (err: any) {
      console.error(err);
      sendError(res, err, "cursorList error");
    }
  });

  router.post("/deleteOne", async (req: Request, res: Response) => {
    try {
      const result = await bridge.deleteOne(req.body);
      res.json({ code: 0, data: result });
    } catch (err: any) {
      console.error(err);
      sendError(res, err, "deleteOne error");
    }
  });

  router.post("/batchDelete", async (req: Request, res: Response) => {
    try {
      const result = await bridge.batchDelete(req.body);
      res.json({ code: 0, data: result });
    } catch (err: any) {
      console.error(err);
      sendError(res, err, "batchDelete error");
    }
  });

  router.post("/conditionalDelete", async (req: Request, res: Response) => {
    try {
      const result = await bridge.conditionalDelete(req.body);
      res.json({ code: 0, data: result });
    } catch (err: any) {
      console.error(err);
      sendError(res, err, "conditionalDelete error");
    }
  });

  router.post("/update", async (req: Request, res: Response) => {
    try {
      const result = await bridge.update(req.body);
      res.json({ code: 0, data: result });
    } catch (err: any) {
      console.error(err);
      sendError(res, err, "update error");
    }
  });

  router.post("/updateOne", async (req: Request, res: Response) => {
    try {
      const result = await bridge.updateOne(req.body);
      res.json({ code: 0, data: result });
    } catch (err: any) {
      console.error(err);
      sendError(res, err, "updateOne error");
    }
  });

  router.post("/batchUpdate", async (req: Request, res: Response) => {
    try {
      const result = await bridge.batchUpdate(req.body);
      res.json({ code: 0, data: result });
    } catch (err: any) {
      console.error(err);
      sendError(res, err, "batchUpdate error");
    }
  });

  router.post("/conditionalUpdate", async (req: Request, res: Response) => {
    try {
      const result = await bridge.conditionalUpdate(req.body);
      res.json({ code: 0, data: result });
    } catch (err: any) {
      console.error(err);
      sendError(res, err, "conditionalUpdate error");
    }
  });

  router.post("/atomicUpdate", async (req: Request, res: Response) => {
    try {
      const result = await bridge.atomicUpdate(req.body);
      res.json({ code: 0, data: result });
    } catch (err: any) {
      console.error(err);
      sendError(res, err, "atomicUpdate error");
    }
  });

  router.post("/nullUpdate", async (req: Request, res: Response) => {
    try {
      const result = await bridge.nullUpdate(req.body);
      res.json({ code: 0, data: result });
    } catch (err: any) {
      console.error(err);
      sendError(res, err, "nullUpdate error");
    }
  });

  router.post("/delete", async (req: Request, res: Response) => {
    try {
      const result = await bridge.delete(req.body);
      res.json({ code: 0, data: result });
    } catch (err: any) {
      console.error(err);
      sendError(res, err, "delete error");
    }
  });

  return router;
}
