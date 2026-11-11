import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPatient extends Document {
  patientCode?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other';
  address?: string;
  medicalHistory: string[];
  dentist: mongoose.Types.ObjectId; // Reference to the dentist managing this patient
  createdAt: Date;
  updatedAt: Date;
  
  // Virtual for full name
  fullName: string;
}

const PatientSchema: Schema<IPatient> = new Schema(
  {
    patientCode: { type: String, unique: true, sparse: true, index: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    dateOfBirth: { type: Date, required: true },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    address: { type: String },
    medicalHistory: [{ type: String }],
    dentist: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Auto-generate a friendly patient code like PAT-00001
import Counter from './Counter';

PatientSchema.pre('save', async function() {
  if (this.patientCode) return;
  const counter = await Counter.findByIdAndUpdate(
    'patient',
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  const seq = counter?.seq ?? 1;
  this.patientCode = `PAT-${String(seq).padStart(5, '0')}`;
});

// Virtual property for full name
PatientSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

const Patient: Model<IPatient> = mongoose.models.Patient || mongoose.model<IPatient>('Patient', PatientSchema);

export default Patient;
