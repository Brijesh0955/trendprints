const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcryptjs'); // Using bcryptjs instead of bcrypt
const path = require('path');
const fs = require('fs');

const app = express();

// ============= MIDDLEWARE =============
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🔥 IMPORTANT: Serve static files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// 🔥 IMPORTANT: Serve uploaded files from 'uploads' folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Session Configuration
app.use(session({
    secret: 'trendprints-super-secret-key-2026',
    resave: true,
    saveUninitialized: true,
    cookie: { 
        secure: false, 
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true
    }
}));

// ============= CREATE FOLDERS =============
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
    console.log('📁 Uploads folder created');
}

if (!fs.existsSync('public/images')) {
    fs.mkdirSync('public/images', { recursive: true });
    console.log('📁 Public/images folder created');
}

// ============= DATABASE CONNECTION =============
// Use environment variable for Render, fallback to local for development
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trendprints';

mongoose.connect(MONGODB_URI)
.then(() => {
    console.log('✅ DATABASE CONNECTED SUCCESSFULLY');
    createAdminUser();
    seedProducts();
})
.catch(err => console.log('❌ DATABASE ERROR:', err.message));

// ============= SCHEMAS =============

// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' },
    createdAt: { type: Date, default: Date.now }
});

// Product Schema
const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true },
    category: { type: String, required: true },
    description: String,
    stock: { type: Number, default: 10 },
    createdAt: { type: Date, default: Date.now }
});

// Cart Schema
const cartSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name: String,
        price: Number,
        quantity: { type: Number, default: 1 },
        image: String
    }],
    total: { type: Number, default: 0 }
});

const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const Cart = mongoose.model('Cart', cartSchema);

// ============= CREATE ADMIN USER =============
async function createAdminUser() {
    try {
        const adminExists = await User.findOne({ role: 'admin' });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            const admin = new User({
                username: 'Super Admin',
                email: 'admin@trendprints.com',
                password: hashedPassword,
                role: 'admin'
            });
            await admin.save();
            console.log('✅ ADMIN USER CREATED: admin@trendprints.com / admin123');
        } else {
            console.log('✅ Admin user already exists');
        }
    } catch (err) {
        console.log('❌ ADMIN CREATION ERROR:', err.message);
    }
}

// ============= SEED PRODUCTS =============
async function seedProducts() {
    try {
        const count = await Product.countDocuments();
        if (count === 0) {
            const products = [
                { name: 'Naruto Sage Mode', price: 799, image: 'naruto.jpg', category: 'Naruto', description: 'Naruto Sage Mode T-Shirt', stock: 15 },
                { name: 'Goku Ultra Instinct', price: 899, image: 'goku.jpg', category: 'Dragon Ball', description: 'Goku Ultra Instinct T-Shirt', stock: 20 },
                { name: 'Luffy Gear 5', price: 849, image: 'luffy.jpg', category: 'One Piece', description: 'Luffy Gear 5 T-Shirt', stock: 12 },
                { name: 'Levi Ackerman', price: 999, image: 'levi.jpg', category: 'Attack on Titan', description: 'Levi Ackerman T-Shirt', stock: 8 },
                { name: 'Gojo Satoru', price: 799, image: 'gojo.jpg', category: 'Jujutsu Kaisen', description: 'Gojo Satoru T-Shirt', stock: 15 },
                { name: 'Itachi Uchiha', price: 899, image: 'itachi.jpg', category: 'Naruto', description: 'Itachi Uchiha T-Shirt', stock: 10 }
            ];
            await Product.insertMany(products);
            console.log('✅ 6 SAMPLE PRODUCTS SEEDED');
        } else {
            console.log(`✅ ${count} products already exist`);
        }
    } catch (err) {
        console.log('❌ SEED ERROR:', err.message);
    }
}

// ============= ROUTES =============

// Home Page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Support Page
app.get('/support', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'support.html'));
});

// Signup Page
app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

// Login Page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Dashboard (Protected)
app.get('/dashboard', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// ============= AUTH ROUTES =============

// Signup
app.post('/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        const exists = await User.findOne({ email });
        if (exists) {
            return res.send('Email already exists');
        }
        
        const hash = await bcrypt.hash(password, 10);
        const user = new User({ username, email, password: hash });
        await user.save();
        
        req.session.userId = user._id;
        req.session.username = user.username;
        res.redirect('/dashboard?user=' + username);
    } catch (err) {
        console.error('Signup error:', err);
        res.send('Signup error');
    }
});

// Login
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.send('Invalid email or password');
        }
        
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.send('Invalid email or password');
        }
        
        req.session.userId = user._id;
        req.session.username = user.username;
        res.redirect('/dashboard?user=' + user.username);
    } catch (err) {
        console.error('Login error:', err);
        res.send('Login error');
    }
});

// Logout
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});

// ============= API ROUTES =============

// Get All Products
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find().sort('-createdAt');
        res.json(products);
    } catch {
        res.json([]);
    }
});

// Get Cart
app.get('/api/cart', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.json({ items: [], total: 0 });
        }
        
        let cart = await Cart.findOne({ userId: req.session.userId });
        if (!cart) {
            cart = new Cart({ userId: req.session.userId, items: [], total: 0 });
            await cart.save();
        }
        res.json(cart);
    } catch {
        res.json({ items: [], total: 0 });
    }
});

// Add to Cart
app.post('/api/cart/add', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Login required' });
        }
        
        const { productId, name, price, image } = req.body;
        
        let cart = await Cart.findOne({ userId: req.session.userId });
        if (!cart) {
            cart = new Cart({ userId: req.session.userId, items: [], total: 0 });
        }
        
        const existingItem = cart.items.find(item => 
            item.productId && item.productId.toString() === productId
        );
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.items.push({ 
                productId, 
                name, 
                price: Number(price), 
                quantity: 1, 
                image 
            });
        }
        
        cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        await cart.save();
        
        res.json(cart);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Remove from Cart
app.post('/api/cart/remove', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Login required' });
        }
        
        const { productId } = req.body;
        const cart = await Cart.findOne({ userId: req.session.userId });
        
        if (cart) {
            cart.items = cart.items.filter(item => 
                item.productId.toString() !== productId
            );
            cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            await cart.save();
        }
        
        res.json(cart || { items: [], total: 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Session Check
app.get('/api/check-session', (req, res) => {
    res.json({
        loggedIn: !!req.session.userId,
        username: req.session.username
    });
});

// ============= SEED ROUTE =============
app.get('/api/seed-products', async (req, res) => {
    try {
        await Product.deleteMany({});
        const products = [
            { name: 'Naruto Sage Mode', price: 799, image: 'naruto.jpg', category: 'Naruto', description: 'Naruto Sage Mode T-Shirt', stock: 15 },
            { name: 'Goku Ultra Instinct', price: 899, image: 'goku.jpg', category: 'Dragon Ball', description: 'Goku Ultra Instinct T-Shirt', stock: 20 },
            { name: 'Luffy Gear 5', price: 849, image: 'luffy.jpg', category: 'One Piece', description: 'Luffy Gear 5 T-Shirt', stock: 12 },
            { name: 'Levi Ackerman', price: 999, image: 'levi.jpg', category: 'Attack on Titan', description: 'Levi Ackerman T-Shirt', stock: 8 },
            { name: 'Gojo Satoru', price: 799, image: 'gojo.jpg', category: 'Jujutsu Kaisen', description: 'Gojo Satoru T-Shirt', stock: 15 },
            { name: 'Itachi Uchiha', price: 899, image: 'itachi.jpg', category: 'Naruto', description: 'Itachi Uchiha T-Shirt', stock: 10 }
        ];
        await Product.insertMany(products);
        res.send('✅ Products reseeded successfully!');
    } catch {
        res.send('❌ Error reseeding products');
    }
});

// ============= ERROR HANDLING =============
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// ============= START SERVER =============
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('\n' + '='.repeat(50));
    console.log('🚀 TRENDPRINTS SERVER STARTED');
    console.log('='.repeat(50));
    console.log(`📍 Local URL: http://localhost:${PORT}`);
    console.log(`📍 Live URL: https://trendprints.onrender.com`);
    console.log('='.repeat(50) + '\n');
});