import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mist';

const productSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  tag: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String, required: true },
  price: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  isPopular: { type: Boolean, default: false },
  isNew: { type: Boolean, default: false },
  type: { type: String, required: true },
  collection: { type: String, required: true },
  colors: { type: [String], required: true },
  variations: { type: [String], required: true },
  accessories: { type: [Number], default: [] },
  stock: { type: Number, default: 0 },
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

async function reseed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');
    
    // Delete all products
    const deleted = await Product.deleteMany({});
    console.log(`Deleted ${deleted.deletedCount} products`);
    
    await mongoose.connection.close();
    
    // Now run seed
    console.log('Running seed...');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

reseed();
