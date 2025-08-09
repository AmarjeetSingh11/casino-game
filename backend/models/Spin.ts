import mongoose from 'mongoose';
import { Schema, Document } from 'mongoose';

/**
 * 🎰 Spin Schema - stores each slot spin/transaction for a user
 * 
 * Fields:
 * - userId: reference to the User who made the spin
 * - wager: amount wagered for this spin
 * - win: amount won in this spin (0 if lost)
 * - outcome: array of symbols (e.g., ["🍒", "🍋", "🍊"])
 * - spinId: unique identifier for the spin (for tracking)
 * - createdAt: timestamp of the spin
 * - metadata: additional info like multiplier, base win amount, etc.
 */
export interface ISpin extends Document {
  userId: Schema.Types.ObjectId;
  wager: number;
  win: number;
  outcome: string[];
  spinId: string;
  createdAt: Date;
  metadata?: Record<string, any>;
}

const spinSchema = new Schema<ISpin>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  wager: { type: Number, required: true },
  win: { type: Number, required: true },
  outcome: { type: [String], required: true },
  spinId: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
  metadata: { type: Schema.Types.Mixed },
});

const Spin = mongoose.model<ISpin>('Spin', spinSchema);
export default Spin;
