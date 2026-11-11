import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPatientRecord extends Document {
  patient: mongoose.Types.ObjectId;
  recordType: 'X-Ray' | 'Past Report' | 'Prescription' | 'Lab Result' | 'Clinical Note';
  title?: string;
  fileUrl?: string;
  date: Date;
  description?: string;
  uploadedBy: 'Patient' | 'Doctor';
  createdAt: Date;
  updatedAt: Date;
}

const PatientRecordSchema: Schema<IPatientRecord> = new Schema(
  {
    patient: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    recordType: {
      type: String,
      enum: ['X-Ray', 'Past Report', 'Prescription', 'Lab Result', 'Clinical Note'],
      required: true
    },
    title: { type: String },
    fileUrl: { type: String },
    date: { type: Date, default: Date.now },
    description: { type: String },
    uploadedBy: { 
      type: String, 
      enum: ['Patient', 'Doctor'], 
      default: 'Doctor' 
    },
  },
  { timestamps: true }
);

// In dev hot-reload, delete cached model so schema updates (like new enum values) apply
if (mongoose.models.PatientRecord) {
  delete mongoose.models.PatientRecord;
}

const PatientRecord: Model<IPatientRecord> = mongoose.model<IPatientRecord>('PatientRecord', PatientRecordSchema);

export default PatientRecord;
