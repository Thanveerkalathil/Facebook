const {
  validateEmail,
  validateLength,
  validateUsername,
} = require("../helpers/validation");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { generatorToken } = require("../helpers/token");
const { sendVerificationEmail } = require("../helpers/mailer");

exports.register = async (req, res) => {
  try {
    console.log(req.body);
    const {
      first_name,
      last_name,
      email,
      password,
      bYear,
      bMonth,
      bDay,
      gender,
    } = req.body;

    if (!validateEmail(email)) {
      return res.status(400).json({
        message: "Invalid email address",
      });
    }
    const check = await User.findOne({ email });
    if (check) {
      return res.status(400).json({
        message: "This email address is already exist.Try with a diffrent",
      });
    }
    if (!validateLength(first_name, 3, 30)) {
      return res.status(400).json({
        message: "First Name must between 3 and 30 charecters.",
      });
    }

    if (!validateLength(last_name, 3, 30)) {
      return res.status(400).json({
        message: "Last Name must between 3 and 30 charecters.",
      });
    }

    if (!validateLength(password, 6, 40)) {
      return res.status(400).json({
        message: "Password must between 6 and 40 charecters.",
      });
    }

    const cryptedPassword = await bcrypt.hash(password, 12);

    let tempUsername = first_name + last_name;
    let newUsername = await validateUsername(tempUsername);
    const user = await new User({
      first_name,
      last_name,
      email,
      password: cryptedPassword,
      username: newUsername,
      bYear,
      bMonth,
      bDay,
      gender,
    }).save();

    const emailVerificationToken = generatorToken(
      { id: user._id.toString() },
      "30m"
    );
    const url = `${process.env.BASE_URL}/activate/${emailVerificationToken}`;

    sendVerificationEmail(user.email, user.first_name, url);
    const token = generatorToken({ id: user._id.toString() }, "7d");
    res.send({
      id: user._id,
      username: user.username,
      picture: user.picture,
      first_name: user.first_name,
      last_name: user.last_name,
      token: token,
      verified: user.verified,
      message: "Registration success ! please activate your email to start",
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
};
exports.activateAccount = async (req, res) => {
  try {
    const { token } = req.body;
    const user = jwt.verify(token, process.env.TOKEN_SECRET);
    const check = await User.findById(user.id);
    console.log(check);
    if (check.verified == true) {
      return res
        .status(400)
        .json({ message: "This email is already activated" });
    } else {
      await User.findByIdAndUpdate(user.id, { verified: true });
      return res.status(200).json({
        message: "Account has been activated successfully.",
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        message: "The email address you entered is not connected to an account",
      });
    }
    const check = await bcrypt.compare(password, user.password);
    if (!check) {
      return res
        .status(400)
        .json({ message: "Invalid credentials.Please try again" });
    }
    const token = generatorToken({ id: user._id.toString() }, "7d");
    res.send({
      id: user._id,
      username: user.username,
      picture: user.picture,
      first_name: user.first_name,
      last_name: user.last_name,
      token: token,
      verified: user.verified,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
