const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(helmet());

// importar rotas
const authRoutes = require('./routes/auth.routes');

app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('🔥 API do Agendify no ar!');
});

module.exports = app;
