const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const HttpError = require ( "../Utils/HttpError");
const User = require("../Models/User");


const Signup = async (req, res, next) => {
  const { Name, Email, Password } = req.body;

   setTimeout( () => console.log("donme"  , 4000));
  try {
    const existingUser = await User.findOne({ Email });
    if (existingUser) {
      return next(new HttpError("User already exists", 422)); // ✅ Safe
    }

    const hashPassword = await bcrypt.hash(Password, 12);
    const newUser = new User({
      Name,
      Email,
      Password: hashPassword,
      Credits: 100,
    });

    await newUser.save();

    const token = jwt.sign({ userId: newUser._id }, "siddharth", { expiresIn: "1h" });

    console.log(newUser);
    res.status(201).json({ userId: newUser._id, token: token });
  } catch (error) {
    console.log(error);
    next(new HttpError("Signup failed, try again later", 500)); // ✅ Safe
  }
};


const Login = async (req, res, next) => {
  const { Email, Password } = req.body;
  console.log( "login");

  try {
    const existingUser = await User.findOne({ Email });
    if (
      !existingUser ||
      !(await bcrypt.compare(Password, existingUser.Password))
    ) {
      return next(new HttpError("Invalid credentials", 403));
    }

    const token = jwt.sign({ userId: existingUser._id }, "siddharth", {
      expiresIn: "1h",
    });

    res.json({ userId: existingUser._id, token: token  , credit : existingUser.Credits});
  } catch (error) {
    next(new HttpError("Login failed, try again later.", 500));
  }
};



exports.Signup = Signup;
exports.Login = Login;

