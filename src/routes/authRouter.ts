import express from "express";
import prisma from "../config/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { authUser } from "../middlewares/auth.middleware";

const authRouter = express.Router();

authRouter.post("/signup", async(req : any, res)=>{
    try{
       const name = req.body.name;
       const gitHubURL = req.body.gitHubURL
       const email = req.body.email;
       const password = req.body.password;

       console.log("check")

       if(!email || !password){
          throw new Error("Field Required!!");
       }
       console.log("check");
       const hashPassword = await bcrypt.hash(password, 10);
       console.log("check")
       const user = await prisma.user.create({
        data : {
            name,
            email,
            password : hashPassword,
            gitHubURL:gitHubURL
        }
       });
       console.log("check");

       res.json({
        message : "User added successfully!!",  
       });
    }
    catch(err:any){
        res.status(400).json({
            message : "Error: "+err.message
        });
    }
    
});

authRouter.post("/login", async(req, res)=>{
    try{
        const {email, password} = req.body;

        if(!email || !password){
           throw new Error("Please enter values!!");
        }

        const logUser = await prisma.user.findUnique({
            where : {
                email : email
            }
        });
        if(!logUser){
            throw new Error("User not found");
        }
        const isMatch = await bcrypt.compare(password,logUser.password);
        if(!isMatch){
            throw new Error("Invalid Credentials");
        }
        const token = await jwt.sign({id : logUser.id},process.env.JWT!, {expiresIn : "7d"});
        res.cookie("token", token, {
            httpOnly: true,
            secure: false,
            sameSite: "lax"
        })

        res.json({
            message : "Loggin Successful"
        })
    }
    catch(err : any){
        res.status(400).json({
            message : "Error: "+err.message
        });
    }
    
});

authRouter.post("/logout", async(req, res)=>{
    res.clearCookie("token");
    res.send("Logged out successfully !!");
})

authRouter.get("/profile", authUser, async (req: any, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            select: {
                id: true,
                name: true,
                email: true,
                gitHubURL: true,
                openedRepos: true,
                createdAt: true
            }
        });
        if (!user) {
            throw new Error("User not found");
        }
        res.json({
            message: "Profile fetched successfully",
            data: user
        });
    } catch (err: any) {
        res.status(400).json({
            message: "Error: " + err.message
        });
    }
});

export default authRouter;