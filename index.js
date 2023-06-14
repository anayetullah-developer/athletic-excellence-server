const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;

//middleware 
app.use(cors());
app.use(express.json())
require('dotenv').config();

//MongoDB Connection
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.kkdykse.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const classCollection = client.db("athletic-excellence").collection("classes");


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

//Instructor 
app.post("/instructor/addClass", async (req, res) => {
  const classInfo = req.body;
  const result = await classCollection.insertOne(classInfo);
  console.log(result);
  res.send(result)
})

app.get("/instructor/myClasses", async(req, res) => {
  const result = await classCollection.find().toArray();
  res.send(result);
})

app.get("/instructor/myClasses/:id", async(req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await classCollection.findOne(query);
  res.send(result);
})


app.patch("/instructor/updateClass/:id", async (req, res) => {
  const id = req.params.id;
  const body = req.body;
  console.log(body);
  const query = { _id: new ObjectId(id) };
  const updateToy = {
    $set: {
      instructorName: body.instructorName, 
      photoURL: body.photoURL,
      price: body.price,
      name: body.name,
      email: body.email,
      seats: body.seats,
    },
  };
  const result = await classCollection.updateOne(query, updateToy);
  res.send(result);
});



app.get("/", (req, res) => {
    res.send("Server is working")
})

app.listen(port, () => {
    console.log('Server is running on port', port);
})