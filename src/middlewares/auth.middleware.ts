import jwt from "jsonwebtoken";

export const authUser = (req :any, res:any, next:any)=>{
    try{
       const token = req.cookie.token;
       if(!token){
        res.status(401).json({
            message : "Unauthorized"
        });
       }

       const decoded : any = jwt.verify(
        token, process.env.JWT!
       );
       req.id = decoded.id;
       next(); 
    }
    catch(err:any){
        res.json({
            message : "Error: "+err.message
        })
    }
    
}