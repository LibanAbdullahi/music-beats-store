const express = require("express");
const http = require("http");
const server = http.createServer();

const next = require("next");
// const MongoClient = require("mongodb").MongoClient;
const { MongoClient, ObjectId } = require("mongodb");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

// multer is a middleware for handling multipart/form-data, which is primarily used for uploading files

const multer = require("multer");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/beats");
  },
  filename: (req, file, cb) => {
    cb(null, `${file.originalname}-${Date.now()}`);
  },
});

const upload = multer({ storage }).single("file");

// socket.io is a library that enables real-time, bidirectional and event-based communication between the browser and the server
const io = require("socket.io")(3000);

io.on("connection", socket => {
  console.log("a user connected");
});

app.prepare().then(() => {
  const server = express();

  server.use(express.json());
  server.use((req, res, next) => {
    req.io = io;
    next();
  });

  server.get("/api/beats", async (req, res) => {
    const client = new MongoClient(process.env.MONGODB_URI, {
      useNewUrlParser: true,
    });
    await client.connect();
    const beats = await client
      .db("my-app")
      .collection("beats")
      .find()
      .toArray();
    client.close();
    res.json(beats);
  });

  //   server.post("/api/beats", async (req, res) => {
  //     upload(req, res, async err => {
  //       if (err) {
  //         return res.sendStatus(500);
  //       }
  //       const client = new MongoClient(process.env.MONGODB_URI, {
  //         useNewUrlParser: true,
  //       });
  //       await client.connect();
  //       const { name, price, isPremium } = req.body;
  //       const file = req.file;
  //       const result = await client
  //         .db("my-app")
  //         .collection("beats")
  //         .insertOne({ name, price, file, isPremium });
  //       client.close();
  //       if (result) {
  //         req.io.emit("new-beat", result.ops[0]);
  //         res.json(result.ops[0]);
  //       } else {
  //         res.sendStatus(500);
  //       }
  //     });
  //   });

  server.post("/api/beats", async (req, res) => {
    upload(req, res, async err => {
      if (err) {
        console.error(err); // log the error for debugging purposes
        return res.sendStatus(500); // return a 500 status code to indicate an error occurred
      }

      // Check if the file was successfully uploaded
      if (!req.file) {
        console.error("No file was uploaded"); // log an error for debugging purposes
        return res.sendStatus(400); // return a 400 status code to indicate a bad request
      }

      // Connect to the MongoDB database
      const client = new MongoClient(process.env.MONGODB_URI, {
        useNewUrlParser: true,
      });
      try {
        await client.connect();

        // Extract the data from the request body and file
        const { name, price, isPremium } = req.body;
        const { originalname, filename } = req.file;

        // Insert the data into the "beats" collection
        const result = await client
          .db("my-app")
          .collection("beats")
          .insertOne({ name, price, originalname, filename, isPremium });

        // Emit an event to all connected clients and send the inserted document in the response
        req.io.emit("new-beat", result.ops[0]);
        res.json(result.ops[0]);
      } catch (error) {
        console.error(error); // log the error for debugging purposes
        res.sendStatus(500); // return a 500 status code to indicate an error occurred
      } finally {
        client.close(); // close the connection to the database
      }
    });
  });

  server.delete("/api/beats/:id", async (req, res) => {
    const client = new MongoClient(process.env.MONGODB_URI, {
      useNewUrlParser: true,
    });
    await client.connect();
    const result = await client
      .db("my-app")
      .collection("beats")
      .deleteOne({ _id: ObjectId(req.params.id) });
    client.close();
    if (result.deletedCount > 0) {
      req.io.emit("delete-beat", req.params.id);
      res.sendStatus(204);
    } else {
      res.sendStatus(404);
    }
  });

  //   server.get("*", (req, res) => {
  //     return handle(req, res);
  //   });
  /* To generate clickable links for the beats that are coming from your database, 
  you can modify the server-side rendering to fetch the beats from the database 
  and generate the HTML list with clickable links for each beat. Here is an example of how you can do this */
  server.get("*", async (req, res) => {
    // Connect to the MongoDB database
    const client = new MongoClient(process.env.MONGODB_URI, {
      useNewUrlParser: true,
    });
    try {
      await client.connect();

      // Find all beats in the "beats" collection
      const beats = await client
        .db("my-app")
        .collection("beats")
        .find()
        .toArray();

      // Generate an HTML list of beats with clickable links for each beat
      const html = `
        <ul>
          ${beats
            .map(beat => {
              return `<li><a href="/beats/${beat.id}">${beat.name}</a></li>`;
            })
            .join("")}
        </ul>
      `;

      return handle(req, res, html);
    } catch (error) {
      console.error(error); // log the error for debugging purposes
      res.sendStatus(500); // return a 500 status code to indicate an error occurred
    } finally {
      client.close();
    }
  });

  // Edit
  server.put("/api/beats/:id/edit", async (req, res) => {
    const { id } = req.params;
    const { name, price } = req.body;
    const file = req.file;
    const client = new MongoClient(process.env.MONGODB_URI, {
      useNewUrlParser: true,
    });
    await client.connect();
    const result = await client
      .db("my-app")
      .collection("beats")
      .updateOne({ _id: ObjectId(id) }, { $set: { name, price, file } });
    client.close();
    if (result) {
      req.io.emit("update-beat", { id, name, price, file });
      res.json({ id, name, price, file });
    } else {
      res.sendStatus(500);
    }
  });

  server.listen(3001, err => {
    if (err) throw err;
    console.log("> Ready on http://localhost:3001");
  });
});
