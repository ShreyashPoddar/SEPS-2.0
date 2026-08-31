import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      required: true,
      unique: true,
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentProjectApply",
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    projectTitle: {
      type: String,
      default: "",
    },
    facultyName: {
      type: String,
      default: "",
    },
    targetMember: {
      studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      name: {
        type: String,
        required: true,
      },
      regNo: {
        type: String,
        required: true,
      },
      department: {
        type: String,
        default: "",
      },
    },
    changeType: {
      type: String,
      enum: ["name_correction", "replacement", "withdrawal"],
      required: true,
    },
    requestedChanges: {
      correctedName: { type: String },
      correctedRegNo: { type: String },
      replacementStudent: {
        _id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        fullName: { type: String },
        regNo: { type: String },
        department: { type: String },
        internshipStatus: { type: String },
      },
    },
    reason: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "in_review", "approved", "rejected"],
      default: "pending",
    },
    progressStep: {
      type: Number,
      default: 1, // 1: Submitted, 2: Faculty Review, 3: HoD Approval, 4: Roster Updated
    },
    coordinatorRemarks: {
      type: String,
      default: "",
    },
    timeline: [
      {
        step: { type: String, required: true },
        date: { type: Date, default: Date.now },
        message: { type: String },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Ticket", ticketSchema);
