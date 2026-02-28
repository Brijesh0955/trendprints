const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const app = express();

// ============= MIDDLEWARE =============
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'Public')));
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

if (!fs.existsSync('Public/images')) {
    fs.mkdirSync('Public/images', { recursive: true });
    console.log('📁 Public/images folder created');
}

// ============= DATABASE CONNECTION =============
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/trendprints';

mongoose.connect(MONGODB_URI)
.then(() => {
    console.log('✅ DATABASE CONNECTED SUCCESSFULLY');
    createAdminUser();
    seedProducts();
})
.catch(err => console.log('❌ DATABASE ERROR:', err.message));

// ============= SCHEMAS =============
const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' },
    createdAt: { type: Date, default: Date.now }
});

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true },
    category: { type: String, required: true },
    description: String,
    stock: { type: Number, default: 10 },
    createdAt: { type: Date, default: Date.now }
});

const cartSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name: String,
        price: Number,
        quantity: { type: Number, default: 1 },
        image: String,
        size: String
    }],
    total: { type: Number, default: 0 }
});

// ============= FIXED ORDER SCHEMA =============
const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: false },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true },
        image: { type: String, default: 'default.jpg' },
        size: { type: String, default: 'M' }
    }],
    total: { type: Number, required: true },
    status: { type: String, default: 'Pending' },
    paymentMethod: { type: String, default: 'COD' },
    address: {
        fullName: { type: String, required: true },
        phone: { type: String, required: true },
        address: { type: String, required: true },
        city: { type: String, required: true },
        pincode: { type: String, required: true }
    },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const Cart = mongoose.model('Cart', cartSchema);
const Order = mongoose.model('Order', orderSchema);

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
                { name: 'Naruto Sage Mode', price: 799, image: 'naruto.jpg', category: 'anime', description: 'Naruto Sage Mode T-Shirt', stock: 15 },
                { name: 'Goku Ultra Instinct', price: 899, image: 'goku.jpg', category: 'anime', description: 'Goku Ultra Instinct T-Shirt', stock: 20 },
                { name: 'Luffy Gear 5', price: 849, image: 'luffy.jpg', category: 'anime', description: 'Luffy Gear 5 T-Shirt', stock: 12 },
                { name: 'Levi Ackerman', price: 999, image: 'levi.jpg', category: 'anime', description: 'Levi Ackerman T-Shirt', stock: 8 },
                { name: 'Gojo Satoru', price: 799, image: 'gojo.jpg', category: 'anime', description: 'Gojo Satoru T-Shirt', stock: 15 },
                { name: 'Itachi Uchiha', price: 899, image: 'itachi.jpg', category: 'anime', description: 'Itachi Uchiha T-Shirt', stock: 10 },
                { name: 'Sakura Haruno', price: 749, image: 'sakura.jpg', category: 'anime', description: 'Sakura Haruno T-Shirt', stock: 12 },
                { name: 'Hinata Hyuga', price: 849, image: 'hinata.jpg', category: 'anime', description: 'Hinata Hyuga T-Shirt', stock: 8 },
                { name: 'Mikasa Ackerman', price: 949, image: 'mikasa.jpg', category: 'anime', description: 'Mikasa Ackerman T-Shirt', stock: 10 },
                { name: 'Nobara Kugisaki', price: 799, image: 'nobara.jpg', category: 'anime', description: 'Nobara Kugisaki T-Shirt', stock: 15 },
                { name: 'Black Solid T-Shirt', price: 499, image: 'men-black.jpg', category: 'men', description: 'Men Black T-Shirt', stock: 25 },
                { name: 'White Solid T-Shirt', price: 499, image: 'men-white.jpg', category: 'men', description: 'Men White T-Shirt', stock: 25 },
                { name: 'Navy Blue T-Shirt', price: 549, image: 'men-navy.jpg', category: 'men', description: 'Men Navy T-Shirt', stock: 20 },
                { name: 'Gray Solid T-Shirt', price: 499, image: 'men-gray.jpg', category: 'men', description: 'Men Gray T-Shirt', stock: 25 },
                { name: 'Olive Green T-Shirt', price: 549, image: 'men-olive.jpg', category: 'men', description: 'Men Olive T-Shirt', stock: 20 },
                { name: 'Maroon T-Shirt', price: 549, image: 'men-maroon.jpg', category: 'men', description: 'Men Maroon T-Shirt', stock: 20 },
                { name: 'Teal T-Shirt', price: 549, image: 'men-teal.jpg', category: 'men', description: 'Men Teal T-Shirt', stock: 20 },
                { name: 'Brown T-Shirt', price: 499, image: 'men-brown.jpg', category: 'men', description: 'Men Brown T-Shirt', stock: 25 },
                { name: 'Charcoal T-Shirt', price: 549, image: 'men-charcoal.jpg', category: 'men', description: 'Men Charcoal T-Shirt', stock: 20 },
                { name: 'Pink Solid T-Shirt', price: 499, image: 'women-pink.jpg', category: 'women', description: 'Women Pink T-Shirt', stock: 25 },
                { name: 'Coral T-Shirt', price: 549, image: 'women-coral.jpg', category: 'women', description: 'Women Coral T-Shirt', stock: 20 },
                { name: 'Lavender T-Shirt', price: 549, image: 'women-lavender.jpg', category: 'women', description: 'Women Lavender T-Shirt', stock: 20 },
                { name: 'Mint Green T-Shirt', price: 549, image: 'women-mint.jpg', category: 'women', description: 'Women Mint T-Shirt', stock: 20 },
                { name: 'Peach T-Shirt', price: 499, image: 'women-peach.jpg', category: 'women', description: 'Women Peach T-Shirt', stock: 25 },
                { name: 'Rose T-Shirt', price: 549, image: 'women-rose.jpg', category: 'women', description: 'Women Rose T-Shirt', stock: 20 },
                { name: 'Purple T-Shirt', price: 549, image: 'women-purple.jpg', category: 'women', description: 'Women Purple T-Shirt', stock: 20 },
                { name: 'Turquoise T-Shirt', price: 549, image: 'women-turquoise.jpg', category: 'women', description: 'Women Turquoise T-Shirt', stock: 20 },
                { name: 'Magenta T-Shirt', price: 549, image: 'women-magenta.jpg', category: 'women', description: 'Women Magenta T-Shirt', stock: 20 }
            ];
            await Product.insertMany(products);
            console.log('✅ 29 SAMPLE PRODUCTS SEEDED');
        } else {
            console.log(`✅ ${count} products already exist`);
        }
    } catch (err) {
        console.log('❌ SEED ERROR:', err.message);
    }
}

// ============= ORDER ROUTES =============

// Create Order
app.post('/api/orders', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Please login first' });
        }

        console.log('Order received:', req.body);

        const { items, total, address, paymentMethod } = req.body;

        // Validation
        if (!items || !items.length) {
            return res.status(400).json({ error: 'No items in order' });
        }

        if (!address || !address.fullName || !address.phone || !address.address || !address.city || !address.pincode) {
            return res.status(400).json({ error: 'Incomplete address' });
        }

        // Process items - don't validate ObjectId for sample products
        const processedItems = items.map(item => ({
            productId: item.productId && /^[0-9a-fA-F]{24}$/.test(item.productId) ? item.productId : null,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: item.image || 'default.jpg',
            size: item.size || 'M'
        }));

        const order = new Order({
            userId: req.session.userId,
            items: processedItems,
            total,
            address: {
                fullName: address.fullName,
                phone: address.phone,
                address: address.address,
                city: address.city,
                pincode: address.pincode
            },
            paymentMethod: paymentMethod || 'COD',
            status: 'Pending'
        });

        console.log('Saving order:', order);

        await order.save();

        // Clear cart after order
        await Cart.findOneAndUpdate(
            { userId: req.session.userId },
            { $set: { items: [], total: 0 } }
        );

        res.json({ success: true, orderId: order._id });
    } catch (err) {
        console.error('Order error:', err);
        res.status(500).json({ error: err.message || 'Failed to create order' });
    }
});

// Get User Orders
app.get('/api/my-orders', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.json([]);
        }
        const orders = await Order.find({ userId: req.session.userId })
            .sort('-createdAt');
        res.json(orders);
    } catch (err) {
        console.error('Error fetching orders:', err);
        res.json([]);
    }
});

// ============= ADMIN MIDDLEWARE =============
async function isAdmin(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Please login' });
    }
    
    try {
        const user = await User.findById(req.session.userId);
        if (user && user.role === 'admin') {
            next();
        } else {
            res.status(403).json({ error: 'Access denied. Admins only.' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

// ============= ADMIN ROUTES =============

// Admin Login Page
app.get('/admin/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'admin-login.html'));
});

// Admin Login Handler
app.post('/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email, role: 'admin' });
        
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.send('Invalid admin credentials');
        }
        
        req.session.userId = user._id;
        req.session.username = user.username;
        req.session.role = user.role;
        
        res.redirect('/admin/dashboard');
    } catch (err) {
        res.send('Login error');
    }
});

// Admin Dashboard
app.get('/admin/dashboard', isAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'admin-dashboard.html'));
});

// Get All Orders (Admin API)
app.get('/api/admin/orders', isAdmin, async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('userId', 'username email')
            .sort('-createdAt');
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update Order Status
app.put('/api/admin/orders/:id', isAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        res.json({ success: true, order });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Dashboard Stats
app.get('/api/admin/stats', isAdmin, async (req, res) => {
    try {
        const totalOrders = await Order.countDocuments();
        const totalProducts = await Product.countDocuments();
        const totalUsers = await User.countDocuments();
        
        // Calculate total revenue
        const orders = await Order.find();
        const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
        
        res.json({
            totalOrders,
            totalProducts,
            totalUsers,
            totalRevenue
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============= REGULAR ROUTES =============
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'index.html'));
});

app.get('/support', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'support.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'signup.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'Public', 'login.html'));
});

app.get('/dashboard', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'Public', 'dashboard.html'));
});

// Orders Page Route
app.get('/orders', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'Public', 'orders.html'));
});

// ============= AUTH ROUTES =============
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

app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});

// ============= API ROUTES =============
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find().sort('-createdAt');
        res.json(products);
    } catch {
        res.json([]);
    }
});

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

app.post('/api/cart/add', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Login required' });
        }
        
        const { productId, name, price, image, size } = req.body;
        
        if (!productId) {
            return res.status(400).json({ error: 'Product ID required' });
        }

        let cart = await Cart.findOne({ userId: req.session.userId });
        if (!cart) {
            cart = new Cart({ userId: req.session.userId, items: [], total: 0 });
        }
        
        const existingItem = cart.items.find(item => 
            item.productId && item.productId.toString() === productId && item.size === size
        );
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.items.push({ 
                productId, 
                name, 
                price: Number(price), 
                quantity: 1, 
                image: image || 'default.jpg',
                size: size || 'M'
            });
        }
        
        cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        await cart.save();
        
        res.json(cart);
    } catch (err) {
        console.error('Add to cart error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/cart/remove', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: 'Login required' });
        }
        
        const { productId, size } = req.body;
        const cart = await Cart.findOne({ userId: req.session.userId });
        
        if (cart) {
            cart.items = cart.items.filter(item => 
                !(item.productId && item.productId.toString() === productId && item.size === size)
            );
            cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            await cart.save();
        }
        
        res.json(cart || { items: [], total: 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/check-session', (req, res) => {
    res.json({
        loggedIn: !!req.session.userId,
        username: req.session.username,
        isAdmin: req.session.role === 'admin'
    });
});

// ============= START SERVER =============
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log('\n' + '='.repeat(50));
    console.log('🚀 TRENDPRINTS SERVER STARTED');
    console.log('='.repeat(50));
    console.log(`📍 Local URL: http://localhost:${PORT}`);
    console.log(`📍 Live URL: https://trendprints.onrender.com`);
    console.log(`👑 Admin Login: http://localhost:${PORT}/admin/login`);
    console.log(`📧 Admin Email: admin@trendprints.com`);
    console.log(`🔑 Admin Pass: admin123`);
    console.log(`📋 Orders Page: http://localhost:${PORT}/orders`);
    console.log('='.repeat(50) + '\n');
});