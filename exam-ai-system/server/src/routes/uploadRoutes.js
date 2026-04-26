import { Router } from "express";
import {
  listDocuments,
  uploadPastPaper,
  uploadSyllabus,
} from "../controllers/uploadController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { papersUpload, syllabusUpload } from "../middleware/upload.js";

const router = Router();

router.use(requireAuth);
router.get("/", listDocuments);
router.post("/syllabus", syllabusUpload.single("file"), uploadSyllabus);
router.post("/papers", papersUpload.single("file"), uploadPastPaper);

export default router;

