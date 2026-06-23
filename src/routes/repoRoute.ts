import express from "express"
import axios from "axios"
import prisma from "../config/db";
import { classifyDifficulty } from "../utils/classifyDifficulty";

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
            `https://api.github.com/repos/${owner}/${repoName}/issues?state=open&per_page=100`
        )

        const repoResponse = await axios.get(
            `https://api.github.com/repos/${owner}/${repoName}`
        );

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
                url : repoUrl,
                stars     : repoResponse.data.stargazers_count,
                language  : repoResponse.data.language,
                description : repoResponse.data.description
            }
        });

        for(const issue of issues){

            await prisma.issue.create({
                data : {
                    gitHubIssueId : issue.id,
                    title         : issue.title,
                    description   : issue.body,
                    labels        : issue.labels.map((label: any) => label.name),
                    difficulty    : classifyDifficulty(
                        issue.labels.map((label:any)=> label.name)),
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

repoRouter.get("/issues", async(req, res)=>{
    try{

       const page = Number(req.query.page) || 1;
       const limit = Number(req.query.limit) || 10;
       const {label, difficulty, language} = req.query; 
       const whereClause:any = {};
       if(difficulty){
        whereClause.difficulty = difficulty;
       }
       if(label){
        whereClause.labels = {
           has: label
        };
       }
       if(language){
        whereClause.repository = {
            language : language
        };
       }

       const totalIssues = await prisma.issue.count({
         where: whereClause
       });

       const issues = await prisma.issue.findMany({
        where: whereClause,
        include :{
            repository : true
        },
        skip : (page-1)*limit,
        take : limit
       });
       res.json({
         currentPage: page,
         totalPages: Math.ceil(totalIssues/limit),
         totalIssues,
         message: "Issues fetched successfully",
         data: JSON.parse(
         JSON.stringify(
           issues,
           (_, value) =>
            typeof value === "bigint"
               ? value.toString()
               : value
      )
   )
});
    }
    catch(err:any){
       res.status(400).json({
        message : "Error: "+err.message
       });
    }
});

repoRouter.get("/issue/:id", async(req, res)=>{
    try{
       const id = Number(req.params.id);

       const issues = await prisma.issue.findFirst({
        where : {
            id
        },
        include :{
            repository : true
        }
       });

       res.json({
        message : "Issue fetched Successfully",
        data: JSON.parse(
            JSON.stringify(
                issues,
                (_, value) =>
                typeof value === "bigint"
                ? value.toString()
                : value
            )
        )
       })
    }
    catch(err:any){
        res.status(400).json({
            message : "Error: "+err.message
        });
    }
});

repoRouter.get("/repo/:id/issues", async(req, res)=>{

    try{
        const id = Number(req.params.id);

        const repoIssues = await prisma.issue.findMany({
            where:{
                repositoryId : id,
            }
        });

        res.json({
             message: "Issues fetched for Current Repo",
            data: JSON.parse(
                JSON.stringify(
                    repoIssues,
                    (_, value) =>
                    typeof value === "bigint"
                    ? value.toString()
                    : value
                    )
                )
            });
    }
    catch(err:any){
        res.status(400).json({
            message : "Error :"+err.message
        });
    } 
});

repoRouter.get("/repos", async(req, res)=>{
    try{
      const repos = await prisma.repository.findMany();
      res.json({
        data : repos,
      });
    }
    catch(err : any){
        res.status(400).json({
            message : "Error : "+err.message
        });
    }   
});

repoRouter.get("/search", async(req, res)=>{
    try{

       const {q} = req.query; 
       if(!q){
        throw new Error("Search Query is required!!");
       }
       const issues = await prisma.issue.findMany({
        where:{
            OR: [
                {
                    title : {
                        contains : q as string,
                        mode : "insensitive"
                    }
                },
                {
                    description :{
                        contains : q as string,
                        mode : "insensitive"
                    }
                }
            ]
        },
        include: {
            repository: true
        }
       });

       res.json({
        message : "Search Results",
        data : JSON.parse(
            JSON.stringify(
                issues,
                (_, value) =>
                typeof value === "bigint"
                ? value.toString()
                : value
            )
        )
       })
    }
    catch(err:any){
       res.status(400).json({
        message : "Error : "+err.message
       })
    }
});

repoRouter.get("/repo/:id/refresh", async(req:any, res)=>{
    try{
        const repoid = Number(req.params.id);

        const repo = await prisma.repository.findFirst({
            where :{
                id : repoid
            }
        });
        if(!repo){
            throw new Error("No respository found");
        }
        const response = await axios.get(
            `https://api.github.com/repos/${repo.ownerName}/${repo.repoName}/issues?state=open&per_page=100`
        );
        const issues = response.data.filter(
            (item: any) => !item.pull_request
        );
        const existingIssues = await prisma.issue.findMany({
            where: {
                repositoryId: repo.id
            },
            select: {
                gitHubIssueId: true
            }
        });
        const existingIds = new Set(
            existingIssues.map(issue =>
            issue.gitHubIssueId.toString()
            )
        );
        let newIssues = 0;

        for (const issue of issues) {

        if (existingIds.has(issue.id.toString())) {
            continue;
        }

        await prisma.issue.create({
            data: {
                gitHubIssueId: issue.id,
                title: issue.title,
                description: issue.body || "",
                labels: issue.labels.map(
                (label: any) => label.name
            ),
            difficulty: classifyDifficulty(
                issue.labels.map(
                    (label: any) => label.name
                )
            ),
            repositoryId: repo.id
           }
        });

   newIssues++;
}
        res.json({
            message : "Refreshed!"
        })

    }
    catch(err:any){
        res.status(400).json({
            message : "Error :"+err.message
        });
    }
});


export default repoRouter;