const express = require('express');
const {
  createBooking,
  listBookings,
  getBooking,
  updateBooking,
  deleteBooking,
  getOccupiedSlots,
  getMyBookings,
  exportBookingsCSV,
} = require('../controllers/booking.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticate);

// Criar agendamento
router.post('/', createBooking);

// Listar todos agendamentos (admin, profissional, cliente)
router.get('/', listBookings);

// Ver meus agendamentos
router.get('/me/bookings', getMyBookings);

// Exportar agendamentos em CSV
router.get('/export', exportBookingsCSV);

// Ver horários ocupados de um profissional
router.get('/occupied/:professionalId', getOccupiedSlots);

// Detalhar um agendamento
router.get('/:id', getBooking);

// Atualizar agendamento
router.put('/:id', updateBooking);

// Excluir agendamento
router.delete('/:id', deleteBooking);

module.exports = router;
