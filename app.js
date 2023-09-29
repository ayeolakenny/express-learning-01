const express = require("express");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");

const db = require("./config/db");
const app = express();
const port = process.env.PORT || 4000;

dotenv.config();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//app.post("/user", async (req, res) => {
//const { name, email } = req.body;
//const newUser = await db.user.create({
//data: { email, name },
//});
//console.log(newUser);
//res.status(201).json(newUser);
//});

app.post("/user", async (req, res) => {
  //const { name, email } = req.body
  const newUser = await db.user.create({
    data: { ...req.body },
  });
  res.status(201).json({ user: newUser });
});

app.post("/blog/:userId", async (req, res) => {
  const { title, content } = req.body;
  const { userId } = req.params;
  const newBlog = await db.blog.create({
    data: {
      title,
      content,
      isPublished: true,
      user: {
        connect: {
          id: +userId,
        },
      },
    },
  });
  res.status(200).json(newBlog);
});

app.get("/blog", async (req, res) => {
  const blogs = await db.blog.findMany({
    include: {
      user: true,
      like: {
        include: {
          user: true,
        },
      },
      comment: true, //NOTE: Include the comments and the user that made the comment
    },
  });

  res.status(200).json(blogs);
});

// 1. create an endpoint to publish a blog - (make sure its the user that created the blog that pubslishes it)
app.patch("/publish/:blogId", async (req, res) => {
  // NOTE: This endpoint allows anyone to publish a blog even if its not created by the person, should not be so

  const { blogId } = req.params;
  // const { title, content } = req.body
  const isUser = await db.blog.findFirst({ where: { id: +blogId } });

  if (!isUser) {
    res.status(404).json("no user is found with this id");
  }

  const isPublished = await db.blog.update({
    where: { id: +blogId },
    data: { isPublished: true },
  });

  res.status(200).json(isPublished);
});

// NOTE: Dont use create an enpoint route name in camel case
// NOTE: Also create an endpoint to find a particular user published blogs
app.get("/publishedBlog", async (req, res) => {
  const getPublishedblog = await db.blog.findMany({
    where: {
      isPublished: true,
    },
  });
  res.status(200).json(getPublishedblog);
});

app.post("/blog/:blogId/like/:userId", async (req, res) => {
  const { blogId, userId } = req.params;

  const likedBefore = await db.like.findFirst({
    where: { AND: [{ blogId: +blogId }, { userId: +userId }] },
  });

  if (likedBefore)
    res.status(400).json({ message: "You have liked this blog before" });

  const like = await db.like.create({
    data: {
      blog: {
        connect: {
          id: +blogId,
        },
      },
      user: {
        connect: {
          id: +userId,
        },
      },
    },
  });

  res.status(201).json(like);
});

//2. create endpoint for a user to comment on a blog
app.post("/blog/:blogId/comment/:userId", async (req, res) => {
  //const { content } = req.body
  const { blogId, userId } = req.params;
  const createComment = await db.comment.create({
    data: {
      ...req.body,
      blog: {
        connect: {
          id: +blogId,
        },
      },
      user: {
        connect: {
          id: +userId,
        },
      },
    },
  });
  res.status(200).json(createComment);
});

//3 Create an enpoint for user to unlike
app.delete("/blog/:blogId/like/:userId/:likeId", async (req, res) => {
  const { blogId, userId, likeId } = req.params;
  const findlike = await db.like.findFirst({
    where: { AND: [{ blogId: +blogId, userId: +userId }] },
  });
  if (!findlike) {
    res.status(404).json("not found");
  }

  // NOTE: Your code is fine but The code below will be more optimized for the job, cause it finds and deletes, but its fine, just wanted you to take note. and your delete req would be something like this

  // await db.like.delete({
  //   where: { AND: [{ id: +likeId }, { userId: +userId }] },
  // });

  // try{ delete logic here}catch(err){ throw your error here}

  const deleteLike = await db.like.delete({
    where: {
      id: +likeId,
    },
  });
  res.status(200).json("unlike");
});

// 2b. create an endpoint to delete his/her comment
app.delete("/blog/:blogId/comment/:userId/:commentId", async (req, res) => {
  const { blogId, userId, commentId } = req.params;
  const findcomment = await db.comment.findFirst({
    where: { AND: [{ blogId: +blogId }, { userId: +userId }] },
  });
  if (!findcomment) {
    res.status(404).json("cant find user that exist with that blog");
  }
  //res.status(200).json("it is deleting")

  // NOTE: same as i said in delete like, its fine tho dont change anything
  const deletecomment = await db.comment.delete({
    where: {
      id: +commentId,
    },
  });
  res.status(200).json(deletecomment);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
