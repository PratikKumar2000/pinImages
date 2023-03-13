const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = mongoose.model("User");

function requireLogin(req, res, next) {
  const { authorization } = req.headers;
  //authorization === Bearer ewefwegwrherhe
  if (!authorization) {
    return res.status(401).json({ error: "you must be logged in" });
  }
  const token = authorization.replace("Bearer ", "");
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res
        .status(401)
        .json({ error: "you must be logged in to excess this resource" });
    }
    const { _id } = user;
    User.findById(_id).then(userdata => {
      if (err) {
        return res.status(500).json({ error : "Internal Server Error"});
      }
      if (!userdata) {
        return res
          .status(401)
          .json({ error: "you must be signed up to excess this resource" });
      }
      if (userdata.condition === "block") {
        return res
          .status(401)
          .json({ error: "your account has been blocked for some reason" });
      }
      req.user = userdata;
      next();
    }).catch(err=> {
      console.log(err);
    });
  });
}
function moderator(...role_user) {
  return (req, res, next) => {
    // console.log(req.user);
    if (role_user.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: "Only moderators are allowed to access the resource" });
    }
    next();
  };
}
module.exports = { requireLogin, moderator };
