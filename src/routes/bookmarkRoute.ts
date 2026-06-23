import express from "express";
import prisma from "../config/db";
import { authUser } from "../middlewares/auth.middleware";

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

bookMarkRouter.get("/bookmarks", async(req : any, res) =>{
    try{
        const userId = req.userId;
        const allBookMarks = await prisma.bookmark.findMany({
            where : {
                userId 
            },
            include:{
                issue : true
            }
        });

        res.json({
            message: "BookMarks fetched successfully!!",
            data: JSON.parse(
                JSON.stringify(
                    allBookMarks,
                    (_, value) =>
                    typeof value === "bigint"
                    ? value.toString()
                    : value
            )
            )
        });
    }
    catch(err : any){
        res.status(400).json({
            message : "Error: "+err.message
        });
    }
});

bookMarkRouter.delete("/deletemarker/:id", async(req : any, res)=>{
    try{
       const id = Number(req.params.id);
       await prisma.bookmark.deleteMany({
        where :{
            userId : req.userId,
            id
        }
       });
       res.json({
        message : "bookmark removed successfully !!"
       })
    }
    catch(err:any){
       res.status(400).json({
        message : "Error: "+err.message
       })
    }
});

bookMarkRouter.delete("/bookmarks/:issueId", async(req : any, res)=>{
    try{
       const issueId = Number(req.params.issueId);
       await prisma.bookmark.deleteMany({
        where :{
            userId : req.userId,
            issueId
        }
       });
       res.json({
        message : "bookmark removed successfully !!"
       })
    }
    catch(err:any){
       res.status(400).json({
        message : "Error: "+err.message
       })
    }
});

bookMarkRouter.post("/bookmarks/add/:id", async(req:any, res)=>{
    try{
       const issueId = Number(req.params.id);
       const userId = req.userId;

       const existing = await prisma.bookmark.findFirst({
           where: { userId, issueId }
       });
       if(existing) {
           return res.json({ message: "Issue already bookmarked!!" });
       }

       await prisma.bookmark.create({
        data: {
            userId,   
            issueId
        }
       });
       res.json({
           message: "Issue Marked!!"
       });
    }
    catch(err:any){
        res.status(400).json({
            message : "Error: "+err.message
        });
    }
});

export default bookMarkRouter;