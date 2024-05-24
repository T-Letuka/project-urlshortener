require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const dns = require("dns");
const { MongoClient } = require("mongodb");

const client = new MongoClient(process.env.DB_URL);
const db = client.db("urlshorter");
const urls = db.collection("urls");

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/public", express.static(`${process.cwd()}/public`));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// Your first API endpoint
app.post("/api/shorturl", function (req, res) {
  const url = req.body.url;

  let hostname;
  try {
    const parsedUrl = new URL(url);
    hostname = parsedUrl.hostname;
  } catch (e) {
    return res.json({ error: "Invalid URL" });
  }

  dns.lookup(hostname, async (err, address) => {
    if (err || !address) {
      return res.json({ error: "Invalid URL" });
    } else {
      try {
        const urlCount = await urls.countDocuments({});
        const urlDoc = {
          original_url: url,
          short_url: urlCount + 1,
        };
        await urls.insertOne(urlDoc);
        res.json({ original_url: url, short_url: urlCount + 1 });
      } catch (error) {
        res.status(500).json({ error: "Database error" });
      }
    }
  });
});

app.get("/api/shorturl/:short_url", async (req, res) => {
  const shorturl = parseInt(req.params.short_url);
  const urlDoc = await urls.findOne({ short_url: shorturl });
  if (urlDoc) {
    res.redirect(urlDoc.original_url);
  } else {
    res.json({ error: "No short URL found for the given input" });
  }
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
