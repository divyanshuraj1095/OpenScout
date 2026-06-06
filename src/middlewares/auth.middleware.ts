import jwt from "jsonwebtoken";

export const authUser = (req: any, res: any, next: any) => {
    try {
        const token = req.cookies.token;

        if (!token) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const decoded: any = jwt.verify(
            token,
            process.env.JWT!
        );

        req.userId = decoded.id;

        next();
    }
    catch (err: any) {
        res.status(401).json({
            message: "Error: " + err.message
        });
    }
};