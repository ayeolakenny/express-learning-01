const express = require("express");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const bcrypt =require("bcryptjs")

const db = require("./config/db");
const jwt = require("jsonwebtoken")
const isAuthenticated=require("./middleware/auth")
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
  const { name, email, password } = req.body
  const salt = await bcrypt.genSalt(10)
  const hashedPassword = await bcrypt.hash(password, salt)
  const createUser ={name,email,password:hashedPassword}
  const newUser = await db.user.create({
    data: { ...createUser },
  });
  res.status(201).json({ user: newUser });
});

app.post("/user/login", async (req, res) => {
  const { email, password } = req.body
  // const username = req.body.name
  // const user ={name:username}
  if (!email || !password) {
    res.status(200).json("please proivide your email and password")
  }
  const user = await db.user.findUnique({
    where: {
      email:req.body.email
    }
  })
  //compare 
  const isMatch =await bcrypt.compare(password,user.password)
  const token = jwt.sign({_id:user._id}, process.env.JWT_SECRET, { expiresIn: "3d" })
  res.status(200).json({token:token,name:isMatch.name})
})

app.post("/blog/:userId",isAuthenticated, async (req, res) => {
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
      comment: true,
    },
  });

  res.status(200).json(blogs);
});

// 1. create an endpoint to publish a blog - (make sure its the user that created the blog that pubslishes it)
app.patch("/publish/:blogId/:userId", async (req, res) => {
  const { blogId } = req.params;
  const isPublished = await db.blog.update({
    where: {
      AND: [
        {
          id: +blogId,
        },
        { userId: +userId },
      ],
    },
    data: { isPublished: true },
  });

  res.status(200).json(isPublished);
});

app.get("/published-blog", async (req, res) => {
  const getPublishedblog = await db.blog.findMany({
    where: {
      isPublished: true,
    },
  });
  res.status(200).json(getPublishedblog);
});

// get one user published blog
app.get("/blogs/:userId", async (req, res) => {
  const { userId } = req.params;
  const getblog = await db.blog.findMany({
    where: { AND: [{ userId: +userId }, { isPublished: true }] },
  });
  res.status(200).json(getblog);
});

// endpoint to like a blog
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
app.delete("/blog/:likeId/like/:userId", async (req, res) => {
  const { userId, likeId } = req.params;
  const deleteLike = await db.like.deleteMany({
    where: {
      AND: [{ id: +likeId }, { userId: +userId }],
    },
  });

  res.status(200).json(deleteLike);
});

// 2b. create an endpoint to delete his/her comment
app.delete("/blog/:commentId/comment/:userId", async (req, res) => {
  const { userId, commentId } = req.params;

  // NOTE: same as i said in delete like, its fine tho dont change anything
  const deletecomment = await db.comment.deleteMany({
    where: {
      AND: [{ commentId: +commentId }, { userId: +userId }],
    },
  });
  res.status(200).json(deletecomment);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
