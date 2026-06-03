import express from "express";
import repoRouter from "./routes/repoRoute";
import aiRouter from "./routes/aiRoute";
const app = express();

app.use(express.json())

app.get("/", (req, res) => {
   res.send("OpenScout Backend Running");
});
app.use("/", repoRouter);
app.use("/", aiRouter);

app.listen(7777, () => {
   console.log("Server running on port 7777");
});