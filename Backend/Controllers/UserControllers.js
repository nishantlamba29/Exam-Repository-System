const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const HttpError = require("../Utils/HttpError");
const User = require("../Models/User");
const Course = require("../Models/Course");

const Signup = async (req, res, next) => {
  const { Name, Email, Password, referralCode: referralCode, enrolledCourses } = req.body;
  try {
    const existingUser = await User.findOne({ Email });
    if (existingUser) {
      return next(new HttpError("User already exists", 422));
    }
    let credit = 500
    if (referralCode){
      const userReferred = await User.findOne({RefCode:referralCode});
      if (!userReferred){
        return next(new HttpError("User with this referral code doesn't exist.",400))
      }
      credit += 200
      userReferred.Credit+=200
    }
    const hashPassword = await bcrypt.hash(Password, 12);

    // Now assume that enrolledCourses is already an array of valid Course ObjectId strings.
    const newUser = new User({
      Name,
      Email,
      Password: hashPassword,
      Credit: credit,
      enrolledCourses: enrolledCourses || [],
      RefCode: generateReferralCode()
    });

    await newUser.save();

    const token = jwt.sign({ userId: newUser._id }, "mayank", { expiresIn: "1h" });

    console.log(newUser);
    res.status(201).json({ userId: newUser._id, token: token, credit: newUser.Credit, refCode: newUser.RefCode });
  } catch (error) {
    console.log(error);
    next(new HttpError("Signup failed, try again later", 500));
  }
};

const Login = async (req, res, next) => {
  const { Email, Password } = req.body;
  console.log("login");

  try {
    const existingUser = await User.findOne({ Email });
    if (
      !existingUser ||
      !(await bcrypt.compare(Password, existingUser.Password))
    ) {
      return next(new HttpError("Invalid credentials", 403));
    }

    const token = jwt.sign({ userId: existingUser._id }, "mayank", {
      expiresIn: "1h",
    });

    res.json({ userId: existingUser._id, token: token, credit: existingUser.Credit, refCode: existingUser.RefCode });
  } catch (error) {
    next(new HttpError("Login failed, try again later.", 500));
  }
};

function generateReferralCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}


exports.Signup = Signup;
exports.Login = Login;