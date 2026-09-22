import doctorModel from "../models/doctorModel.js";

// Atomically removes a booked time from a doctor's slot map.
const releaseSlot = (docId, slotDate, slotTime) =>
  doctorModel.updateOne(
    { _id: docId },
    { $pull: { [`slots_booked.${slotDate}`]: slotTime } }
  );

export { releaseSlot };
