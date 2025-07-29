const express = require('express');
const {
  createBooking,
  listBookings,
  getBooking,
  updateBooking,
  deleteBooking,
  getOccupiedSlots,
} = require('../controllers/booking.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticate); // Protege tudo

router.post('/', createBooking);
router.get('/', listBookings);

// ✅ Coloca rota mais específica ANTES
router.get('/occupied/:professionalId', getOccupiedSlots);

// ⚠️ Essa rota tem que ficar depois
router.get('/:id', getBooking);
router.put('/:id', updateBooking);
router.delete('/:id', deleteBooking);

module.exports = router;
