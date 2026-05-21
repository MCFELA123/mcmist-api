import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mist';

async function clearAndSeed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('🔗 Connected to MongoDB');
    
    // Drop the products collection
    await mongoose.connection.collection('products').deleteMany({});
    console.log('🗑️  Cleared all products');
    
    // Now run the seed file
    const seedModule = await import('./seed.ts');
    console.log('✅ Seeding complete!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

clearAndSeed();
