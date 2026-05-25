import express from "express"
import axios from "axios"
import prisma from "../config/db";

const repoRouter = express.Router();

repoRouter.post("/repo", async (req, res)=>{
    try{
        
        const repoUrl = req.body.repoUrl;
        if(!repoUrl.includes("github.com")){
            throw new Error("Invalid Github url")
        }
        const part = repoUrl.split("/");

        const owner = part[3];
        const repoName = part[4];

        const response = await axios.get(
            `https://api.github.com/repos/${owner}/${repoName}/issues`
        )

        const issues = response.data.filter(
            (item : any) => !item.pull_request
        )
        console.log(issues.length)

        const existingRepo = await prisma.repository.findFirst({
            where:{
                repoName,
                ownerName : owner
            }
        });

        if(existingRepo){
            throw new Error("Repository already exists!!");
        }

        const savedRepo = await prisma.repository.create({
            data : {
                repoName : repoName,
                ownerName : owner,
                url : repoUrl
            }
        });

        for(const issue of issues){

            await prisma.issue.create({
                data : {
                    gitHubIssueId : issue.id,
                    title         : issue.title,
                    description   : issue.description,
                    labels        : issue.labels.map((label: any) => label.name),
                    repositoryId  : savedRepo.id
                }
            })
        }

        res.json({
            message : "Repository Added Successfully!!",
            data : issues.length
        })
    }
    catch(err : any){
        res.status(400).json({
            message : "Error : "+err.message
        });
    }
});

repoRouter.get("/getrepo", async(req, res)=>{
})

export default repoRouter