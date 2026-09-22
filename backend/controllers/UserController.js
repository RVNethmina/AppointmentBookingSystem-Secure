import validator from "validator";
import bcrypt from "bcrypt";
import userModel from "../models/userModel.js";
import { signAccessToken } from "../utils/token.js";
import { v2 as cloudinary } from "cloudinary";
import doctorModel from "../models/doctorModel.js";
import appointmentModel from "../models/AppointmentModel.js";
import razorpay from "razorpay";
import googleVerifier from "../utils/google.js";

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

    // the same answer whether or not the account exists
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid Credentials!" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
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
        // link the Google identity to the existing account
        user.googleId = payload.sub;
        await user.save();
      } else {
        const userData = {
          name: payload.name || payload.email,
          email: payload.email,
          googleId: payload.sub,
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
    const { name, phone, address, dob, gender } = req.body;

    const imageFile = req.file;

    if (!name || !phone || !dob || !gender) {
      return res.json({ success: false, message: "Data Missing!" });
    }

    await userModel.findByIdAndUpdate(userId, {
      name,
      phone,
      address: JSON.parse(address),
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

    //find the doctor
    const docData = await doctorModel.findById(docId).select("-password");

    //doctor is not available sending response
    if (!docData.available) {
      return res.json({ success: false, message: "Doctor not Available!" });
    }

    //create copy of slots_booked data if doctor available
    let slots_booked = docData.slots_booked;

    //checking for slots availability for this date and this time
    if (slots_booked[slotDate]) {
      if (slots_booked[slotDate].includes(slotTime)) {
        return res.json({ success: false, message: "Slot not Available!" });
      } else {
        //book that slot
        slots_booked[slotDate].push(slotTime);
      }
    } else {
      slots_booked[slotDate] = [];
      slots_booked[slotDate].push(slotTime);
    }

    //getting user data
    const userData = await userModel.findById(userId).select("-password");

    //deleting slots_booked data from the doctor data because we have to save this data in appintment data
    delete docData.slots_booked;

    const appointmentData = {
      userId,
      docId,
      userData,
      docData,
      amount: docData.fees,
      slotTime,
      slotDate,
      date: Date.now(),
    };

    //save appointment in the database
    const newAppointment = new appointmentModel(appointmentData);
    await newAppointment.save();

    //save new slots data in doctors docData
    await doctorModel.findByIdAndUpdate(docId, { slots_booked });

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

    const appointmentData = await appointmentModel.findById(appointmentId);

    //verify appointment user
    if (appointmentData.userId !== userId) {
      return res.json({ success: false, message: "Unauthorised Action!" });
    }

    //cancel appointment
    await appointmentModel.findByIdAndUpdate(appointmentId, {
      cancelled: true,
    });

    //releasing cancelled doctor slot
    const { docId, slotDate, slotTime } = appointmentData;

    const doctorData = await doctorModel.findById(docId);

    let slots_booked = doctorData.slots_booked;

    slots_booked[slotDate] = slots_booked[slotDate].filter(
      (e) => e !== slotTime
    );

    await doctorModel.findByIdAndUpdate(docId, { slots_booked });

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
