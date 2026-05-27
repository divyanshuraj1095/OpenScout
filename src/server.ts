import express from "express";
import repoRouter from "./routes/repoRoute";
const app = express();

app.use(express.json())

app.get("/", (req, res) => {
   res.send("OpenScout Backend Running");
});
app.use("/", repoRouter);

app.listen(7777, () => {
   console.log("Server running on port 7777");
});