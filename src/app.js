const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();

// Segurança
app.use(helmet());

// CORS (em prod, restringir domínio)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

// Limite de requests
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 reqs por IP
});
app.use(limiter);

// Body parser
app.use(express.json());

// Rotas
const authRoutes = require('./routes/auth.routes');
const bookingRoutes = require('./routes/booking.routes');

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/bookings', bookingRoutes);

app.get('/', (req, res) => {
  res.send('🔥 API da agenda no ar!');
});

// Middleware global de erro
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: '😵 Erro interno no servidor' });
});

module.exports = app;
