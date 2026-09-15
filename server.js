const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;
const dataDir = path.join(__dirname, "data");
const dbPath = path.join(dataDir, "social.json");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function getTimestamp() {
  return new Date().toISOString();
}

function ensureDatabaseFile() {
  if (!fs.existsSync(dbPath)) {
    const seed = {
      users: [
        {
          id: 1,
          name: "Maya Chen",
          username: "mayac",
          email: "maya@socialpulse.app",
          bio: "Product designer and coffee enthusiast.",
          avatar: "MC",
          createdAt: getTimestamp()
        },
        {
          id: 2,
          name: "Aarav Patel",
          username: "aaravp",
          email: "aarav@socialpulse.app",
          bio: "Building creator tools and cool ideas.",
          avatar: "AP",
          createdAt: getTimestamp()
        },
        {
          id: 3,
          name: "Sofia Nguyen",
          username: "sofia.n",
          email: "sofia@socialpulse.app",
          bio: "Photographer chasing sunsets and stories.",
          avatar: "SN",
          createdAt: getTimestamp()
        },
        {
          id: 4,
          name: "Noah Brooks",
          username: "noahb",
          email: "noah@socialpulse.app",
          bio: "Engineer with a love for thoughtful products.",
          avatar: "NB",
          createdAt: getTimestamp()
        }
      ],
      posts: [
        {
          id: 1,
          userId: 1,
          content: "Just launched a new landing page concept for a tiny creator community. Design energy is high today!",
          imageUrl: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
          createdAt: getTimestamp()
        },
        {
          id: 2,
          userId: 2,
          content: "The best product ideas come from listening to people. Still thinking about smart, calm experiences for everyday users.",
          imageUrl: "",
          createdAt: getTimestamp()
        },
        {
          id: 3,
          userId: 3,
          content: "A golden-hour walk and a few great shots. This is the reminder I needed to slow down and create.",
          imageUrl: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&w=1200&q=80",
          createdAt: getTimestamp()
        },
        {
          id: 4,
          userId: 4,
          content: "Debugging is 80% patience and 20% coffee. The rest is shipping something useful.",
          imageUrl: "",
          createdAt: getTimestamp()
        }
      ],
      comments: [
        {
          id: 1,
          postId: 1,
          userId: 2,
          text: "This looks amazing. Love the clean direction.",
          createdAt: getTimestamp()
        },
        {
          id: 2,
          postId: 3,
          userId: 4,
          text: "The light in that photo is incredible.",
          createdAt: getTimestamp()
        }
      ],
      likes: [
        { id: 1, postId: 1, userId: 2, createdAt: getTimestamp() },
        { id: 2, postId: 1, userId: 3, createdAt: getTimestamp() },
        { id: 3, postId: 2, userId: 1, createdAt: getTimestamp() },
        { id: 4, postId: 3, userId: 2, createdAt: getTimestamp() }
      ],
      follows: [
        { id: 1, followerId: 1, followeeId: 2, createdAt: getTimestamp() },
        { id: 2, followerId: 1, followeeId: 3, createdAt: getTimestamp() },
        { id: 3, followerId: 2, followeeId: 4, createdAt: getTimestamp() },
        { id: 4, followerId: 3, followeeId: 1, createdAt: getTimestamp() }
      ]
    };

    fs.writeFileSync(dbPath, JSON.stringify(seed, null, 2));
  }
}

function readDatabase() {
  ensureDatabaseFile();
  return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

function writeDatabase(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function getNextId(collection) {
  return collection.reduce((max, item) => Math.max(max, Number(item.id || 0)), 0) + 1;
}

function getUserStats(db, userId) {
  const followerCount = db.follows.filter((follow) => follow.followeeId === userId).length;
  const followingCount = db.follows.filter((follow) => follow.followerId === userId).length;
  const postCount = db.posts.filter((post) => post.userId === userId).length;

  return { followerCount, followingCount, postCount };
}

function serializeUser(db, user, currentUserId = null) {
  const stats = getUserStats(db, user.id);
  const isFollowing = currentUserId ? !!db.follows.some((follow) => follow.followerId === currentUserId && follow.followeeId === user.id) : false;

  return {
    ...user,
    ...stats,
    isFollowing
  };
}

function getPostsForFeed(db, viewUserId = 1, currentUserId = 1) {
  const followedUserIds = new Set(
    db.follows
      .filter((follow) => follow.followerId === currentUserId)
      .map((follow) => follow.followeeId)
  );

  const allowedUserIds = new Set([...followedUserIds, viewUserId]);

  const posts = db.posts
    .filter((post) => allowedUserIds.has(post.userId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return posts.map((post) => {
    const author = db.users.find((user) => user.id === post.userId);
    const comments = db.comments
      .filter((comment) => comment.postId === post.id)
      .map((comment) => {
        const commentUser = db.users.find((user) => user.id === comment.userId);
        return {
          id: comment.id,
          text: comment.text,
          createdAt: comment.createdAt,
          name: commentUser ? commentUser.name : "User",
          username: commentUser ? commentUser.username : "user",
          avatar: commentUser ? commentUser.avatar : "U"
        };
      });

    const likeCount = db.likes.filter((like) => like.postId === post.id).length;
    const likedByCurrentUser = db.likes.some((like) => like.postId === post.id && like.userId === currentUserId);
    const isFollowingAuthor = db.follows.some((follow) => follow.followerId === currentUserId && follow.followeeId === post.userId);

    return {
      id: post.id,
      authorId: post.userId,
      content: post.content,
      imageUrl: post.imageUrl,
      createdAt: post.createdAt,
      name: author ? author.name : "Unknown",
      username: author ? author.username : "unknown",
      avatar: author ? author.avatar : "U",
      bio: author ? author.bio : "",
      likeCount,
      commentCount: comments.length,
      likedByCurrentUser,
      isFollowingAuthor,
      comments
    };
  });
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "SocialPulse API is running." });
});

app.get("/api/users", (req, res) => {
  const db = readDatabase();
  const currentUserId = Number(req.query.currentUserId || 1);
  const users = [...db.users].sort((a, b) => a.name.localeCompare(b.name));
  res.json(users.map((user) => serializeUser(db, user, currentUserId)));
});

app.get("/api/users/:id", (req, res) => {
  const db = readDatabase();
  const userId = Number(req.params.id);
  const currentUserId = Number(req.query.currentUserId || userId);
  const user = db.users.find((entry) => entry.id === userId);

  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  res.json(serializeUser(db, user, currentUserId));
});

app.get("/api/feed", (req, res) => {
  const db = readDatabase();
  const currentUserId = Number(req.query.userId || 1);
  const viewUserId = Number(req.query.viewUserId || currentUserId);
  const posts = getPostsForFeed(db, viewUserId, currentUserId);
  res.json(posts);
});

app.get("/api/search", (req, res) => {
  const db = readDatabase();
  const term = String(req.query.q || "").trim();
  const currentUserId = Number(req.query.currentUserId || 1);

  if (!term) {
    return res.json([]);
  }

  const matchingUsers = db.users.filter((user) => {
    const haystack = `${user.name} ${user.username}`.toLowerCase();
    return haystack.includes(term.toLowerCase());
  });

  res.json(matchingUsers.map((user) => serializeUser(db, user, currentUserId)));
});

app.post("/api/users/register", (req, res) => {
  const db = readDatabase();
  const { name, username, email, bio, avatar } = req.body || {};

  if (!name || !username || !email) {
    return res.status(400).json({ error: "Name, username, and email are required." });
  }

  const trimmedName = String(name).trim();
  const trimmedUsername = String(username).trim();
  const trimmedEmail = String(email).trim();

  const usernameExists = db.users.some((user) => user.username.toLowerCase() === trimmedUsername.toLowerCase());
  const emailExists = db.users.some((user) => user.email.toLowerCase() === trimmedEmail.toLowerCase());

  if (usernameExists || emailExists) {
    return res.status(409).json({ error: "Username or email already exists." });
  }

  const newUser = {
    id: getNextId(db.users),
    name: trimmedName,
    username: trimmedUsername,
    email: trimmedEmail,
    bio: bio ? String(bio).trim() : "New to SocialPulse.",
    avatar: avatar || trimmedName.slice(0, 2).toUpperCase(),
    createdAt: getTimestamp()
  };

  db.users.push(newUser);
  writeDatabase(db);

  res.status(201).json(serializeUser(db, newUser, newUser.id));
});

app.post("/api/posts", (req, res) => {
  const db = readDatabase();
  const { userId, content, imageUrl } = req.body || {};

  if (!userId || !content || !String(content).trim()) {
    return res.status(400).json({ error: "A valid userId and post content are required." });
  }

  const user = db.users.find((entry) => entry.id === Number(userId));
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  const newPost = {
    id: getNextId(db.posts),
    userId: Number(userId),
    content: String(content).trim(),
    imageUrl: imageUrl ? String(imageUrl).trim() : "",
    createdAt: getTimestamp()
  };

  db.posts.push(newPost);
  writeDatabase(db);

  res.status(201).json({
    id: newPost.id,
    authorId: newPost.userId,
    content: newPost.content,
    imageUrl: newPost.imageUrl,
    createdAt: newPost.createdAt,
    name: user.name,
    username: user.username,
    avatar: user.avatar,
    bio: user.bio,
    likeCount: 0,
    commentCount: 0,
    likedByCurrentUser: false,
    isFollowingAuthor: false,
    comments: []
  });
});

app.post("/api/posts/:id/like", (req, res) => {
  const db = readDatabase();
  const postId = Number(req.params.id);
  const userId = Number(req.body.userId);

  if (!userId) {
    return res.status(400).json({ error: "User id is required." });
  }

  const existingLike = db.likes.find((like) => like.postId === postId && like.userId === userId);

  if (existingLike) {
    db.likes = db.likes.filter((like) => !(like.postId === postId && like.userId === userId));
    writeDatabase(db);
    const likes = db.likes.filter((like) => like.postId === postId).length;
    return res.json({ liked: false, likeCount: likes });
  }

  db.likes.push({
    id: getNextId(db.likes),
    postId,
    userId,
    createdAt: getTimestamp()
  });

  writeDatabase(db);
  const likes = db.likes.filter((like) => like.postId === postId).length;
  res.json({ liked: true, likeCount: likes });
});

app.post("/api/posts/:id/comment", (req, res) => {
  const db = readDatabase();
  const postId = Number(req.params.id);
  const { userId, text } = req.body || {};

  if (!userId || !text || !String(text).trim()) {
    return res.status(400).json({ error: "User id and comment text are required." });
  }

  const user = db.users.find((entry) => entry.id === Number(userId));
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  const comment = {
    id: getNextId(db.comments),
    postId,
    userId: Number(userId),
    text: String(text).trim(),
    createdAt: getTimestamp()
  };

  db.comments.push(comment);
  writeDatabase(db);

  res.status(201).json({
    id: comment.id,
    text: comment.text,
    createdAt: comment.createdAt,
    name: user.name,
    username: user.username,
    avatar: user.avatar
  });
});

app.post("/api/users/:id/follow", (req, res) => {
  const db = readDatabase();
  const followeeId = Number(req.params.id);
  const followerId = Number(req.body.followerId);

  if (!followerId || followerId === followeeId) {
    return res.status(400).json({ error: "A different follower user is required." });
  }

  const alreadyFollows = db.follows.some((follow) => follow.followerId === followerId && follow.followeeId === followeeId);
  if (alreadyFollows) {
    return res.status(409).json({ error: "You already follow this person." });
  }

  db.follows.push({
    id: getNextId(db.follows),
    followerId,
    followeeId,
    createdAt: getTimestamp()
  });

  writeDatabase(db);
  const user = db.users.find((entry) => entry.id === followeeId);
  res.status(200).json({ success: true, user: serializeUser(db, user, followerId) });
});

app.post("/api/users/:id/unfollow", (req, res) => {
  const db = readDatabase();
  const followeeId = Number(req.params.id);
  const followerId = Number(req.body.followerId);

  if (!followerId) {
    return res.status(400).json({ error: "Follower id is required." });
  }

  db.follows = db.follows.filter((follow) => !(follow.followerId === followerId && follow.followeeId === followeeId));
  writeDatabase(db);

  const user = db.users.find((entry) => entry.id === followeeId);
  res.json({ success: true, user: serializeUser(db, user, followerId) });
});

app.use(express.static(path.join(__dirname, "public")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

ensureDatabaseFile();

app.listen(PORT, () => {
  console.log(`SocialPulse is running on http://localhost:${PORT}`);
});
