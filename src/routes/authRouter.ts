import express from "express";
import prisma from "../config/db";

const authRouter = express.Router();

authRouter.post("/signup", async(req, res)=>{
    try{
       const name = req.body.name;
       const gitHubURL = req.body.gitHubURL
       const email = req.body.email;
       const password = req.body.password;

       if(!email || !password){
          throw new Error("Field Required!!");
       }

       const user = await prisma.user.create({
        data : {
            name,
            email,
            password,
            gitHubURL:gitHubURL
        }
       });

       res.json({
        message : "User added successfully!!",  
       });
    }
    catch(err:any){
        res.json({
            message : "Error: "+err.message
        });
    }
    
});

export default authRouter;