import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITreatment extends Document {
  name: string;
  code?: string;
  description?: string;
  price: number;
  currency: string;
  durationMinutes?: number;
  type?: 'consultation' | 'procedure' | 'followup';
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TreatmentSchema: Schema<ITreatment> = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true },
    description: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'PKR' },
    durationMinutes: { type: Number, min: 0 },
    type: { type: String, enum: ['consultation', 'procedure', 'followup'], default: 'consultation' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Treatment: Model<ITreatment> = mongoose.models.Treatment || mongoose.model<ITreatment>('Treatment', TreatmentSchema);
export default Treatment;
