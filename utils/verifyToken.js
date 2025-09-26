import jwt from "jsonwebtoken";
import { promisify } from "util";

const verifyToken = async function ({ token, tokenType = "access" }) {
  let secret = "";
  if (tokenType === "access") secret = process.env.ACCESS_TOKEN_SECRET;
  if (tokenType === "refresh") secret = process.env.REFRESH_TOKEN_SECRET;

  try {
    return await promisify(jwt.verify)(token, secret);
  } catch (err) {
    if (tokenType === "access") return null;
    if (tokenType === "refresh") throw err;
  }
};

export default verifyToken;
