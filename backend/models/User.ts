import mongoose from 'mongoose';

/**
 * 👤 User Schema - stores user account information
 * - username: unique username for login
 * - password: bcrypt-hashed password for security
 * - createdAt: timestamp of account creation
 */
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);
export default User;
