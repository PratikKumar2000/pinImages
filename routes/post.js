const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { requireLogin, moderator } = require("../middleware/requireLogin");
const Post = mongoose.model("Post");

router.get("/allpost", (req, res) => {
  Post.find()
    .populate("postedBy", "_id name email")
    .populate("comments.postedBy", "_id name")
    .sort("-createdAt")
    .then((posts) => {
      res.json({ posts });
    })
    .catch((err) => {
      res.json({ error: err });
    });
});

router.post("/createpost", requireLogin, (req, res) => {
  // console.log(req.body);
  const { title, body, pic } = req.body;
  if (!title || !body || !pic) {
    return res.status(422).json({ error: "Plase add all the fields" });
  }
  req.user.password = undefined;
  const post = new Post({
    title,
    body,
    photo: pic,
    postedBy: req.user,
  });
  post
    .save()
    .then((result) => {
      res.json({ post: result });
    })
    .catch((err) => {
      console.log(err);
    });
});

router.put("/editpost", requireLogin, async (req, res) => {
  console.log(req.body);
  try {
    const { title, body, pic, postId } = req.body;
    if (!title || !body || !pic) {
      return res.status(422).json({ error: "Plase add all the fields" });
    }
    const post = await Post.findById(postId);
    post.title = title;
    post.body = body;
    post.photo = pic;
    const result = await post.save();
    res.json({ post: result });
  } catch (err) {
    console.log(err);
  }
});

router.get("/mypost", requireLogin, (req, res) => {
  Post.find({ postedBy: req.user._id })
    .populate("postedBy", "_id name")
    .populate("comments.postedBy", "_id name")
    .then((mypost) => {
      res.json({ mypost });
    })
    .catch((err) => {
      console.log(err);
    });
});

router.get("/post/:postid", async (req, res) => {
  try {
    const id = req.params.postid;
    const result = await Post.findById({ _id: id })
      .populate("postedBy", "_id name")
      .populate("comments.postedBy", "_id name");
    res.json({ post: result });
  } catch (error) {
    res.json({ error: "Error while fetching the post" });
  }
});

router.put("/like", requireLogin, async (req, res) => {
  try {
    const result = await Post.findByIdAndUpdate(
      req.body.postId,
      {
        $push: { likes: req.user._id },
      },
      {
        new: true,
      }
    );
    res.status(200).json(result);
  } catch (err) {
    console.log(err);
  }
});
router.put("/unlike", requireLogin, async (req, res) => {
  try {
    const result = await Post.findByIdAndUpdate(
      req.body.postId,
      {
        $pull: { likes: req.user._id },
      },
      {
        new: true,
      }
    );
    res.status(200).json(result);
  } catch (err) {
    console.log(err);
  }
});

router.put("/comment", requireLogin, async (req, res) => {
  const comment = {
    text: req.body.text,
    postedBy: req.user._id,
  };
  // console.log(comment);
  try {
    const post = await Post.findById(req.body.postId).populate(
      "comments.postedBy"
    );
    const isCommented = post.comments.find(
      (comm) => comm.postedBy._id.toString() === req.user._id.toString()
    );
    if (isCommented) {
      post.comments.forEach((comm) => {
        if (comm.postedBy._id.toString() === req.user._id.toString()) {
          comm.text = req.body.text;
        }
      });
    } else post.comments.push(comment);
    const pos = await post.save();
    const result = await Post.findById(req.body.postId)
      .populate("postedBy", "_id name")
      .populate("comments.postedBy", "_id name");

    res.status(200).json(result);
  } catch (err) {
    console.log(err);
  }
});

router.route("/deleteComment").put(requireLogin, async (req, res) => {
  try {
    const id = req.user._id;
    const { postId } = req.body;
    const post = await Post.findOne({ _id: postId });
    if (!post) {
      return res.status(404).json({ error: "post not found" });
    }
    const commentArr = post.comments;
    const newCommentArr = [];
    commentArr.forEach((comment) => {
      if (comment.postedBy.toString() !== id.toString()) {
        newCommentArr.push(comment);
      }
    });
    post.comments = newCommentArr;
    await post.save();
    const result = await Post.findById(req.body.postId)
      .populate("postedBy", "_id name")
      .populate("comments.postedBy", "_id name");
    res.status(200).json(result);
  } catch (err) {
    console.log(err);
  }
});

router.delete("/deletepost/:postId", requireLogin, (req, res) => {
  Post.findOne({ _id: req.params.postId })
    .populate("postedBy", "_id")
    .then((post) => {
      if (!post) {
        return res.status(422).json({ error: err });
      }
      if (post.postedBy._id.toString() === req.user._id.toString()) {
        Post.deleteOne({ _id: req.params.postId })
          .then((result) => {
            res.json(result);
          })
          .catch((err) => {
            console.log(err);
          });
      }
    })
    .catch((err) => console.log(err));
});

router
  .route("/moderator/comment")
  .post(requireLogin, moderator("User"), async (req, res) => {
    const { postId } = req.body;
    Post.findById(postId)
      .populate("comments.postedBy")
      .then((post) => {
        if (!post) {
          return res.status(404).json({ error: "post not found" });
        } else {
          return res.status(200).json({
            comments: post.comments,
            message: post.comments.length,
          });
        }
      })
      .catch((err) => {
        res.json(500).json({ error: "internal server error" });
      });
  });

router
  .route("/moderator/deleteComment")
  .delete(requireLogin, moderator("User"), async (req, res) => {
    const id = req.body.id;
    const { postId } = req.body;
    Post.findOne({ _id: postId }, function (err, post) {
      if (err) {
        console.log(err);
        return;
      }
      if (!post) {
        return res.status(404).json("post not found");
      }
      const commentArr = post.comments;
      const newCommentArr = [];
      commentArr.forEach((comment) => {
        if (comment.postedBy.toString() !== id) {
          newCommentArr.push(comment);
        }
      });
      post.comments = newCommentArr;
      post
        .save()
        .then((response) => {
          res.status(200).json({
            comments: newCommentArr,
            message: "deleted the comment successfully",
          });
        })
        .catch((errr) => {
          res.status(500).json({ error: "error while deleting the comment" });
        });
    });
  });

router.delete(
  "/moderator/deletepost/:postId",
  requireLogin,
  moderator("User"),
  async (req, res) => {
    try {
      await Post.deleteOne({ _id: req.params.postId });
      res.json({ message: "Deleted the post successfully" });
    } catch (error) {
      res.json({ error: error });
    }
  }
);

module.exports = router;
