const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Duração padrão dos serviços (exemplo)
const defaultDurations = {
  'Corte de cabelo': 30,
  'Barba': 20,
  'Manicure': 45,
  // adiciona mais serviços aqui
};

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6; // domingo = 0, sábado = 6
}

function isWithinWorkingHours(date, duration) {
  const startHour = date.getHours() + date.getMinutes() / 60;
  const endDate = new Date(date.getTime() + duration * 60000);
  const endHour = endDate.getHours() + endDate.getMinutes() / 60;

  return startHour >= 8 && endHour <= 18;
}

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
    holidays = [], // array de feriados ['YYYY-MM-DD']
  } = req.body;

  if (!professionalId || !clientName || !clientEmail || !serviceType || !date) {
    return res.status(400).json({
      message: 'Campos obrigatórios: professionalId, clientName, clientEmail, serviceType, date',
    });
  }

  // Define duração pelo padrão do serviço, se não enviar duration
  const serviceDuration = defaultDurations[serviceType];
  if (!serviceDuration && !duration) {
    return res.status(400).json({ message: 'Duração do serviço não definida' });
  }
  const finalDuration = duration ?? serviceDuration;

  try {
    const professional = await prisma.user.findUnique({ where: { id: professionalId } });
    if (!professional || professional.role !== 'PROFESSIONAL') {
      return res.status(400).json({ message: 'Profissional inválido' });
    }

    const startDate = new Date(date);

    // Verifica final de semana
    if (isWeekend(startDate)) {
      return res.status(400).json({ message: 'Agendamento não permitido em finais de semana' });
    }

    // Verifica feriados
    const startDateStr = startDate.toISOString().split('T')[0];
    if (holidays.includes(startDateStr)) {
      return res.status(400).json({ message: 'Agendamento não permitido em feriados' });
    }

    // Verifica horário funcionamento
    if (!isWithinWorkingHours(startDate, finalDuration)) {
      return res.status(400).json({ message: 'Agendamento fora do horário de funcionamento (8h às 18h)' });
    }

    const endDate = new Date(startDate.getTime() + finalDuration * 60000);

    // Verifica conflito de horário
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
              { date: { lt: endDate } },
            ],
          },
        ],
      },
    });

    if (conflictingBooking) {
      return res.status(409).json({ message: 'Esse horário já está ocupado para o profissional selecionado' });
    }

    // Cria agendamento
    const booking = await prisma.booking.create({
      data: {
        userId,
        professionalId,
        clientName,
        clientEmail,
        clientWhatsapp,
        serviceType,
        date: startDate,
        duration: finalDuration,
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
      bookings = await prisma.booking.findMany({
        orderBy: { date: 'asc' },
      });
    } else if (userRole === 'PROFESSIONAL') {
      bookings = await prisma.booking.findMany({
        where: { professionalId: userId },
        orderBy: { date: 'asc' },
      });
    } else if (userRole === 'CLIENT') {
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

    if (userRole === 'ADMIN') {
      return res.json(booking);
    }

    if (userRole === 'PROFESSIONAL' && booking.professionalId === userId) {
      return res.json(booking);
    }

    if (userRole === 'CLIENT' && booking.userId === userId) {
      return res.json(booking);
    }

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

    if (booking.userId !== userId) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    const newDate = date ? new Date(date) : booking.date;
    const newDuration = duration ?? booking.duration;

    if (date || duration) {
      // Valida horário funcionamento no update também
      if (isWeekend(newDate)) {
        return res.status(400).json({ message: 'Agendamento não permitido em finais de semana' });
      }

      if (!isWithinWorkingHours(newDate, newDuration)) {
        return res.status(400).json({ message: 'Agendamento fora do horário de funcionamento (8h às 18h)' });
      }

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
