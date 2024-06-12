const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
require("dotenv").config();
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

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
    // await client.connect();

    const usersCollection = client.db("medicineShopDB").collection("users");
    const categoryCollection = client
      .db("medicineShopDB")
      .collection("Medicine_Category");
    const sellerMedicine = client
      .db("medicineShopDB")
      .collection("sellerAddedMedicines");
    const homeCategory = client.db("medicineShopDB").collection("Category");
    const AllItemsCollection = client
      .db("medicineShopDB")
      .collection("AllCategory");

    const addToCartCollection = client.db("medicineShopDB").collection("cart");
    const paymentCollection = client.db("medicineShopDB").collection("payment");
    const healthCollection = client
      .db("medicineShopDB")
      .collection("HealthTips");

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
      let seller = false;
      let users = false;

      if (user) {
        admin = user?.role === "admin";
        seller = user?.role === "seller";
        users = user?.role === "user";
      }

      res.send({ admin, seller, users });
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

    app.get("/homeCategory", async (req, res) => {
      const result = await homeCategory.find().toArray();
      res.send(result);
    });

    app.get("/allCategory", async (req, res) => {
      const result = await AllItemsCollection.find().toArray();
      res.send(result);
    });
    app.get("/allCategory/:name", async (req, res) => {
      const name = req.params.name;
      const query = { category: name };
      const result = await AllItemsCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/addToCart", async (req, res) => {
      const item = req.body;
      const result = await addToCartCollection.insertOne(item);
      res.send(result);
    });

    app.get("/addToCart", async (req, res) => {
      const result = await addToCartCollection.find().toArray();
      res.send(result);
    });

    // Update item quantity in the cart
    app.put("/addToCart/:id", async (req, res) => {
      const id = req.params.id;
      const { quantity } = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: { quantity: quantity },
      };
      const result = await addToCartCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // Remove an item from the cart
    app.delete("/addToCart/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await addToCartCollection.deleteOne(query);
      res.send(result);
    });

    // Clear the entire cart
    app.delete("/addToCart", async (req, res) => {
      const result = await addToCartCollection.deleteMany({});
      res.send(result);
    });

    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount, "amount inside the intent");

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });
    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);

      console.log("payment info", payment);
      const query = {
        _id: {
          $in: payment.cartIds.map((id) => new ObjectId(id)),
        },
      };
      const deleteResult = await addToCartCollection.deleteMany(query);

      res.send({ paymentResult, deleteResult });
    });

    app.get("/payments/:email", async (req, res) => {
      const query = { email: req.params.email };
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/payments", async (req, res) => {
      const result = await paymentCollection.find().toArray();
      res.send(result);
    });
    app.get("/overview", async (req, res) => {
      try {
        const totalSales = await paymentCollection
          .aggregate([{ $group: { _id: null, total: { $sum: "$price" } } }])
          .toArray();

        const paidTotal = await paymentCollection
          .aggregate([
            { $match: { status: "paid" } },
            { $group: { _id: null, total: { $sum: "$price" } } },
          ])
          .toArray();

        const pendingTotal = await paymentCollection
          .aggregate([
            { $match: { status: "pending" } },
            { $group: { _id: null, total: { $sum: "$price" } } },
          ])
          .toArray();

        res.send({
          totalSales: totalSales[0]?.total || 0,
          paidTotal: paidTotal[0]?.total || 0,
          pendingTotal: pendingTotal[0]?.total || 0,
        });
      } catch (error) {
        res.status(500).send({ error: "Internal Server Error" });
      }
    });

    app.patch("/payments/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: { status: "paid" },
      };
      const result = await paymentCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.get("/healthTips", async (req, res) => {
      const result = await healthCollection.find().toArray();
      res.send(result);
    });

    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
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
