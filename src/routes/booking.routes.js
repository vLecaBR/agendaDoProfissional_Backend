const express = require('express');
const {
  createBooking,
  listBookings,
  getBooking,
  updateBooking,
  deleteBooking,
  getOccupiedSlots,
} = require('../controllers/booking.controller');
const { authenticate, authorizeRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticate); // protege todas as rotas com autenticação

router.post('/', createBooking);
router.get('/', listBookings);

// Rota mais específica antes das rotas com :id
router.get('/occupied/:professionalId', getOccupiedSlots);

router.get('/:id', getBooking);
router.put('/:id', updateBooking);
router.delete('/:id', deleteBooking);

module.exports = router;
