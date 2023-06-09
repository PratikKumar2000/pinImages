const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = mongoose.model("User");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sgMail = require("@sendgrid/mail");

sgMail.setApiKey(process.env.SENDGRID_API);

router.post("/signup", (req, res) => {
  const { name, email, password, pic } = req.body;
  if (!email || !password || !name) {
    return res.status(422).json({ error: "please add all the fields" });
  }
  if (password.length < 6) {
    res.json({ error: "Password must be of 6 characters" });
  }
  User.findOne({ email: email })
    .then((savedUser) => {
      if (savedUser) {
        return res
          .status(422)
          .json({ error: "user already exists with that email" });
      }
      bcrypt.hash(password, 12).then((hashedpassword) => {
        const user = new User({
          email,
          password: hashedpassword,
          name,
          pic,
          role: "User",
          condition: "Unblock",
        });
        user
          .save()
          .then((user) => {
            res.status(200).json({ message: "Signed-Up Successfully" });
          })
          .catch((err) => {
            console.log(err);
          });
      });
    })
    .catch((err) => {
      console.log(err);
    });
});

router.post("/signin", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(422).json({ error: "please add email or password" });
  }
  User.findOne({ email: email }).then((savedUser) => {
    if (!savedUser) {
      return res.status(422).json({ error: "Invalid Email or password" });
    }
    bcrypt
      .compare(password, savedUser.password)
      .then((doMatch) => {
        if (doMatch) {
          const token = jwt.sign(
            { _id: savedUser._id },
            process.env.JWT_SECRET
          );
          const { _id, name, email, pic, role, condition } = savedUser;
          if (condition === "block") {
            return res.json({
              error: "Sorry,Your account has been blocked",
            });
          }
          res.json({
            token,
            user: { _id, name, email, pic, role, condition },
          });
        } else {
          return res.status(422).json({ error: "Invalid Email or password" });
        }
      })
      .catch((err) => {
        console.log(err);
      });
  });
});

router.post("/resetpassword", (req, res) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
    }
    const token = buffer.toString("hex");
    User.findOne({ email: req.body.email }).then((user) => {
      if (!user) {
        return res
          .status(422)
          .json({ error: "User does not exist with that email" });
      }
      user.resetToken = token;
      user.expireToken = Date.now() + 3600000;
      user
        .save()
        .then((result) => {
          const message = {
            to: user.email,
            from: process.env.EMAIL,
            subject: "Password reset",
            html: `
                    <p>You requested for password reset</p>
                    <h5>click on this <a href="${req.protocol}://${req.get(
              "host"
            )}/reset/${user.resetToken}">link</a> to reset password</h5>
                    `,
          };

          sgMail
            .send(message)
            .then((response) => console.log(response))
            .catch((err) => res.json({ error: err }));
          res.status(200).json({ message: "check your email" });
        })
        .catch((err) => {
          user.resetToken = undefined;
          user.expireToken = undefined;
          user.save({ validateBeforeSave: false });
          return res.status(500).json({ error: err });
        });
    });
  });
});

router.route("/reset/:token").put(async (req, res) => {
  try {
    const token = req.params.token;
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");
    const user = await User.findOne({
      resetToken: resetPasswordToken,
      expireToken: { $gt: Date.now() },
    });
    if (!user) {
      return res.status(422).json({
        error: "Try again session expired or invalid reset password token",
      });
    }
    if (req.body.password !== req.body.confirmPassword) {
      return res.status(400).json({ error: "Password does not match" });
    }
    bcrypt.hash(req.body.password, 12).then((hashedpassword) => {
      user.password = hashedpassword;
      user.resetToken = undefined;
      user.expireToken = undefined;
      user.save({ validateBeforeSave: false }).then((saveduser) => {
        res
          .status(200)
          .json({ message: "password updated success", saveduser });
      });
    });
  } catch (err) {
    console.log(err);
  }
});

module.exports = router;
