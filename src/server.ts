import express from "express";
import repoRouter from "./routes/repoRoute";
import aiRouter from "./routes/aiRoute";
import authRouter from "./routes/authRouter";
import { authUser } from "./middlewares/auth.middleware";
const app = express();

app.use(express.json())

app.get("/", (req, res) => {
   res.send("OpenScout Backend Running");
});
app.use("/", authUser,  repoRouter);
app.use("/", authUser, aiRouter);
app.use("/", authRouter);

app.listen(7777, () => {
   console.log("Server running on port 7777");
});