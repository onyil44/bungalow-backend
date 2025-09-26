import SettingsModel from "../models/settingsModel.js";
import catchAsync from "../utils/catchAsync.js";
import ApiController from "./apiController.js";

class SettingsController extends ApiController {
  constructor() {
    super();
    this._Model = SettingsModel;
  }

  deleteInactiveSettings = catchAsync(async (req, res, next) => {
    await this._Model.deleteMany({ isActive: false });
    res.status(204).json({
      status: "success",
      data: null,
    });
  });
}

export default new SettingsController();
