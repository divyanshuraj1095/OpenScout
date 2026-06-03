import express from "express";
import prisma from "../config/db";
const aiRouter = express.Router();

aiRouter.get("/explain/:id", async(req, res)=>{
    try{
       const id = Number(req.params.id);
       const thisIssue = await prisma.issue.findFirst({
            where :{
                id
            },
            include :{
                repository : true
            }       
        });

        if(!thisIssue){
           throw new Error("Issue not found");
        }

        const prompt = `
            Repository: ${thisIssue.repository.repoName}

            Issue Title:
                ${thisIssue.title}

            Issue Description:
                ${thisIssue.description}

            Explain this issue in simple terms.
            Tell me:
            1. What the problem is.
            2. Skills needed.
            3. Whether it is beginner, intermediate or advanced.
            `;
    }
    catch(err:any){
        res.json({
            message : "Error: "+err.message
        })
    }
    

});

export default aiRouter;