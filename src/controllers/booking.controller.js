const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Criar agendamento (todos podem criar, só valida o profissional)
async function createBooking(req, res) {
  const userId = req.user.id;
  const {
    professionalId,
    clientName,
    clientEmail,
    clientWhatsapp,
    serviceType,
    date,
    duration,
    note,
  } = req.body;

  if (!professionalId || !clientName || !clientEmail || !serviceType || !date || !duration) {
    return res.status(400).json({
      message: 'Campos obrigatórios: professionalId, clientName, clientEmail, serviceType, date, duration',
    });
  }

  try {
    const professional = await prisma.user.findUnique({ where: { id: professionalId } });
    if (!professional || professional.role !== 'PROFESSIONAL') {
      return res.status(400).json({ message: 'Profissional inválido' });
    }

    const startDate = new Date(date);
    const endDate = new Date(startDate.getTime() + duration * 60000);

    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        professionalId,
        OR: [
          {
            date: {
              gte: startDate,
              lt: endDate,
            },
          },
          {
            AND: [
              { date: { lte: startDate } },
              {
                date: {
                  lt: endDate,
                },
              },
            ],
          },
        ],
      },
    });

    if (conflictingBooking) {
      return res.status(409).json({ message: 'Esse horário já está ocupado para o profissional selecionado' });
    }

    const booking = await prisma.booking.create({
      data: {
        userId,
        professionalId,
        clientName,
        clientEmail,
        clientWhatsapp,
        serviceType,
        date: startDate,
        duration,
        note,
      },
    });

    return res.status(201).json(booking);
  } catch (error) {
    console.error('Erro criando booking:', error);
    return res.status(500).json({ message: 'Erro ao criar agendamento' });
  }
}

// Listar agendamentos com controle de acesso por role
async function listBookings(req, res) {
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    let bookings;
    if (userRole === 'ADMIN') {
      // ADMIN vê tudo
      bookings = await prisma.booking.findMany({
        orderBy: { date: 'asc' },
      });
    } else if (userRole === 'PROFESSIONAL') {
      // PROFESSIONAL só os que ele é o profissional
      bookings = await prisma.booking.findMany({
        where: { professionalId: userId },
        orderBy: { date: 'asc' },
      });
    } else if (userRole === 'CLIENT') {
      // CLIENT só os que ele criou
      bookings = await prisma.booking.findMany({
        where: { userId },
        orderBy: { date: 'asc' },
      });
    } else {
      return res.status(403).json({ message: 'Role não autorizado' });
    }

    return res.json(bookings);
  } catch (error) {
    console.error('Erro listando bookings:', error);
    return res.status(500).json({ message: 'Erro ao listar agendamentos' });
  }
}

// Buscar agendamento por ID com controle de acesso
async function getBooking(req, res) {
  const userId = req.user.id;
  const userRole = req.user.role;
  const { id } = req.params;

  try {
    const booking = await prisma.booking.findUnique({ where: { id } });

    if (!booking) {
      return res.status(404).json({ message: 'Agendamento não encontrado' });
    }

    // ADMIN pode acessar tudo
    if (userRole === 'ADMIN') {
      return res.json(booking);
    }

    // PROFESSIONAL só pode acessar se for o profissional do agendamento
    if (userRole === 'PROFESSIONAL' && booking.professionalId === userId) {
      return res.json(booking);
    }

    // CLIENT só pode acessar se for o dono do agendamento
    if (userRole === 'CLIENT' && booking.userId === userId) {
      return res.json(booking);
    }

    // Se não passou em nenhum, é acesso negado
    return res.status(403).json({ message: 'Acesso negado' });
  } catch (error) {
    console.error('Erro buscando booking:', error);
    return res.status(500).json({ message: 'Erro ao buscar agendamento' });
  }
}

// Atualizar agendamento (só o dono cliente pode atualizar)
async function updateBooking(req, res) {
  const userId = req.user.id;
  const { id } = req.params;
  const {
    clientName,
    clientEmail,
    clientWhatsapp,
    serviceType,
    date,
    duration,
    note,
  } = req.body;

  try {
    const booking = await prisma.booking.findUnique({ where: { id } });

    if (!booking) {
      return res.status(404).json({ message: 'Agendamento não encontrado' });
    }

    // Só o dono cliente pode atualizar
    if (booking.userId !== userId) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    const newDate = date ? new Date(date) : booking.date;
    const newDuration = duration ?? booking.duration;

    if (date || duration) {
      const newEnd = new Date(newDate.getTime() + newDuration * 60000);

      const conflicting = await prisma.booking.findFirst({
        where: {
          professionalId: booking.professionalId,
          id: { not: booking.id },
          OR: [
            {
              date: {
                gte: newDate,
                lt: newEnd,
              },
            },
            {
              AND: [
                { date: { lte: newDate } },
                { date: { lt: newEnd } },
              ],
            },
          ],
        },
      });

      if (conflicting) {
        return res.status(409).json({ message: 'Esse horário já está ocupado para o profissional' });
      }
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        clientName: clientName ?? booking.clientName,
        clientEmail: clientEmail ?? booking.clientEmail,
        clientWhatsapp: clientWhatsapp ?? booking.clientWhatsapp,
        serviceType: serviceType ?? booking.serviceType,
        date: newDate,
        duration: newDuration,
        note: note ?? booking.note,
      },
    });

    return res.json(updated);
  } catch (error) {
    console.error('Erro atualizando booking:', error);
    return res.status(500).json({ message: 'Erro ao atualizar agendamento' });
  }
}

// Deletar agendamento (só o dono cliente pode deletar)
async function deleteBooking(req, res) {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const booking = await prisma.booking.findUnique({ where: { id } });

    if (!booking) {
      return res.status(404).json({ message: 'Agendamento não encontrado' });
    }

    // Só o dono cliente pode deletar
    if (booking.userId !== userId) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    await prisma.booking.delete({ where: { id } });
    return res.json({ message: 'Agendamento deletado com sucesso' });
  } catch (error) {
    console.error('Erro deletando booking:', error);
    return res.status(500).json({ message: 'Erro ao deletar agendamento' });
  }
}

// PEGAR HORÁRIOS OCUPADOS DE UM PROFISSIONAL
async function getOccupiedSlots(req, res) {
  const { professionalId } = req.params;

  try {
    const bookings = await prisma.booking.findMany({
      where: { professionalId },
      select: {
        date: true,
        duration: true,
      },
      orderBy: { date: 'asc' },
    });

    return res.json(bookings);
  } catch (error) {
    console.error('Erro ao buscar horários ocupados:', error);
    return res.status(500).json({ message: 'Erro ao buscar horários ocupados' });
  }
}

module.exports = {
  createBooking,
  listBookings,
  getBooking,
  updateBooking,
  deleteBooking,
  getOccupiedSlots,
};
