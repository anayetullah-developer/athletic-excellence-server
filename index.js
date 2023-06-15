const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());
require("dotenv").config();

//MongoDB Connection
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.kkdykse.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const classCollection = client.db("athletic-excellence").collection("classes");
const selectedClassCollection = client
  .db("athletic-excellence")
  .collection("selectedClasses");
const userCollection = client.db("athletic-excellence").collection("users");

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

//jwt sign

app.post("/jwt", (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn : "1h"})
  res.send({token});
})


//Instructor apis
app.post("/instructor/addClass", async (req, res) => {
  const classInfo = req.body;
  const result = await classCollection.insertOne(classInfo);
  console.log(result);
  res.send(result);
});

app.get("/instructor/myClasses", async (req, res) => {
  const result = await classCollection.find().toArray();
  res.send(result);
});

app.get("/instructor/myClasses/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await classCollection.findOne(query);
  res.send(result);
});

app.patch("/instructor/updateClass/:id", async (req, res) => {
  const id = req.params.id;
  const body = req.body;
  console.log(body);
  const query = { _id: new ObjectId(id) };
  const updateClass = {
    $set: {
      instructorName: body.instructorName,
      photoURL: body.photoURL,
      price: body.price,
      name: body.name,
      email: body.email,
      seats: body.seats,
    },
  };
  const result = await classCollection.updateOne(query, updateClass);
  res.send(result);
});

app.patch("/instructor/feedbackClass/:id", async (req, res) => {
  const id = req.params.id;
  const body = req.body;
  console.log(body);
  const query = { _id: new ObjectId(id) };
  const updateClass = {
    $set: {
      feedback: req.body.adminFeedback
    },
  };
  const result = await classCollection.updateOne(query, updateClass);
  res.send(result);
});

// Student APIs
app.post("/student/selectedClass", async (req, res) => {
  const classInfo = req.body;
  const result = await selectedClassCollection.insertOne(classInfo);
  console.log(result);
  res.send(result);
});

app.get("/student/selectedClasses", async (req, res) => {
  const result = await selectedClassCollection.find().toArray();
  console.log(result);
  res.send(result);
});

app.delete("/student/selectedClass/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await selectedClassCollection.deleteOne(query);
  res.send(result);
});

//User APIs

app.post("/users", async (req, res) => {
  const user = req.body;
  const query = { email: user.email };
  const existingUser = await userCollection.findOne(query);
  if (existingUser) {
    return { message: "User already exists" };
  }
  const result = await userCollection.insertOne(user);
  res.send(result);
});

app.get("/users", async (req, res) => {
  const result = await userCollection.find().toArray();
  res.send(result);
});

// Admin manage user Apis
app.patch("/users/admin/:id", async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };

  const updatedUser = {
    $set: {
      role: "admin",
    },
  };

  const result = await userCollection.updateOne(filter, updatedUser);
  res.send(result);
});

app.patch("/users/instructor/:id", async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };

  const updatedUser = {
    $set: {
      role: "instructor",
    },
  };

  const result = await userCollection.updateOne(filter, updatedUser);
  res.send(result);
});

// Admin manage classes apis
app.patch("/classes/approved/:id", async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };

  const updatedUser = {
    $set: {
      status: "approved",
    },
  };

  const result = await classCollection.updateOne(filter, updatedUser);
  res.send(result);
});

app.patch("/classes/denied/:id", async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };

  const updatedUser = {
    $set: {
      status: "denied",
    },
  };

  const result = await classCollection.updateOne(filter, updatedUser);
  res.send(result);
});


app.get("/", (req, res) => {
  res.send("Server is working");
});

app.listen(port, () => {
  console.log("Server is running on port", port);
});
