import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
const jwt = require("jsonwebtoken");
const prisma = new PrismaClient();


module.exports.isAuthorized = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(' ')[1];
  
    if (token == null) return res.status(401).send({
        msg: "Unauthorized!"
    })
  
    jwt.verify(token, process.env.TOKEN_SECRET as string, (err: any, user: any) => {
      console.log(err)
  
      if (err) return res.sendStatus(403)
  
      req.headers["user"] = user
  
      next()
    })
}