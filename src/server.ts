import express from "express";
const app = express();

app.use(express.json())

app.get("/", (req, res) => {
   res.send("OpenScout Backend Running");
});

app.listen(7777, () => {
   console.log("Server running on port 7777");
});