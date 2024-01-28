const express = require("express");
const { User, Account } = require("../db");
const jwt = require("jsonwebtoken");
const zod = require("zod");
const { JWT_SECRET } = require("../config.js");
const { authMiddleware } = require("../middleware");
const router = express.Router();

const signupBody = zod.object({
  username: zod.string().email(),
  firstname: zod.string(),
  lastname: zod.string(),
  password: zod.string(),
});
router.post("/signup", async (req, res) => {
  const { success } = signupBody.safeParse(req.body);
  if (!success) {
    return res.status(411).json({
      message: "Incorrect inputs",
    });
  }
  const existingUser = await User.findOne({
    username: req.body.username,
  });

  if (existingUser) {
    res.status(411).json({
      message: "Email already taken",
    });
  }

  const user = await User.create({
    username: req.body.username,
    password: req.body.password,
    firstname: req.body.firstname,
    lastname: req.body.lastname,
  });

  const userId = user._id;
  ///---Create new account--

  await Account.create({
    userId,
    balance: 1 + Math.random() * 10000,
  });

  const token = jwt.sign(
    {
      userId,
    },
    JWT_SECRET
  );

  res.json({
    message: "User Created successfully",
    token: token,
  });
});
module.exports = router;

const signinbody = zod.object({
  username: zod.string().email(),
  password: zod.string(),
});

router.post("/signin", async (req, res) => {
  const { success } = signinbody.safeParse(req.body);

  if (!success) {
    return res.status(411).json({
      message: "Incorrrect Inputs",
    });
  }

  const user = await User.findOne({
    username: req.body.username,
    password: req.body.password,
  });

  if (user) {
    const token = jwt.sign(
      {
        userId: user._id,
      },
      JWT_SECRET
    );

    res.json({
      token: token,
    });
  }

  res.status(411).json({
    message: "Error while logging in",
  });
});

const updateBody = zod.object({
  password: zod.string().optional(),
  firstname: zod.string().optional(),
  lastname: zod.string().optional(),
});
router.put("/", authMiddleware, async (req, res) => {
  const { succcess } = updateBody.safeParse(req.body);

  if (!succcess) {
    return res.status(411).json({
      message: "Error while updating information",
    });
  }

  await User.updateOne(req.body, {
    _id: req.userId,
  });

  res.json({
    message: "Updated succesfullly",
  });
});

router.get("/bulk", async (req, res) => {
  const filter = req.query.filter;

  const users = await User.find({
    $or: [
      {
        firstname: {
          $regex: filter,
        },
      },
      {
        lastname: {
          $regex: filter,
        },
      },
    ],
  });

  res.json({
    user: users.map((user) => ({
      username: user.username,
      firstname: user.firstname,
      lastname: user.lastname,
      _id: user._id,
    })),
  });
});

module.exports = router;
