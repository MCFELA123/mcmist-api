import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mist';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin-secret-token-2026';

// Gmail SMTP Configuration
const transporter = nodemailer.createTransport({
 service: 'gmail',
 auth: {
 user: process.env.GMAIL_USER,
 pass: process.env.GMAIL_PASSWORD,
 },
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Mongoose Schemas & Models
const productSchema = new mongoose.Schema(
 {
 id: { type: Number, required: true, unique: true },
 name: { type: String, required: true },
 tag: { type: String, required: true },
 description: { type: String, required: true },
 image: { type: String, required: true },
 images: { type: [String], default: [] },
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
 },
 { timestamps: true }
);

const newsletterSchema = new mongoose.Schema(
 {
 email: { type: String, required: true, unique: true, lowercase: true },
 subscribedAt: { type: Date, default: Date.now },
 isActive: { type: Boolean, default: true },
 },
 { timestamps: true }
);

const categorySchema = new mongoose.Schema(
 {
 id: { type: Number, required: true, unique: true },
 name: { type: String, required: true, unique: true },
 description: { type: String, default: '' },
 icon: { type: String, default: '' },
 color: { type: String, default: '#1a1a1a' },
 },
 { timestamps: true }
);

const typeSchema = new mongoose.Schema(
 {
 name: { type: String, required: true, unique: true },
 variations: { type: [String], required: true, default: [] },
 },
 { timestamps: true }
);

const orderSchema = new mongoose.Schema(
 {
 orderId: { type: String, required: true, unique: true },
 customerName: { type: String, required: true },
 customerEmail: { type: String, required: true },
 customerPhone: { type: String, required: true },
 items: [
 {
 productId: { type: Number, required: true },
 productName: { type: String, required: true },
 quantity: { type: Number, required: true, min: 1 },
 price: { type: Number, required: true },
 selectedVariation: { type: String, default: '' },
 selectedColor: { type: String, default: '' },
 }
 ],
 totalPrice: { type: Number, required: true },
 paymentMethod: { type: String, enum: ['Thawani', 'Bank Transfer'], default: 'Thawani' },
 paymentStatus: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
 deliveryStatus: { type: String, enum: ['processing', 'shipped', 'delivered', 'cancelled'], default: 'processing' },
 receiptUrl: { type: String, default: '' },
 notes: { type: String, default: '' },
 },
 { timestamps: true }
);

const Product = mongoose.model('Product', productSchema);
const Newsletter = mongoose.model('Newsletter', newsletterSchema);
const Category = mongoose.model('Category', categorySchema);
const Type = mongoose.model('Type', typeSchema);
const Order = mongoose.model('Order', orderSchema);

// Authentication middleware
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
 const token = req.headers.authorization?.split(' ')[1];

 if (!token || token !== ADMIN_TOKEN) {
 return res.status(401).json({ error: 'Unauthorized' });
 }
 next();
};

// Routes

// Get all products
app.get('/api/products', async (req: Request, res: Response) => {
 try {
 const products = await Product.find().sort({ id: 1 });
 res.json(products);
 } catch (error) {
 res.status(500).json({ error: 'Failed to fetch products' });
 }
});

// Get single product
app.get('/api/products/:id', async (req: Request, res: Response) => {
 try {
 const product = await Product.findOne({ id: parseInt(req.params.id) });
 if (!product) {
 return res.status(404).json({ error: 'Product not found' });
 }
 res.json(product);
 } catch (error) {
 res.status(500).json({ error: 'Failed to fetch product' });
 }
});

// Get products by collection
app.get('/api/products/collection/:name', async (req: Request, res: Response) => {
 try {
 const products = await Product.find({ collection: req.params.name }).sort({ id: 1 });
 res.json(products);
 } catch (error) {
 res.status(500).json({ error: 'Failed to fetch products by collection' });
 }
});

// Create product (admin only)
app.post('/api/products', authMiddleware, async (req: Request, res: Response) => {
 try {
 const lastProduct = await Product.findOne().sort({ id: -1 });
 const newId = lastProduct ? lastProduct.id + 1 : 1;

 const newProduct = new Product({
 ...req.body,
 id: newId,
 });

 await newProduct.save();

 // Automatically notify subscribers about the new product
 const subscribers = await Newsletter.find({ isActive: true });
 if (subscribers.length > 0) {
 const mailOptions = {
 from: `${process.env.GMAIL_FROM_NAME} <${process.env.GMAIL_USER}>`,
 to: subscribers.map(s => s.email).join(','),
 subject: `🆕 New Product Available: ${newProduct.name}`,
 html: `
 <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
 <div style="background-color: #D2FF1E; padding: 20px; text-align: center; border-radius: 8px; margin-bottom: 20px;">
 <h1 style="color: #1a1a1a; margin: 0;">🆕 NEW PRODUCT ALERT</h1>
 </div>
 
 ${newProduct.image ? `<img src="${newProduct.image}" alt="${newProduct.name}" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 8px; margin-bottom: 20px;" />` : ''}
 
 <h2 style="color: #1a1a1a; font-size: 24px; margin: 20px 0;">${newProduct.name}</h2>
 
 <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 10px 0;">${newProduct.tag}</p>
 
 <p style="color: #1a1a1a; font-size: 20px; font-weight: bold; margin: 15px 0;">
 💶 €${newProduct.price.toFixed(2)}
 </p>
 
 <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 20px 0;">
 ${newProduct.description}
 </p>
 
 <div style="text-align: center; margin: 30px 0;">
 <a href="${process.env.APP_URL || 'http://localhost:3000/shop'}?product=${newProduct.id}" style="background-color: #1a1a1a; color: #D2FF1E; padding: 12px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold;">
 View Product
 </a>
 </div>
 
 <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />
 
 <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
 © 2026 MIST Store. All rights reserved.
 </p>
 </div>
 `,
 };

 try {
 await transporter.sendMail(mailOptions);
 } catch (emailError) {
 console.error('Failed to send subscriber notifications:', emailError);
 // Don't fail the product creation if email fails
 }
 }

 res.status(201).json(newProduct);
 } catch (error) {
 res.status(400).json({ error: 'Failed to create product' });
 }
});

// Update product (admin only)
app.put('/api/products/:id', authMiddleware, async (req: Request, res: Response) => {
 try {
 const product = await Product.findOneAndUpdate(
 { id: parseInt(req.params.id) },
 req.body,
 { new: true }
 );

 if (!product) {
 return res.status(404).json({ error: 'Product not found' });
 }

 res.json(product);
 } catch (error) {
 res.status(400).json({ error: 'Failed to update product' });
 }
});

// Delete product (admin only)
app.delete('/api/products/:id', authMiddleware, async (req: Request, res: Response) => {
 try {
 const product = await Product.findOneAndDelete({ id: parseInt(req.params.id) });

 if (!product) {
 return res.status(404).json({ error: 'Product not found' });
 }

 res.json(product);
 } catch (error) {
 res.status(400).json({ error: 'Failed to delete product' });
 }
});

// Seed products (admin only)
app.post('/api/seed', authMiddleware, async (req: Request, res: Response) => {
 try {
 const existingCount = await Product.countDocuments();

 if (existingCount === 0) {
 await Product.insertMany(req.body);
 const count = await Product.countDocuments();
 res.json({ message: 'Database seeded', count });
 } else {
 res.json({ message: 'Database already populated', count: existingCount });
 }
 } catch (error) {
 res.status(400).json({ error: 'Failed to seed database' });
 }
});

// Search products
app.get('/api/search', async (req: Request, res: Response) => {
 try {
 const query = req.query.q as string;
 if (!query) {
 return res.json([]);
 }

 const products = await Product.find({
 $or: [
 { name: { $regex: query, $options: 'i' } },
 { tag: { $regex: query, $options: 'i' } },
 { description: { $regex: query, $options: 'i' } },
 ],
 }).limit(10);

 res.json(products);
 } catch (error) {
 res.status(500).json({ error: 'Search failed' });
 }
});

// Health check
app.get('/api/health', async (req: Request, res: Response) => {
 try {
 const count = await Product.countDocuments();
 res.json({ status: 'ok', productCount: count, database: 'connected' });
 } catch (error) {
 res.status(500).json({ status: 'error', database: 'disconnected' });
 }
});

// ===== CATEGORY ROUTES =====

// Get all categories
app.get('/api/categories', async (req: Request, res: Response) => {
 try {
 const categories = await Category.find().sort({ id: 1 });
 res.json(categories);
 } catch (error) {
 res.status(500).json({ error: 'Failed to fetch categories' });
 }
});

// Get single category
app.get('/api/categories/:id', async (req: Request, res: Response) => {
 try {
 const category = await Category.findOne({ id: parseInt(req.params.id) });
 if (!category) {
 return res.status(404).json({ error: 'Category not found' });
 }
 res.json(category);
 } catch (error) {
 res.status(500).json({ error: 'Failed to fetch category' });
 }
});

// Create category (admin only)
app.post('/api/categories', authMiddleware, async (req: Request, res: Response) => {
 try {
 const { name, description, icon, color } = req.body;

 if (!name) {
 return res.status(400).json({ error: 'Category name is required' });
 }

 const existingCategory = await Category.findOne({ name: name.toLowerCase() });
 if (existingCategory) {
 return res.status(400).json({ error: 'Category with this name already exists' });
 }

 const lastCategory = await Category.findOne().sort({ id: -1 });
 const newId = lastCategory ? lastCategory.id + 1 : 1;

 const newCategory = new Category({
 id: newId,
 name,
 description: description || '',
 icon: icon || '',
 color: color || '#1a1a1a',
 });

 await newCategory.save();
 res.status(201).json(newCategory);
 } catch (error) {
 res.status(400).json({ error: 'Failed to create category' });
 }
});

// Update category (admin only)
app.put('/api/categories/:id', authMiddleware, async (req: Request, res: Response) => {
 try {
 const { name, description, icon, color } = req.body;

 const category = await Category.findOne({ id: parseInt(req.params.id) });
 if (!category) {
 return res.status(404).json({ error: 'Category not found' });
 }

 if (name && name !== category.name) {
 const existingCategory = await Category.findOne({ name: name.toLowerCase() });
 if (existingCategory) {
 return res.status(400).json({ error: 'Another category with this name already exists' });
 }
 }

 const updatedCategory = await Category.findOneAndUpdate(
 { id: parseInt(req.params.id) },
 { 
 name: name || category.name,
 description: description !== undefined ? description : category.description,
 icon: icon !== undefined ? icon : category.icon,
 color: color || category.color,
 },
 { new: true }
 );

 res.json(updatedCategory);
 } catch (error) {
 res.status(400).json({ error: 'Failed to update category' });
 }
});

// Delete category (admin only)
app.delete('/api/categories/:id', authMiddleware, async (req: Request, res: Response) => {
 try {
 const category = await Category.findOneAndDelete({ id: parseInt(req.params.id) });

 if (!category) {
 return res.status(404).json({ error: 'Category not found' });
 }

 res.json(category);
 } catch (error) {
 res.status(400).json({ error: 'Failed to delete category' });
 }
});

// ===== PRODUCT TYPE ROUTES =====

// Get all types
app.get('/api/types', async (req: Request, res: Response) => {
 try {
 const types = await Type.find().sort({ name: 1 });
 res.json(types);
 } catch (error) {
 res.status(500).json({ error: 'Failed to fetch types' });
 }
});

// Get single type
app.get('/api/types/:name', async (req: Request, res: Response) => {
 try {
 const type = await Type.findOne({ name: req.params.name });
 if (!type) {
 return res.status(404).json({ error: 'Type not found' });
 }
 res.json(type);
 } catch (error) {
 res.status(500).json({ error: 'Failed to fetch type' });
 }
});

// Create type (admin only)
app.post('/api/types', authMiddleware, async (req: Request, res: Response) => {
 try {
 const { name, variations } = req.body;

 if (!name || !name.trim()) {
 return res.status(400).json({ error: 'Type name is required' });
 }

 if (!Array.isArray(variations) || variations.length === 0) {
 return res.status(400).json({ error: 'At least one variation is required' });
 }

 const existingType = await Type.findOne({ name: name.trim() });
 if (existingType) {
 return res.status(400).json({ error: 'Type already exists' });
 }

 const newType = new Type({
 name: name.trim(),
 variations: variations.filter((v: string) => v.trim()).map((v: string) => v.trim()),
 });

 await newType.save();
 res.status(201).json(newType);
 } catch (error) {
 res.status(400).json({ error: 'Failed to create type' });
 }
});

// Update type (admin only)
app.put('/api/types/:name', authMiddleware, async (req: Request, res: Response) => {
 try {
 const { name: newName, variations } = req.body;
 const oldName = req.params.name;

 const type = await Type.findOne({ name: oldName });
 if (!type) {
 return res.status(404).json({ error: 'Type not found' });
 }

 // Check if new name already exists (if changing name)
 if (newName && newName !== oldName) {
 const existingType = await Type.findOne({ name: newName.trim() });
 if (existingType) {
 return res.status(400).json({ error: 'Another type with this name already exists' });
 }
 }

 const updatedType = await Type.findOneAndUpdate(
 { name: oldName },
 {
 name: newName?.trim() || type.name,
 variations: Array.isArray(variations) 
  ? variations.filter((v: string) => v.trim()).map((v: string) => v.trim())
  : type.variations,
 },
 { new: true }
 );

 res.json(updatedType);
 } catch (error) {
 res.status(400).json({ error: 'Failed to update type' });
 }
});

// Delete type (admin only)
app.delete('/api/types/:name', authMiddleware, async (req: Request, res: Response) => {
 try {
 const type = await Type.findOneAndDelete({ name: req.params.name });

 if (!type) {
 return res.status(404).json({ error: 'Type not found' });
 }

 res.json(type);
 } catch (error) {
 res.status(400).json({ error: 'Failed to delete type' });
 }
});

// Newsletter: Subscribe to newsletter
app.post('/api/subscribe', async (req: Request, res: Response) => {
 try {
 const { email } = req.body;

 if (!email || !email.includes('@')) {
 return res.status(400).json({ error: 'Invalid email address' });
 }

 let subscriber = await Newsletter.findOne({ email: email.toLowerCase() });

 if (subscriber) {
 if (!subscriber.isActive) {
 subscriber.isActive = true;
 await subscriber.save();
 return res.status(200).json({ message: 'Resubscribed successfully', subscriber });
 }
 return res.status(409).json({ error: 'Email already subscribed' });
 }

 subscriber = new Newsletter({ email: email.toLowerCase() });
 await subscriber.save();

 // Send welcome email with 20% discount
 const mailOptions = {
 from: `${process.env.GMAIL_FROM_NAME} <${process.env.GMAIL_USER}>`,
 to: email,
 subject: '🎉 Welcome to MIST Store - 20% OFF on Your First Order!',
 html: `
 <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
 <div style="background-color: #D2FF1E; padding: 20px; text-align: center; border-radius: 8px; margin-bottom: 20px;">
 <h1 style="color: #1a1a1a; margin: 0;">Welcome to MIST Store</h1>
 </div>
 
 <p style="color: #1a1a1a; font-size: 16px; line-height: 1.6;">
 Thank you for subscribing to our newsletter!
 </p>
 
 <div style="background-color: #f5f5f5; padding: 20px; border-left: 4px solid #D2FF1E; margin: 20px 0; border-radius: 4px;">
 <p style="color: #1a1a1a; font-size: 18px; font-weight: bold; margin: 0 0 10px 0;">
 🎁 Exclusive Offer: 20% OFF Your First Order
 </p>
 <p style="color: #666; font-size: 14px; margin: 0;">
 Use this discount on your next purchase. Limited time offer!
 </p>
 </div>
 
 <p style="color: #666; font-size: 14px; line-height: 1.6;">
 You'll receive exclusive deals, new product launches, and special promotions directly to your inbox.
 </p>
 
 <div style="text-align: center; margin-top: 30px;">
 <a href="${process.env.APP_URL || 'http://localhost:3000/shop'}" style="background-color: #1a1a1a; color: #D2FF1E; padding: 12px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold;">
 Start Shopping Now
 </a>
 </div>
 
 <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />
 
 <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
 © 2026 MIST Store. All rights reserved.<br/>
 You can manage your subscription preferences at any time.
 </p>
 </div>
 `,
 };

 await transporter.sendMail(mailOptions);

 res.status(201).json({ message: 'Successfully subscribed and welcome email sent', subscriber });
 } catch (error) {
 console.error('Newsletter subscription error:', error);
 res.status(500).json({ error: 'Failed to subscribe to newsletter' });
 }
});

// Newsletter: Get all subscribers (admin only)
app.get('/api/subscribers', authMiddleware, async (req: Request, res: Response) => {
 try {
 const subscribers = await Newsletter.find({ isActive: true }).sort({ subscribedAt: -1 });
 res.json(subscribers);
 } catch (error) {
 res.status(500).json({ error: 'Failed to fetch subscribers' });
 }
});

// Newsletter: Send email to all subscribers when new product is created (admin only)
app.post('/api/notify-subscribers', authMiddleware, async (req: Request, res: Response) => {
 try {
 const { productName, productId, productImage, productPrice } = req.body;

 if (!productName || !productId) {
 return res.status(400).json({ error: 'Missing product information' });
 }

 const subscribers = await Newsletter.find({ isActive: true });

 if (subscribers.length === 0) {
 return res.json({ message: 'No active subscribers to notify' });
 }

 const mailOptions = {
 from: `${process.env.GMAIL_FROM_NAME} <${process.env.GMAIL_USER}>`,
 to: subscribers.map(s => s.email).join(','),
 subject: `🆕 New Product Available: ${productName}`,
 html: `
 <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
 <div style="background-color: #D2FF1E; padding: 20px; text-align: center; border-radius: 8px; margin-bottom: 20px;">
 <h1 style="color: #1a1a1a; margin: 0;">🆕 NEW PRODUCT ALERT</h1>
 </div>
 
 ${productImage ? `<img src="${productImage}" alt="${productName}" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 8px; margin-bottom: 20px;" />` : ''}
 
 <h2 style="color: #1a1a1a; font-size: 24px; margin: 20px 0;">${productName}</h2>
 
 ${productPrice ? `<p style="color: #1a1a1a; font-size: 20px; font-weight: bold; margin: 10px 0;">
 💶 €${productPrice.toFixed(2)}
 </p>` : ''}
 
 <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 20px 0;">
 We just added an exciting new product to our collection. Check it out and don't miss out on this exclusive offering!
 </p>
 
 <div style="text-align: center; margin: 30px 0;">
 <a href="${process.env.APP_URL || 'http://localhost:3000/shop'}?product=${productId}" style="background-color: #1a1a1a; color: #D2FF1E; padding: 12px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold;">
 View Product
 </a>
 </div>
 
 <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;" />
 
 <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
 © 2026 MIST Store. All rights reserved.
 </p>
 </div>
 `,
 };

 await transporter.sendMail(mailOptions);

 res.json({
 message: `Product notification sent to ${subscribers.length} subscribers`,
 count: subscribers.length,
 });
 } catch (error) {
 console.error('Notify subscribers error:', error);
 res.status(500).json({ error: 'Failed to send notifications' });
 }
});

// Newsletter: Unsubscribe
app.post('/api/unsubscribe', async (req: Request, res: Response) => {
 try {
 const { email } = req.body;

 if (!email) {
 return res.status(400).json({ error: 'Email is required' });
 }

 const subscriber = await Newsletter.findOneAndUpdate(
 { email: email.toLowerCase() },
 { isActive: false },
 { new: true }
 );

 if (!subscriber) {
 return res.status(404).json({ error: 'Subscriber not found' });
 }

 res.json({ message: 'Successfully unsubscribed', subscriber });
 } catch (error) {
 res.status(500).json({ error: 'Failed to unsubscribe' });
 }
});

// ===== PAYPAL ROUTES =====

// Helper function to get PayPal access token
async function getPayPalAccessToken(): Promise<string> {
 const clientId = process.env.PAYPAL_CLIENT_ID;
 const clientSecret = process.env.PAYPAL_SECRET;
 const baseUrl = process.env.PAYPAL_ENV === 'production'
 ? 'https://api.paypal.com'
 : 'https://api.sandbox.paypal.com';

 if (!clientId || !clientSecret) {
 throw new Error('PayPal credentials not configured');
 }

 const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

 const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
 method: 'POST',
 headers: {
 'Authorization': `Basic ${auth}`,
 'Content-Type': 'application/x-www-form-urlencoded',
 },
 body: 'grant_type=client_credentials',
 });

 if (!response.ok) {
 throw new Error('Failed to get PayPal access token');
 }

 const data = await response.json() as any;
 return data.access_token;
}

// Create PayPal Order
app.post('/api/paypal/create-order', async (req: Request, res: Response) => {
 try {
 const { items, total, customerName, customerEmail, shippingAddress, currency = 'EUR', returnUrl, cancelUrl } = req.body;

 const accessToken = await getPayPalAccessToken();
 const baseUrl = process.env.PAYPAL_ENV === 'production'
 ? 'https://api.paypal.com'
 : 'https://api.sandbox.paypal.com';

 const orderData = {
 intent: 'CAPTURE',
 purchase_units: [
 {
 reference_id: `order-${Date.now()}`,
 amount: {
 currency_code: currency,
 value: total.toString(),
 breakdown: {
 item_total: {
 currency_code: currency,
 value: total.toString(),
 },
 },
 },
 items: items.map((item: any) => ({
 name: item.name,
 quantity: item.quantity.toString(),
 unit_amount: {
 currency_code: currency,
 value: (item.price / item.quantity).toString(),
 },
 })),
 description: `Order from Mist - ${customerName}`,
 },
 ],
 payer: {
 name: {
 given_name: customerName.split(' ')[0] || 'Customer',
 surname: customerName.split(' ').slice(1).join(' ') || '',
 },
 email_address: customerEmail,
 },
 application_context: {
 brand_name: 'Mist',
 locale: 'en-US',
 landing_page: 'BILLING',
 user_action: 'PAY_NOW',
 return_url: returnUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout/success`,
 cancel_url: cancelUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout/cancel`,
 },
 };

 const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
 method: 'POST',
 headers: {
 'Authorization': `Bearer ${accessToken}`,
 'Content-Type': 'application/json',
 },
 body: JSON.stringify(orderData),
 });

 if (!response.ok) {
 const error = await response.json();
 return res.status(response.status).json(error);
 }

 const order = await response.json();
 res.json(order);
 } catch (error) {
 console.error('Error creating PayPal order:', error);
 res.status(500).json({ error: 'Failed to create order' });
 }
});

// Capture PayPal Order
app.post('/api/paypal/capture-order', async (req: Request, res: Response) => {
 try {
 const { orderId } = req.body;

 if (!orderId) {
 return res.status(400).json({ error: 'Order ID is required' });
 }

 const accessToken = await getPayPalAccessToken();
 const baseUrl = process.env.PAYPAL_ENV === 'production'
 ? 'https://api.paypal.com'
 : 'https://api.sandbox.paypal.com';

 const response = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
 method: 'POST',
 headers: {
 'Authorization': `Bearer ${accessToken}`,
 'Content-Type': 'application/json',
 },
 });

 if (!response.ok) {
 const error = await response.json();
 return res.status(response.status).json(error);
 }

 const captureData = await response.json();
 res.json(captureData);
 } catch (error) {
 console.error('Error capturing PayPal order:', error);
 res.status(500).json({ error: 'Failed to capture order' });
 }
});

// ============ ORDERS ENDPOINTS ============

// GET all orders (admin only)
app.get('/api/orders', authMiddleware, async (req: Request, res: Response) => {
 try {
 const orders = await Order.find().sort({ createdAt: -1 });
 res.json(orders);
 } catch (error) {
 console.error('Error fetching orders:', error);
 res.status(500).json({ error: 'Failed to fetch orders' });
 }
});

// GET single order by ID
app.get('/api/orders/:orderId', async (req: Request, res: Response) => {
 try {
 const { orderId } = req.params;
 const order = await Order.findOne({ orderId });
 
 if (!order) {
 return res.status(404).json({ error: 'Order not found' });
 }
 
 res.json(order);
 } catch (error) {
 console.error('Error fetching order:', error);
 res.status(500).json({ error: 'Failed to fetch order' });
 }
});

// CREATE new order
app.post('/api/orders', async (req: Request, res: Response) => {
 try {
     // Log full incoming body for debugging
     console.log('📥 Incoming create order request body:', JSON.stringify(req.body));

     let {
         orderId,
         customerName,
         customerEmail,
         customerPhone,
         items,
         totalPrice,
         paymentMethod = 'Thawani',
     } = req.body as any;

     // Basic required fields check
     if (!orderId || !customerName || !customerEmail || !items || totalPrice === undefined) {
         console.log('❌ Missing required fields:', {
             orderId: !!orderId,
             customerName: !!customerName,
             customerEmail: !!customerEmail,
             items: !!items,
             totalPrice: totalPrice !== undefined,
         });
         return res.status(400).json({ error: 'Missing required fields' });
     }

     // Ensure items is an array and coerce numeric fields to numbers to satisfy mongoose schema
     if (!Array.isArray(items) || items.length === 0) {
         return res.status(400).json({ error: 'Items must be a non-empty array' });
     }

     const sanitizedItems = items.map((it: any, idx: number) => {
         const productId = Number(it.productId);
         const quantity = Number(it.quantity);
         const price = Number(it.price);
         if (Number.isNaN(productId) || Number.isNaN(quantity) || Number.isNaN(price)) {
             throw new Error(`Invalid numeric field in items[${idx}]`);
         }
         return {
             productId,
             productName: String(it.productName || ''),
             quantity,
             price,
             selectedVariation: it.selectedVariation || '',
             selectedColor: it.selectedColor || '',
         };
     });

     // Coerce totalPrice to number
     totalPrice = Number(totalPrice);
     if (Number.isNaN(totalPrice)) {
         return res.status(400).json({ error: 'Invalid totalPrice' });
     }

     const newOrder = new Order({
         orderId: String(orderId),
         customerName: String(customerName),
         customerEmail: String(customerEmail),
         customerPhone: String(customerPhone || ''),
         items: sanitizedItems,
         totalPrice,
         paymentMethod: String(paymentMethod),
         paymentStatus: 'pending',
         deliveryStatus: 'processing',
     });

     console.log('💾 Saving order to database (sanitized)...');
     const savedOrder = await newOrder.save();
     console.log('✅ Order created successfully:', savedOrder._id);
     res.status(201).json(savedOrder);
 } catch (error) {
     console.error('❌ Error creating order:', error instanceof Error ? error.message : error);
     console.error('📍 Full error object:', error);

     // Handle mongoose validation / duplicate key errors with clearer responses
     // Duplicate key (e.g., orderId unique) has code 11000
     // If error is an object with 'code' property, return 409
     if (typeof (error as any)?.code === 'number' && (error as any).code === 11000) {
         return res.status(409).json({ error: 'Duplicate orderId', details: (error as any).keyValue });
     }

     res.status(500).json({ error: 'Failed to create order', details: error instanceof Error ? error.message : 'Unknown error' });
 }
});

// UPDATE order status - Customer can update own order (public endpoint for payment confirmation)
app.put('/api/orders/:orderId', async (req: Request, res: Response) => {
 try {
 const { orderId } = req.params;
 const { paymentStatus, deliveryStatus, receiptUrl, notes } = req.body;
 const token = req.headers.authorization?.split(' ')[1];

 const order = await Order.findOne({ orderId });
 
 if (!order) {
 return res.status(404).json({ error: 'Order not found' });
 }

 // Allow admin to update all fields, or customer to update only paymentStatus and receiptUrl
 if (token && token === ADMIN_TOKEN) {
 // Admin can update anything
 if (paymentStatus) order.paymentStatus = paymentStatus;
 if (deliveryStatus) order.deliveryStatus = deliveryStatus;
 if (receiptUrl) order.receiptUrl = receiptUrl;
 if (notes) order.notes = notes;
 } else {
 // Customer can only update paymentStatus and receiptUrl
 if (paymentStatus) order.paymentStatus = paymentStatus;
 if (receiptUrl) order.receiptUrl = receiptUrl;
 }

 const updatedOrder = await order.save();
 res.json(updatedOrder);
 } catch (error) {
 console.error('Error updating order:', error);
 res.status(500).json({ error: 'Failed to update order' });
 }
});

// DELETE order (admin only)
app.delete('/api/orders/:orderId', authMiddleware, async (req: Request, res: Response) => {
 try {
 const { orderId } = req.params;
 const result = await Order.deleteOne({ orderId });

 if (result.deletedCount === 0) {
 return res.status(404).json({ error: 'Order not found' });
 }

 res.json({ success: true, message: 'Order deleted' });
 } catch (error) {
 console.error('Error deleting order:', error);
 res.status(500).json({ error: 'Failed to delete order' });
 }
});

// MongoDB connection & server startup
mongoose
 .connect(MONGO_URI)
 .then(() => {
 console.log('✅ MongoDB connected');
 app.listen(PORT, () => {
 console.log(`✅ Backend server running on http://localhost:${PORT}`);
 console.log(`📦 API ready at http://localhost:${PORT}/api`);
 });
 })
 .catch(err => {
 console.error('❌ MongoDB connection error:', err);
 process.exit(1);
 });

// Graceful shutdown
process.on('SIGINT', () => {
 mongoose.connection.close();
 process.exit(0);
});
