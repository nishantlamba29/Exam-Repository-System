const express = require("express");
const router = express.Router();
const UserControllers = require( "../Controllers/UserControllers");

router.post("/signup", UserControllers.Signup);
router.post("/login", UserControllers.Login);
router.post("/login", UserControllers.Login);

module.exports = router;
