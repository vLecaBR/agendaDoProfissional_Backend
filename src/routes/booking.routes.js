const express = require('express');
const {
  createBooking,
  listBookings,
  getBooking,
  updateBooking,
  deleteBooking,
} = require('../controllers/booking.controller');

const { authenticate, authorizeRoles } = require('../middlewares/auth.middleware');

// Middleware para validar campos básicos do booking no corpo da requisição
function validateBookingFields(req, res, next) {
  const {
    professionalId,
    clientName,
    clientEmail,
    clientWhatsapp,
    serviceType,
    date,
  } = req.body;

  if (!professionalId || !clientName || !clientEmail || !serviceType || !date) {
    return res.status(400).json({
      message: 'Campos obrigatórios: professionalId, clientName, clientEmail, serviceType, date',
    });
  }
  next();
}

const router = express.Router();

router.use(authenticate); // Todas as rotas precisam do usuário autenticado

// Criar agendamento - só CLIENT pode criar
router.post('/', authorizeRoles('CLIENT'), validateBookingFields, createBooking);

// Listar agendamentos (cliente vê os seus, profissional vê os que estão relacionados a ele)
router.get('/', listBookings);

// Buscar agendamento específico (cliente ou profissional podem acessar, o controller valida)
router.get('/:id', getBooking);

// Atualizar agendamento (só CLIENT pode atualizar)
router.put('/:id', authorizeRoles('CLIENT'), updateBooking);

// Deletar agendamento (só CLIENT pode deletar)
router.delete('/:id', authorizeRoles('CLIENT'), deleteBooking);

module.exports = router;
