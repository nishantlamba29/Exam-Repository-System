const HttpError = require("../Utils/HttpError");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const User = require("../Models/User");

const MakePayment = async (req, res, next) => {
  try {
    const razorpay = new Razorpay({
      key_id: "rzp_test_pBjWhXmDvQr9bP",
      key_secret: "ybweIYliMpnJPCHgWSdfM66q",
    });

    const options = req.body;
    const order = await razorpay.orders.create(options);
    if (!order)  throw next ( new HttpError ( "error in payment " , 403));    
    console.log(order);
    res.json(order);

  } catch (error) {
    console.log(error);
    return next(new HttpError("Error", 500));
  }
};

const ValidatePayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =req.body;

    const sha = crypto.createHmac("sha256", "ybweIYliMpnJPCHgWSdfM66q");
    sha.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = sha.digest("hex");
    if (digest !== razorpay_signature) {
      return next(new HttpError("Transaction failed ", 403));
    }
    const user = await User.findById(req.userData.userId);
    if (!user) return next(new HttpError("User not find ", 402));
    
    user.Credit = req.body.credit + 10000;
    const savedUser = await user.save();
    console.log(savedUser);
    res.json({ credit: savedUser.Credit });
  } catch (error) {
    console.log(error);
    return next(new HttpError("error occured", 403));
  }
};

exports.MakePayment = MakePayment;
exports.ValidatePayment = ValidatePayment;
