const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Criar agendamento
async function createBooking(req, res) {
  const userId = req.user.id;
  const { clientName, clientEmail, date, note } = req.body;

  if (!clientName || !clientEmail || !date) {
    return res.status(400).json({ message: 'Campos clientName, clientEmail e date são obrigatórios' });
  }

  try {
    const booking = await prisma.booking.create({
      data: {
        userId,
        clientName,
        clientEmail,
        date: new Date(date),
        note,
      },
    });
    return res.status(201).json(booking);
  } catch (error) {
    console.error('Erro criando booking:', error);
    return res.status(500).json({ message: 'Erro ao criar agendamento' });
  }
}

// Listar agendamentos do usuário logado
async function listBookings(req, res) {
  const userId = req.user.id;

  try {
    const bookings = await prisma.booking.findMany({
      where: { userId },
      orderBy: { date: 'asc' },
    });
    return res.json(bookings);
  } catch (error) {
    console.error('Erro listando bookings:', error);
    return res.status(500).json({ message: 'Erro ao listar agendamentos' });
  }
}

// Buscar um booking específico
async function getBooking(req, res) {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking || booking.userId !== userId) {
      return res.status(404).json({ message: 'Agendamento não encontrado' });
    }
    return res.json(booking);
  } catch (error) {
    console.error('Erro buscando booking:', error);
    return res.status(500).json({ message: 'Erro ao buscar agendamento' });
  }
}

// Atualizar agendamento
async function updateBooking(req, res) {
  const userId = req.user.id;
  const { id } = req.params;
  const { clientName, clientEmail, date, note } = req.body;

  try {
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking || booking.userId !== userId) {
      return res.status(404).json({ message: 'Agendamento não encontrado' });
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        clientName: clientName ?? booking.clientName,
        clientEmail: clientEmail ?? booking.clientEmail,
        date: date ? new Date(date) : booking.date,
        note: note ?? booking.note,
      },
    });
    return res.json(updated);
  } catch (error) {
    console.error('Erro atualizando booking:', error);
    return res.status(500).json({ message: 'Erro ao atualizar agendamento' });
  }
}

// Deletar agendamento
async function deleteBooking(req, res) {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking || booking.userId !== userId) {
      return res.status(404).json({ message: 'Agendamento não encontrado' });
    }

    await prisma.booking.delete({ where: { id } });
    return res.json({ message: 'Agendamento deletado com sucesso' });
  } catch (error) {
    console.error('Erro deletando booking:', error);
    return res.status(500).json({ message: 'Erro ao deletar agendamento' });
  }
}

module.exports = {
  createBooking,
  listBookings,
  getBooking,
  updateBooking,
  deleteBooking,
};
