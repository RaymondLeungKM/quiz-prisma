import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
const jwt = require("jsonwebtoken");
const prisma = new PrismaClient();

export interface APIRequest extends Request {
  user: {
    id: number;
    name: String;
    isAdmin: Boolean;
    exp: Date;
  };
}

module.exports.isAuthorized = async (
  req: APIRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null)
    return res.status(401).send({
      msg: "Unauthorized!",
    });

  jwt.verify(
    token,
    process.env.TOKEN_SECRET as string,
    (err: any, user: any) => {
      if (err) {
        console.log("auth error=", err);
        return res.status(403).send({
          code: "E403JWT",
          msg: "JWT expired!"
        });
      }

      req.user = user;

      next();
    }
  );
};
