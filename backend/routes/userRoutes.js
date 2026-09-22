import express from "express";
import {
  registerUser,
  loginUser,
  googleLogin,
  googleNonce,
  getProfile,
  updateProfile,
  bookAppointment,
  listAppointment,
  cancelAppointment,
} from "../controllers/UserController.js";
import authUser from "../middleware/authUser.js";
import { uploadImage } from "../middleware/multer.js";


const useRouter = express.Router();

useRouter.post("/register", registerUser);
useRouter.post("/login", loginUser);
useRouter.get("/auth/google/nonce", googleNonce);
useRouter.post("/auth/google", googleLogin);
// authenticate first, then parse and verify the upload
useRouter.post(
  "/update-profile",
  authUser,
  uploadImage("image"),
  updateProfile
);
useRouter.post("/book-appointment", authUser, bookAppointment);
useRouter.post("/cancel-appointment", authUser, cancelAppointment);

useRouter.get("/get-profile", authUser, getProfile);
useRouter.get("/appointments", authUser, listAppointment);

export default useRouter;
