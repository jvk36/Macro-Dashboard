import { Router, type IRouter } from "express";
import healthRouter from "./health";
import macroRouter from "./macro";

const router: IRouter = Router();

router.use(healthRouter);
router.use(macroRouter);

export default router;
