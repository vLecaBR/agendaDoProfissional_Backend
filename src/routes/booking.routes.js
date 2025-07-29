const express = require('express');
const {
  createBooking,
  listBookings,
  getBooking,
  updateBooking,
  deleteBooking,
} = require('../controllers/booking.controller');
const authenticateJWT = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticateJWT); // Todas as rotas precisam de token

router.post('/', createBooking);
router.get('/', listBookings);
router.get('/:id', getBooking);
router.put('/:id', updateBooking);
router.delete('/:id', deleteBooking);

module.exports = router;
