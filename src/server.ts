import express from "express";
import cors from "cors";
import repoRouter from "./routes/repoRoute";
import aiRouter from "./routes/aiRoute";
import authRouter from "./routes/authRouter";
import { authUser } from "./middlewares/auth.middleware";
import bookMarkRouter from "./routes/bookmarkRoute";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

const app = express();
dotenv.config();

app.use(
   cors({
      origin: "http://localhost:5173",
      credentials: true,
   })
);
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
   res.send("OpenScout Backend Running");
});
app.use("/", authRouter);
app.use("/", authUser,  repoRouter);
app.use("/", authUser, aiRouter);
app.use("/", authUser, bookMarkRouter);

app.listen(7777, () => {
   console.log("Server running on port 7777");
});