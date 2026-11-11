import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAppointment extends Document {
  title: string;
  start?: Date;
  end?: Date;
  patient: mongoose.Types.ObjectId;
  dentist: mongoose.Types.ObjectId;
  status: 'scheduled' | 'checked-in' | 'in-treatment' | 'completed' | 'cancelled' | 'no-show';
  type: 'checkup' | 'cleaning' | 'x-ray' | 'surgery' | 'ortho' | 'other';
  treatment?: mongoose.Types.ObjectId;
  checkedInAt?: Date;
  seatedAt?: Date;
  completedAt?: Date;
  paidAt?: Date;
  notes?: string;
  fee?: number;
  currency?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema: Schema<IAppointment> = new Schema(
  {
    title: { type: String, required: true },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    patient: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    dentist: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['scheduled', 'checked-in', 'in-treatment', 'completed', 'cancelled', 'no-show'],
      default: 'scheduled'
    },
    type: {
      type: String,
      enum: ['checkup', 'cleaning', 'x-ray', 'surgery', 'ortho', 'other'],
      default: 'checkup'
    },
    treatment: { type: Schema.Types.ObjectId, ref: 'Treatment' },
    checkedInAt: { type: Date },
    seatedAt: { type: Date },
    completedAt: { type: Date },
    paidAt: { type: Date },
    notes: { type: String },
    fee: { type: Number, min: 0, default: 0 },
    currency: { type: String, default: 'PKR' },
  },
  { timestamps: true }
);

const Appointment: Model<IAppointment> = mongoose.models.Appointment || mongoose.model<IAppointment>('Appointment', AppointmentSchema);

export default Appointment;
