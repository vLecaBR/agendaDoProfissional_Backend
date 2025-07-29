const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());
app.use(helmet());


// importar rotas
const authRoutes = require('./routes/auth.routes');
const bookingRoutes = require('./routes/booking.routes');
app.use('/api/bookings', bookingRoutes);


app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('🔥 API da agenda no ar!');
});


module.exports = app;
