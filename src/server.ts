import express from "express";
import repoRouter from "./routes/repoRoute";
import aiRouter from "./routes/aiRoute";
import authRouter from "./routes/authRouter";
const app = express();

app.use(express.json())

app.get("/", (req, res) => {
   res.send("OpenScout Backend Running");
});
app.use("/", repoRouter);
app.use("/", aiRouter);
app.use("/", authRouter);

app.listen(7777, () => {
   console.log("Server running on port 7777");
});