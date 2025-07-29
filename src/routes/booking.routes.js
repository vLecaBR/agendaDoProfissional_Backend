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
router.get('/:id', getBooking);
router.put('/:id', updateBooking);
router.delete('/:id', deleteBooking);

// Nova rota para pegar horários ocupados de um profissional
router.get('/occupied/:professionalId', getOccupiedSlots);

module.exports = router;
