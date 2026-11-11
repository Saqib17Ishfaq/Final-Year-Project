import mongoose, { Schema, Document, Model } from 'mongoose';

// Interface for a single detection/finding
export interface IAnalysisFinding {
  label: string; // e.g., "Caries", "Root Canal", "Impacted Tooth"
  confidence: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface IXRay extends Document {
  patient: mongoose.Types.ObjectId;
  dentist: mongoose.Types.ObjectId;
  imageUrl: string; // Path or URL to the original image
  processedImageUrl?: string; // Path or URL to the image with bounding boxes drawn (optional)
  type: 'OPG' | 'Periapical' | 'Bitewing';
  dateUploaded: Date;
  status: 'uploaded' | 'processing' | 'analyzed' | 'failed';
  
  // AI Analysis Results
  analysis: {
    findings: IAnalysisFinding[];
    summary?: string;
    modelUsed?: string; // e.g., "yolov8-opg-v1"
    analyzedAt?: Date;
  };

  // Generated Report
  reportUrl?: string; // URL to the PDF report
  
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AnalysisFindingSchema = new Schema({
  label: { type: String, required: true },
  confidence: { type: Number, required: true },
  bbox: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
  }
}, { _id: false });

const XRaySchema: Schema<IXRay> = new Schema(
  {
    patient: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    dentist: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    imageUrl: { type: String, required: true },
    processedImageUrl: { type: String },
    type: { type: String, enum: ['OPG', 'Periapical', 'Bitewing'], required: true },
    dateUploaded: { type: Date, default: Date.now },
    status: { 
      type: String, 
      enum: ['uploaded', 'processing', 'analyzed', 'failed'], 
      default: 'uploaded' 
    },
    
    analysis: {
      findings: [AnalysisFindingSchema],
      summary: { type: String },
      modelUsed: { type: String },
      analyzedAt: { type: Date },
    },

    reportUrl: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

const XRay: Model<IXRay> = mongoose.models.XRay || mongoose.model<IXRay>('XRay', XRaySchema);

export default XRay;
