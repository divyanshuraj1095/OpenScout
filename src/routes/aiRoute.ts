import express from "express";
import prisma from "../config/db";
import { explainIssue } from "../services/groqService";
import { buildIssuePrompt } from "../prompt/explainIssuePrompt";
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

        const prompt = buildIssuePrompt(thisIssue.title, thisIssue.description || "");
        const explanation = await explainIssue(prompt);
        if(!explanation){
          throw new Error("No response from AI");
        }
        
        res.json({
            message : "Issue explained successfully!!",
            data : explanation
        })
    }
    catch(err:any){
        res.json({
            message : "Error: "+err.message
        })
    }  
});

export default aiRouter;