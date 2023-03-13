const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { requireLogin, moderator } = require("../middleware/requireLogin");
const Post = mongoose.model("Post");
const User = mongoose.model("User");

router.get("/user/:id", requireLogin, (req, res) => {
  User.findOne({ _id: req.params.id })
    .select("-password")
    .then((user) => {
      Post.find({ postedBy: req.params.id })
        .populate("postedBy", "_id name")
        .populate("comments.postedBy", "_id name")
        .then((posts) => {
          res.json({ user, posts });
        })
        .catch((err) => {
          return res.status(422).json({ error: err });
        });
    })
    .catch((err) => {
      return res.status(404).json({ error: "User not found" });
    });
});

router.put("/updateprofile", requireLogin, (req, res) => {
  User.findById(
    req.user._id,
  ).then(result => {
    if (!result) {
      return res.json({ error: "error while updating profile" });
    }
    const { email, name, pic } = req.body;
    result.email = email; result.name = name; result.pic = pic;
    result.save().then(response => res.json({response}))
      .catch(err => console.log(err));
  })
});

router.route("/moderator/users").get(requireLogin, moderator("User"),
  (req, res) => {
   User.find()
     .then((users) => {
       res.status(200).json({ users });
     })
     .catch((err) => {
       res.status(404).json({ error: err });
     });
  });

  router
    .route("/moderator/user/:id")
    .get(requireLogin, moderator("User"), (req, res) => {
      const id = req.params.id;
      // console.log(id);
      User.find({_id : id})
        .then((user) => {
          res.status(200).json({ user });
        })
        .catch((err) => {
          res.status(404).json({ error: err });
        });
    });

router
  .route("/moderator/user/status")
  .put(requireLogin, moderator("User"), async (req, res) => {
    try {
      const id = req.body.id;
      const user = await User.findById({ _id: id });
      if (!user) {
        return res.status(401).json({ error: "error in finding the user" });
      }
      if (user.condition === "block") {
        user.condition = "Unblock";
      } else {
        user.condition = "block";
      }
      user
        .save()
        .then((response) => {
          res.status(200).json({ message: "changed the status successfully" });
        })
        .catch((err) => {
          res.status(500).json({ error: "internal server error" });
        });
    } catch (err) {
      console.log(err);
    }
  });

  router.put("/user/modifyPassword", requireLogin, async (req, res) => {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(422).json({ error: "please provide all the details" });
    }
    User.findOne({ _id: req.user._id })
      .select("+password")
      .then((user) => {
        bcrypt.compare(oldPassword, user.password).then((doMatch) => {
          if (!doMatch) {
            return res.status(400).json({ error: "Old password is incorrect" });
          }
        });
        if (newPassword !== confirmPassword) {
          return res.status(400).json({ error: "Password does not match" });
        }
        bcrypt.hash(newPassword, 12).then((hashedpassword) => {
          user.password = hashedpassword;
          user.save({ validateBeforeSave: false }).then((saveduser) => {
            res
              .status(200)
              .json({ message: "password updated success", user: saveduser });
          });
        });
      });
  });

module.exports = router;
