import mongoose, { Schema, Document, Model } from 'mongoose'

export interface ITreatmentSession extends Document {
  appointment: mongoose.Types.ObjectId
  patient: mongoose.Types.ObjectId
  dentist: mongoose.Types.ObjectId
  imageType?: string
  chiefComplaint?: string
  diagnosis?: string
  procedures?: string
  notes?: string
  prescription?: string
  followUp?: string
  imageUrl?: string
  detections?: Array<{
    label?: string
    labelNormalized?: string
    confidence?: number
    x?: number
    y?: number
    width?: number
    height?: number
    color?: string
    mask?: number[][]
  }>
  reportMarkdown?: string
  createdAt: Date
  updatedAt: Date
}

const TreatmentSessionSchema: Schema<ITreatmentSession> = new Schema(
  {
    appointment: { type: Schema.Types.ObjectId, ref: 'Appointment', required: true, unique: true },
    patient: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    dentist: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    imageType: { type: String, trim: true },
    chiefComplaint: { type: String, trim: true },
    diagnosis: { type: String, trim: true },
    procedures: { type: String, trim: true },
    notes: { type: String, trim: true },
    prescription: { type: String, trim: true },
    followUp: { type: String, trim: true },
    imageUrl: { type: String, trim: true },
    detections: [
      {
        label: { type: String, trim: true },
        labelNormalized: { type: String, trim: true },
        confidence: { type: Number },
        x: { type: Number },
        y: { type: Number },
        width: { type: Number },
        height: { type: Number },
        color: { type: String, trim: true },
        mask: [[Number]],
      },
    ],
    reportMarkdown: { type: String },
  },
  { timestamps: true }
)

TreatmentSessionSchema.index({ imageType: 1 })
TreatmentSessionSchema.index({ 'detections.labelNormalized': 1 })

if (mongoose.models.TreatmentSession) {
  delete mongoose.models.TreatmentSession
}

const TreatmentSession: Model<ITreatmentSession> = mongoose.model<ITreatmentSession>('TreatmentSession', TreatmentSessionSchema)
export default TreatmentSession
