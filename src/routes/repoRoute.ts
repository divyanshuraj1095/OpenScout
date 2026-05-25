import express from "express"
import axios from "axios"

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
        console.log(issues);

        res.json({
            message : "Github user and reponame fetched successfully",
            data : issues
        })
    }
    catch(err : any){
        res.status(400).json({
            message : "Error : "+err.message
        });
    }
});

export default repoRouter