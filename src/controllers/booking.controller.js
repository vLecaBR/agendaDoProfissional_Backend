const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Criar agendamento (usuário é quem agenda, profissional é informado)
async function createBooking(req, res) {
  const userId = req.user.id; // Quem tá criando o agendamento (cliente)
  const {
    professionalId,
    clientName,
    clientEmail,
    clientWhatsapp,
    serviceType,
    date,
    note,
  } = req.body;

  if (!professionalId || !clientName || !clientEmail || !serviceType || !date) {
    return res.status(400).json({
      message: 'Campos obrigatórios: professionalId, clientName, clientEmail, serviceType, date',
    });
  }

  try {
    // Verifica se profissional existe e tem role PROFESSIONAL
    const professional = await prisma.user.findUnique({ where: { id: professionalId } });
    if (!professional || professional.role !== 'PROFESSIONAL') {
      return res.status(400).json({ message: 'Profissional inválido' });
    }

    const booking = await prisma.booking.create({
      data: {
        userId,
        professionalId,
        clientName,
        clientEmail,
        clientWhatsapp,
        serviceType,
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

// Listar agendamentos do usuário logado (cliente ou profissional)
async function listBookings(req, res) {
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    let bookings;
    if (userRole === 'PROFESSIONAL') {
      // Profissional vê os bookings que ele tem
      bookings = await prisma.booking.findMany({
        where: { professionalId: userId },
        orderBy: { date: 'asc' },
      });
    } else {
      // Cliente vê os próprios bookings
      bookings = await prisma.booking.findMany({
        where: { userId },
        orderBy: { date: 'asc' },
      });
    }

    return res.json(bookings);
  } catch (error) {
    console.error('Erro listando bookings:', error);
    return res.status(500).json({ message: 'Erro ao listar agendamentos' });
  }
}

// Buscar um booking específico
async function getBooking(req, res) {
  const userId = req.user.id;
  const userRole = req.user.role;
  const { id } = req.params;

  try {
    const booking = await prisma.booking.findUnique({ where: { id } });

    if (!booking) {
      return res.status(404).json({ message: 'Agendamento não encontrado' });
    }

    // Só pode acessar se for cliente dono ou profissional responsável
    if (
      (userRole === 'CLIENT' && booking.userId !== userId) ||
      (userRole === 'PROFESSIONAL' && booking.professionalId !== userId)
    ) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    return res.json(booking);
  } catch (error) {
    console.error('Erro buscando booking:', error);
    return res.status(500).json({ message: 'Erro ao buscar agendamento' });
  }
}

// Atualizar agendamento (só quem criou pode atualizar)
async function updateBooking(req, res) {
  const userId = req.user.id;
  const { id } = req.params;
  const { clientName, clientEmail, clientWhatsapp, serviceType, date, note } = req.body;

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
        clientWhatsapp: clientWhatsapp ?? booking.clientWhatsapp,
        serviceType: serviceType ?? booking.serviceType,
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

// Deletar agendamento (só quem criou pode deletar)
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
