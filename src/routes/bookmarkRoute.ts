import express from "express";
import prisma from "../config/db";

const bookMarkRouter = express.Router();

bookMarkRouter.post("/add/:id", async(req:any, res)=>{
    try{
       const issueId = Number(req.params.id);
       const userId = req.userId;

       await prisma.bookmark.create({
        data: {
            userId,   
            issueId
      }
    });
    res.json({
        message: "Issue Marked!!"
    })
    }
    catch(err:any){
        res.status(400).json({
            message : "Error: "+err.message
        })
    }

});

export default bookMarkRouter;