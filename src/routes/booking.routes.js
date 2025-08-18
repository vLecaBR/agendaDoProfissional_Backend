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
// const { authorize } = require('../middlewares/role.middleware'); // opcional

const router = express.Router();

// Middleware global de auth
router.use(authenticate);

// ==== Rotas de agendamento ====

// Criar agendamento
router.post('/', createBooking);

// Ver meus agendamentos
router.get('/me', getMyBookings);

// Exportar agendamentos em CSV (ex: só admin/profissional)
// router.get('/export', authorize(['admin']), exportBookingsCSV);
router.get('/export', exportBookingsCSV);

// Ver horários ocupados de um profissional
router.get('/occupied/:professionalId', getOccupiedSlots);

// Listar todos agendamentos
router.get('/', listBookings);

// Detalhar um agendamento
router.get('/:id', getBooking);

// Atualizar agendamento
router.put('/:id', updateBooking);

// Excluir agendamento
router.delete('/:id', deleteBooking);

module.exports = router;
