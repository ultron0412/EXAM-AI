import { Router } from "express";
import {
  analyze,
  downloadAnalysisPdf,
  latestAnalysis,
  predict,
} from "../controllers/predictionController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();
router.use(requireAuth);

router.post("/analyze", analyze);
router.post("/predict", predict);
router.get("/latest", latestAnalysis);
router.get("/:analysisId/download", downloadAnalysisPdf);

export default router;

