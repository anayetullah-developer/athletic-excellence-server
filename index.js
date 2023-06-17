const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const Stripe = require("stripe");
require("dotenv").config();
const stripe = Stripe(
  process.env.PAYMENT_SECRET_KEY
);

//middleware
app.use(cors());
app.use(express.json());
require("dotenv").config();

// Verify Jwt
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if(!authorization) {
    return res.status(401).send({error: true, message: "Unauthorized Access"})
  }

  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
    if(error) {
      return res.status(401).send({error: true, message: "Unauthorized access"})
    }

    req.decoded = decoded;
    next()
  })
}
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
const paymentHistoryCollection = client.db("athletic-excellence").collection("paymentInfo");

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
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

//verify admin 
const verifyAdmin = async (req, res, next) => {
  const email = req.decoded.email;
  const query = {email: email};
  const user = await userCollection.findOne(query);
  if(user?.role !== 'admin') {
    return res.status(403).send({error: true, message: "Forbidden Access"});
  }
  next();
}
//verify instructor
const verifyInstructor = async (req, res, next) => {
  const email = req.decoded.email;
  const query = {email: email};
  const user = await userCollection.findOne(query);
  if(user?.role !== 'instructor') {
    return res.status(403).send({error: true, message: "Forbidden Access"});
  }
  next();
}

//jwt sign

app.post("/jwt", (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn : "1h"})
  res.send({token});
})

//All Classes Api
app.get("/allClasses", async (req, res) => {
  const result = await classCollection.find().toArray();
  res.send(result);
});

// Popular classes
app.get("/popular-classes", async (req, res) => {
  const query = { enrollment: { $gt: 5 } }
  const result = await classCollection.find(query).toArray();
  res.send(result);
})

//Instructor apis
app.get("/allInstructors", async (req, res) => {
  const query = {"role" : "instructor"}
  const result = await userCollection.find(query).toArray();
  res.send(result);
})

app.get("/popular-instructors", async (req, res) => {
  const query = { students: { $gt: 10 } }
  const result = await userCollection.find(query).toArray();
  res.send(result);
})

app.post("/instructor/addClass", verifyJWT, verifyInstructor, async (req, res) => {
  const classInfo = req.body;
  const result = await classCollection.insertOne(classInfo);
  console.log(result);
  res.send(result);
});

app.get("/instructor/myClasses", verifyJWT, verifyInstructor, async (req, res) => {
  const email = req.query.email;
  
  if(!email) {
    res.send([])
  }

  const decodedEmail = req.decoded.email;

  if(email !== decodedEmail) {
    return res.status(401).send({error: true, message: "forbidden access"})
  };

  const query = {email: email}
  const result = await classCollection.find(query).toArray();
  res.send(result);
});

app.get("/instructor/myClasses/:id", verifyJWT, verifyInstructor, async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await classCollection.findOne(query);
  res.send(result);
});

app.patch("/instructor/updateClass/:id", verifyJWT, verifyInstructor, async (req, res) => {
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


app.patch("/instructor/feedbackClass/:id", verifyJWT, verifyAdmin, async (req, res) => {
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

app.get("/student/payment/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await selectedClassCollection.findOne(query);
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

app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
  const result = await userCollection.find().toArray();
  res.send(result);
});

// Admin manage user Apis
app.patch("/users/admin/:id", verifyJWT, verifyAdmin, async (req, res) => {
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

app.patch("/users/instructor/:id", verifyJWT, verifyAdmin,  async (req, res) => {
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
app.patch("/classes/approved/:id", verifyJWT, verifyAdmin, async (req, res) => {
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

app.patch("/classes/denied/:id", verifyJWT, verifyAdmin, async (req, res) => {
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

// IsAdmin
app.get("/users/admin/:email", verifyJWT, async (req, res) => {
  const email = req.params.email;
  if(req.decoded.email !== email) {
    req.send({admin: false})
  }

  const query = {email: email}
  const user = await userCollection.findOne(query);
  const result = {admin: user?.role === "admin"}
  console.log(result)
  res.send(result);
})

// Is instructor
app.get("/users/instructor/:email", verifyJWT, async (req, res) => {
  const email = req.params.email;
  if(req.decoded.email !== email) {
    req.send({instructor: false})
  }

  const query = {email: email}
  const user = await userCollection.findOne(query);
  const result = {instructor: user?.role === "instructor"}
  console.log(result)
  res.send(result);
})

 // payment intent
 app.post("/create-payment-intent", async (req, res) => {
  const { price } = req.body;
  const amount = parseInt(price * 100);
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: 'usd',
    payment_method_types: ['card']
  });

  res.send({
    clientSecret: paymentIntent.client_secret
  })
})

// Payment info
app.post("/payment-info", verifyJWT, async (req, res) => {
  const payment = req.body;
  const id = req.body.id;
  let seats = parseFloat(req.body.seats);
  const { classId, name, email, transactionId, price, date, className } = payment;
  const newPayment = { name, email, transactionId, price, date, className };
  const insertResult = await paymentHistoryCollection.insertOne(newPayment);

  const query = { _id: new ObjectId(id) } 
  const deleteResult = await selectedClassCollection.deleteOne(query)

  const updateQuery = { _id: new ObjectId(classId) }
  const updatedClass = {
    $set: {
      seats: seats - 1
    }
  };

  const updateResult = await classCollection.updateOne(updateQuery, updatedClass);
  res.send({ insertResult, deleteResult, updateResult });
});

app.get("/", (req, res) => {
  res.send("Server is working");
});

app.listen(port, () => {
  console.log("Server is running on port", port);
});
