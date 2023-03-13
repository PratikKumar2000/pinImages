const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  resetToken: String,
  expireToken: Date,
  pic: {
    type: String,
    default:
      "https://www.google.com/url?sa=i&url=https%3A%2F%2Fwww.tenforums.com%2Ftutorials%2F90186-change-default-account-picture-windows-10-a.html&psig=AOvVaw2e203UC-7r32IHDGEHwEY2&ust=1623698175153000&source=images&cd=vfe&ved=0CAIQjRxqFwoTCKjOiJuplfECFQAAAAAdAAAAABAD",
  },
  role: {
    type: String,
    default: "User",
  },
  condition: {
    type: String,
    default: "Unblock",
  },
});
mongoose.model("User", userSchema);
