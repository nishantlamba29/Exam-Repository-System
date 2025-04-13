const express = require("express");
const router = express.Router();
const QuestionControllers = require("../Controllers/QuestionControllers");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const IsAuthenticated = require("../Middleware/UserAuth")

router.get("/getQuestion", QuestionControllers.GetQuestion);
router.get("/getPapers", QuestionControllers.GetPapers);
router.post(
  "/uploadPaper",
  upload.single("file"),
  QuestionControllers.UploadPaper
);

// New routes for dashboard notifications and updating browsed courses
router.get("/dashboard", IsAuthenticated, QuestionControllers.GetDashboard);
router.post(
  "/updateBrowsedCourse",
  IsAuthenticated,
  QuestionControllers.UpdateBrowsedCourse
);

module.exports = router;
