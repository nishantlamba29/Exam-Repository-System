const express = require("express");
const router = express.Router();
const QuestionControllers = require( "../Controllers/QuestionControllers");
const IsAuthenticated = require ( "../Middleware/UserAuth");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post ( "/upload" ,IsAuthenticated , upload.single('image') ,  QuestionControllers.Upload);
router.get ( "/getQuestion" , QuestionControllers.GetQuestion);

module.exports = router;
