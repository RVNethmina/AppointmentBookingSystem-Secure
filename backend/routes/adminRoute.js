import express from "express";
import {
  addDoctor,
  allDoctors,
  loginAdmin,
  appointmentsAdmin,
  appointmentCancel,
  adminDashboard,
} from "../controllers/adminController.js";
import { uploadImage } from "../middleware/multer.js";
import authAdmin from "../middleware/authAdmin.js";
import { changeAvailability } from "../controllers/doctorController.js";

const adminRouter = express.Router();

// authenticate first, then parse and verify the upload
adminRouter.post("/add-doctor", authAdmin, uploadImage("image"), addDoctor);
adminRouter.post("/login", loginAdmin);
adminRouter.post("/all-doctors", authAdmin, allDoctors);
adminRouter.post("/change-availability", authAdmin, changeAvailability);
adminRouter.post("/cancel-appointment", authAdmin, appointmentCancel);

adminRouter.get("/appointments", authAdmin, appointmentsAdmin);
adminRouter.get("/dashboard", authAdmin, adminDashboard);

export default adminRouter;
