import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string; // Optional if using OAuth
  role: 'admin' | 'dentist' | 'staff';
  image?: string;
  active: boolean;
  availability?: {
    days: number[]; // 0=Sun ... 6=Sat
    startTime: string; // HH:mm 24h
    endTime: string; // HH:mm 24h
    slotMinutes?: number;
  };
  settings: {
    theme: 'light' | 'dark' | 'system';
    notifications: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  comparePassword?(candidate: string): Promise<boolean>;
}

const UserSchema: Schema<IUser> = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, minlength: 8, select: false },
    role: { type: String, enum: ['admin', 'dentist', 'staff'], default: 'dentist' },
    image: { type: String },
    active: { type: Boolean, default: true },
    availability: {
      days: { type: [Number], default: [1, 2, 3, 4, 5] },
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '17:00' },
      slotMinutes: { type: Number, default: 30 },
    },
    settings: {
      theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
      notifications: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

// Hash password when set/updated
UserSchema.pre('save', async function () {
  const user = this as IUser;
  if (!user.isModified('password') || !user.password) return;
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);
});

UserSchema.methods.comparePassword = async function (candidate: string) {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
