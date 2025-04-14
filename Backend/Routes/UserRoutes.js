const express = require("express");
const router = express.Router();
const UserControllers = require( "../Controllers/UserControllers");

router.post("/signup", UserControllers.Signup);
router.post("/login", UserControllers.Login);
router.post("/unlockAnswer", UserControllers.unlockAnswer);
router.post("/getUnlockedAnswers", UserControllers.getUnlockedAnswers);

module.exports = router;
