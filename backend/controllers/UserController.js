import validator from "validator";
import bcrypt from "bcrypt";
import userModel from "../models/userModel.js";
import { signAccessToken } from "../utils/token.js";
import { v2 as cloudinary } from "cloudinary";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/AppointmentModel.js";
import razorpay from "razorpay";
import googleVerifier from "../utils/google.js";
import { verifyPassword } from "../utils/password.js";
import {
  isValidObjectId,
  isValidSlotDate,
  isValidSlotTime,
  parseAddress,
  isValidName,
  isValidPhone,
  isValidDob,
  isValidGender,
} from "../utils/validators.js";
import { releaseSlot } from "../utils/slots.js";

// API to register user
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // only plain strings may reach the database query
    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name || !password || !email
    ) {
      return res.status(400).json({ success: false, message: "Missing Details!" });
    }

    //validating email format
    if (!validator.isEmail(email)) {
      return res.json({ success: false, message: "Enter a Valid Email!" });
    }

    //validating strong password
    if (password.length < 8) {
      return res.json({ success: false, message: "Enter a Strong Password!" });
    }

    //Hasing user password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userData = {
      name,
      email,
      password: hashedPassword,
    };

    const newUser = new userModel(userData);
    const user = await newUser.save();

    //create token for the user to login
    const token = signAccessToken({ id: user._id, role: "user" });

    res.json({ success: true, token });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Something went wrong!" });
  }
};

//API for user login
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // only plain strings may reach the database query
    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ success: false, message: "Invalid Credentials!" });
    }

    const user = await userModel.findOne({ email });

    // always exactly one bcrypt comparison, so neither the answer nor the
    // response time reveals whether the account exists
    const isMatch = await verifyPassword(password, user && user.password);

    if (user && isMatch) {
      const token = signAccessToken({ id: user._id, role: "user" });
      res.json({ success: true, token });
    } else {
      res.status(401).json({ success: false, message: "Invalid Credentials!" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Something went wrong!" });
  }
};

//API for Google sign-in (OpenID Connect ID token)
const googleLogin = async (req, res) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({ success: false, message: "Google sign-in is not configured." });
    }

    const { credential } = req.body;
    if (typeof credential !== "string" || !credential) {
      return res.status(400).json({ success: false, message: "Missing Details!" });
    }

    let payload;
    try {
      payload = await googleVerifier.verify(credential);
    } catch (error) {
      return res.status(401).json({ success: false, message: "Google sign-in failed." });
    }

    // only accept identities whose email address Google has verified
    if (!payload || !payload.sub || !payload.email || payload.email_verified !== true) {
      return res.status(401).json({ success: false, message: "Google sign-in failed." });
    }

    // find by Google subject first, then by email address
    let user = await userModel.findOne({ googleId: payload.sub });

    if (!user) {
      user = await userModel.findOne({ email: payload.email });

      if (user) {
        // Link the Google identity to the existing account. Local sign-up
        // never verified ownership of the address, so whoever set the
        // password may not be its owner (account pre-hijacking): remove
        // the password and revoke every session issued before now.
        user.googleId = payload.sub;
        user.password = undefined;
        user.authProvider = "google";
        user.sessionsValidAfter = new Date(Math.floor(Date.now() / 1000) * 1000);
        await user.save();
      } else {
        const userData = {
          name: payload.name || payload.email,
          email: payload.email,
          googleId: payload.sub,
          authProvider: "google",
        };
        if (payload.picture) {
          userData.image = payload.picture;
        }
        user = await userModel.create(userData);
      }
    }

    const token = signAccessToken({ id: user._id, role: "user" });
    res.json({ success: true, token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Something went wrong!" });
  }
};

//API to get user profile data

const getProfile = async (req, res) => {
  try {
    const userId = req.auth.id;
    const userData = await userModel.findById(userId).select("-password");

    res.json({ success: true, userData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Something went wrong!" });
  }
};

//API to update user profile

const updateProfile = async (req, res) => {
  try {
    const userId = req.auth.id;
    const { name, phone, dob, gender } = req.body;

    const imageFile = req.file;

    // only the listed fields are accepted, and each one is validated
    const address = parseAddress(req.body.address);
    if (
      !isValidName(name) ||
      !isValidPhone(phone) ||
      !isValidDob(dob) ||
      !isValidGender(gender) ||
      !address
    ) {
      return res.status(400).json({ success: false, message: "Invalid profile details!" });
    }

    await userModel.findByIdAndUpdate(userId, {
      name: name.trim(),
      phone,
      address,
      dob,
      gender,
    });

    if (imageFile) {
      //upload image to cloudinary
      const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
        resource_type: "image",
      });
      const imageURL = imageUpload.secure_url;

      await userModel.findByIdAndUpdate(userId, { image: imageURL });
    }

    res.json({ success: true, message: "Profile Updated!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Something went wrong!" });
  }
};

//API to book appointment

const bookAppointment = async (req, res) => {
  try {
    //get data from the request
    const userId = req.auth.id;
    const { docId, slotDate, slotTime } = req.body;

    if (!isValidObjectId(docId) || !isValidSlotDate(slotDate) || !isValidSlotTime(slotTime)) {
      return res.status(400).json({ success: false, message: "Invalid booking details!" });
    }

    //getting user data (only the fields shown to doctors and the admin)
    const userData = await userModel.findById(userId).select("name image dob");
    if (!userData) {
      return res.status(401).json({ success: false, message: "Not Authorised, Login again!" });
    }

    // Check and reserve the slot in ONE conditional update. MongoDB applies
    // it atomically to the doctor document, so of several concurrent
    // requests for the same slot only one can match.
    const slotPath = `slots_booked.${slotDate}`;
    const docData = await doctorModel.findOneAndUpdate(
      { _id: docId, available: true, [slotPath]: { $ne: slotTime } },
      { $push: { [slotPath]: slotTime } },
      { projection: { name: 1, image: 1, speciality: 1, address: 1, fees: 1 } }
    );

    if (!docData) {
      return res.json({ success: false, message: "Slot not Available!" });
    }

    // store only the fields that are displayed
    const appointmentData = {
      userId,
      docId,
      userData: { name: userData.name, image: userData.image, dob: userData.dob },
      docData: {
        name: docData.name,
        image: docData.image,
        speciality: docData.speciality,
        address: docData.address,
      },
      amount: docData.fees,
      slotTime,
      slotDate,
      date: Date.now(),
    };

    try {
      await appointmentModel.create(appointmentData);
    } catch (error) {
      // give the slot back if the appointment could not be saved
      await releaseSlot(docId, slotDate, slotTime);
      throw error;
    }

    res.json({ success: true, message: "Appointment Booked!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Something went wrong!" });
  }
};

//API to get user Appointments for frontend my-appointment page
const listAppointment = async (req, res) => {
  try {
    const userId = req.auth.id;
    const appointments = await appointmentModel.find({ userId });

    res.json({ success: true, appointments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Something went wrong!" });
  }
};

//API to cancel appointment
const cancelAppointment = async (req, res) => {
  try {
    const userId = req.auth.id;
    const { appointmentId } = req.body;

    if (!isValidObjectId(appointmentId)) {
      return res.status(400).json({ success: false, message: "Invalid appointment!" });
    }

    // atomic transition: only the owner's active appointment can be cancelled,
    // and only once
    const appointmentData = await appointmentModel.findOneAndUpdate(
      { _id: appointmentId, userId, cancelled: false, isCompleted: false },
      { cancelled: true }
    );

    if (!appointmentData) {
      return res.json({ success: false, message: "Cancellation failed!" });
    }

    //releasing cancelled doctor slot
    await releaseSlot(appointmentData.docId, appointmentData.slotDate, appointmentData.slotTime);

    res.json({ success: true, message: "Appointment Cancelled!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Something went wrong!" });
  }
};

export {
  registerUser,
  loginUser,
  googleLogin,
  getProfile,
  updateProfile,
  bookAppointment,
  listAppointment,
  cancelAppointment,
};
