const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
require("dotenv").config();
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASS}@cluster0.q9r8zjr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const usersCollection = client.db("medicineShopDB").collection("users");
    const categoryCollection = client
      .db("medicineShopDB")
      .collection("Medicine_Category");
    const sellerMedicine = client
      .db("medicineShopDB")
      .collection("sellerAddedMedicines");

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user?.email };
      const existUser = await usersCollection.findOne(query);
      if (existUser) {
        return res.send({ message: "User Already Exists", insertedId: null });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const { role } = req.body;
      const validRoles = ["user", "seller", "admin"];
      if (!validRoles.includes(role)) {
        return res.status(400).send({ message: "Invalid role" });
      }
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: { role: role },
      };
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    app.get("/sellerMedicine", async (req, res) => {
      const result = await sellerMedicine.find().toArray();
      res.send(result);
    });
    app.post("/sellerMedicine", async (req, res) => {
      const medicine = req.body;
      const result = await sellerMedicine.insertOne(medicine);
      res.send(result);
    });

    app.get("/category", async (req, res) => {
      const result = await categoryCollection.find().toArray();
      res.send(result);
    });

    app.delete("/category/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await categoryCollection.deleteOne(query);
      res.send(result);
    });

    app.put("/category/:id", async (req, res) => {
      const id = req.params.id;
      const categoryData = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: categoryData,
      };
      const result = await categoryCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    app.post("/category", async (req, res) => {
      const data = req.body;
      const result = await categoryCollection.insertOne(data);
      res.send(result);
    });

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

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
