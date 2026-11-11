import mongoose, { Schema, Document, Model } from 'mongoose';
import { clinicConfig } from '../../config/clinic.config';

export interface IClinicSettings extends Document {
  dentist: mongoose.Types.ObjectId; // Settings per dentist/clinic owner
  timezone?: string;
  branding: {
    name: string;
    description?: string;
    logoUrl?: string;
    colors: {
      primary: string;
      secondary: string;
      accent: string;
    };
  };
  contact: {
    address?: string;
    email?: string;
    phone?: string;
    website?: string;
  };
  features: {
    enablePatientPortal: boolean;
    enableAiAnalysis: boolean;
    enableOnlineBooking: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ClinicSettingsSchema: Schema<IClinicSettings> = new Schema(
  {
    dentist: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    timezone: { type: String, default: 'GMT+05:00' },
    branding: {
      name: { type: String, default: clinicConfig.name },
      description: { type: String },
      logoUrl: { type: String },
      colors: {
        primary: { type: String, default: clinicConfig.colors.primary },
        secondary: { type: String, default: clinicConfig.colors.foreground },
        accent: { type: String, default: clinicConfig.colors.accentTint },
      },
    },
    contact: {
      address: { type: String },
      email: { type: String },
      phone: { type: String },
      website: { type: String },
    },
    features: {
      enablePatientPortal: { type: Boolean, default: true },
      enableAiAnalysis: { type: Boolean, default: true },
      enableOnlineBooking: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

const ClinicSettings: Model<IClinicSettings> = mongoose.models.ClinicSettings || mongoose.model<IClinicSettings>('ClinicSettings', ClinicSettingsSchema);

export default ClinicSettings;
