import Users from "../models/usersModel.js";
import apiTranslation from "../utils/apiTranslation.js";
import AppError from "../utils/appError.js";
import catchAsync from "../utils/catchAsync.js";
import verifyToken from "../utils/verifyToken.js";

const protect = catchAsync(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies?.ACCESS_TOKEN) {
    token = req.cookies.ACCESS_TOKEN;
  }

  if (!token) return next(new AppError("Not Authorized", 401));

  const decoded = await verifyToken({ token, tokenType: "access" });
  if (!decoded) return next(new AppError("Not Authorized", 401));

  const currentUser = await Users.findById(decoded.id, "+passwordChangeAt");

  if (!currentUser)
    return next(
      new AppError(
        apiTranslation.translate(req.query.lang, "notExistUser"),
        403
      )
    );

  if (currentUser.passwordChangedAfter(decoded.iat))
    return next(
      new AppError(
        apiTranslation.translate(req.query.lang, "changedPassword"),
        403
      )
    );
  req.user = currentUser;
  next();
});

export default protect;
