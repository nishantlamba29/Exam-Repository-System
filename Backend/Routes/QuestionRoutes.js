const express = require("express");
const router = express.Router();
const QuestionControllers = require("../Controllers/QuestionControllers");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get("/getQuestion", QuestionControllers.GetQuestion);
router.get("/getPapers", QuestionControllers.GetPapers);
router.post("/uploadPaper", upload.single("file"), QuestionControllers.UploadPaper);

module.exports = router;
