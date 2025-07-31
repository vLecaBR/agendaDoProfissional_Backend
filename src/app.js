const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');

dotenv.config();

const app = express();

app.use(helmet()); // Segurança primeiro
app.use(cors()); // Libera geral pra front
app.use(express.json()); // Pra ler JSON no body

// importar rotas
const authRoutes = require('./routes/auth.routes');
const bookingRoutes = require('./routes/booking.routes');

// usar rotas
app.use('/api/auth', authRoutes); // auth primeiro, sempre
app.use('/api/bookings', bookingRoutes);

app.get('/', (req, res) => {
  res.send('🔥 API da agenda no ar!');
});

module.exports = app;
