const mongoose = require("mongoose");
const express = require("express");
// const dotenv = require("dotenv");
const path = require("path");
const bodyParser = require("body-parser");
require("./models/Post");
require("./models/User");
// dotenv.config({ path: "config/.env" });
const app = express();
app.use(express.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(bodyParser.json());


app.use(require("./routes/auth"));
app.use(require("./routes/post"));
app.use(require("./routes/user"));

//static files

app.use(express.static(path.join(__dirname, "./frontend/pininterest/build")));

app.get("*", function (req, res){
  res.sendFile(path.joinFile(__dirname, "./frontend/pininterest/build/index.html"));
})

mongoose
  .connect(process.env.MONGOURL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Successfully connected to database");
  })
  .catch((err) => {
    console.log("Error occurred!", err);
  });

app.listen(process.env.PORT || 5000, () => {
  console.log("Listening at port", process.env.PORT || 5000);
});
