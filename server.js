const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');

const app = express();

// ============= MIDDLEWARE =============
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Session
app.use(session({
    secret: 'trendprints-secret-key',
    resave: true,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));

// ============= CREATE FOLDERS =============
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
if (!fs.existsSync('public/images')) fs.mkdirSync('public/images', { recursive: true });

// ============= DATABASE =============
mongoose.connect('mongodb://127.0.0.1:27017/trendprints')
.then(() => {
    console.log('✅ DATABASE CONNECTED');
    createSampleProducts();
})
.catch(err => console.log('❌ DB ERROR:', err.message));

// ============= SCHEMAS =============
const userSchema = new mongoose.Schema({
    username: String,
    email: { type: String, unique: true },
    password: String
});

const productSchema = new mongoose.Schema({
    name: String,
    price: Number,
    image: String,
    category: String
});

const cartSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name: String,
        price: Number,
        quantity: Number,
        image: String
    }],
    total: Number
});

const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const Cart = mongoose.model('Cart', cartSchema);

// ============= SAMPLE PRODUCTS =============
async function createSampleProducts() {
    try {
        const count = await Product.countDocuments();
        if (count === 0) {
            const products = [
                { name: 'Naruto Sage Mode', price: 799, image: 'naruto.jpg', category: 'Naruto' },
                { name: 'Goku Ultra Instinct', price: 899, image: 'goku.jpg', category: 'Dragon Ball' },
                { name: 'Luffy Gear 5', price: 849, image: 'luffy.jpg', category: 'One Piece' },
                { name: 'Levi Ackerman', price: 999, image: 'levi.jpg', category: 'Attack on Titan' },
                { name: 'Gojo Satoru', price: 799, image: 'gojo.jpg', category: 'Jujutsu Kaisen' },
                { name: 'Itachi Uchiha', price: 899, image: 'itachi.jpg', category: 'Naruto' }
            ];
            await Product.insertMany(products);
            console.log('✅ 6 PRODUCTS CREATED');
        } else {
            console.log(`✅ ${count} PRODUCTS LOADED`);
        }
    } catch (err) {
        console.log(err);
    }
}

// ============= ROUTES =============
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/support', (req, res) => res.sendFile(path.join(__dirname, 'public', 'support.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'public', 'signup.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));

app.get('/dashboard', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// ============= AUTH =============
app.post('/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        const exists = await User.findOne({ email });
        if (exists) return res.send('Email already exists');
        
        const hash = await bcrypt.hash(password, 10);
        const user = new User({ username, email, password: hash });
        await user.save();
        
        req.session.userId = user._id;
        req.session.username = user.username;
        res.redirect('/dashboard?user=' + username);
    } catch (err) {
        res.send('Signup error');
    }
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ email });
        if (!user) return res.send('Invalid email or password');
        
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.send('Invalid email or password');
        
        req.session.userId = user._id;
        req.session.username = user.username;
        res.redirect('/dashboard?user=' + user.username);
    } catch (err) {
        res.send('Login error');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/'));
});

// ============= API =============
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch {
        res.json([]);
    }
});

app.get('/api/cart', async (req, res) => {
    if (!req.session.userId) return res.json({ items: [], total: 0 });
    let cart = await Cart.findOne({ userId: req.session.userId });
    if (!cart) cart = await Cart.create({ userId: req.session.userId, items: [], total: 0 });
    res.json(cart);
});

app.post('/api/cart/add', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Login required' });
    
    const { productId, name, price, image } = req.body;
    let cart = await Cart.findOne({ userId: req.session.userId });
    if (!cart) cart = new Cart({ userId: req.session.userId, items: [] });
    
    const exists = cart.items.find(i => i.productId.toString() === productId);
    if (exists) exists.quantity += 1;
    else cart.items.push({ productId, name, price, quantity: 1, image });
    
    cart.total = cart.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    await cart.save();
    res.json(cart);
});

app.post('/api/cart/remove', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Login required' });
    
    const { productId } = req.body;
    const cart = await Cart.findOne({ userId: req.session.userId });
    
    if (cart) {
        cart.items = cart.items.filter(i => i.productId.toString() !== productId);
        cart.total = cart.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
        await cart.save();
    }
    res.json(cart || { items: [], total: 0 });
});

app.get('/api/check-session', (req, res) => {
    res.json({
        loggedIn: !!req.session.userId,
        username: req.session.username
    });
});

// ============= START SERVER =============
const PORT = 3000;
app.listen(PORT, () => {
    console.log('\n' + '='.repeat(40));
    console.log('🚀 TRENDPRINTS SERVER READY');
    console.log('='.repeat(40));
    console.log(`📍 Home: http://localhost:${PORT}`);
    console.log(`🆘 Support: http://localhost:${PORT}/support`);
    console.log(`🔐 Login: http://localhost:${PORT}/login`);
    console.log(`📝 Signup: http://localhost:${PORT}/signup`);
    console.log(`🛒 Dashboard: http://localhost:${PORT}/dashboard`);
    console.log('='.repeat(40) + '\n');
});