const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');
const { Parser } = require('json2csv');

// Mock: simula envio de notificação (substituir por envio real depois)
function sendNotification({ to, subject, message }) {
  console.log(`📨 Enviando notificação para ${to}: ${subject} - ${message}`);
}

// Durations padrão por serviço
const defaultDurations = {
  'Corte de cabelo': 30,
  'Barba': 20,
  'Manicure': 45,
};

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function isWithinWorkingHours(date, duration) {
  const startHour = date.getHours() + date.getMinutes() / 60;
  const endDate = new Date(date.getTime() + duration * 60000);
  const endHour = endDate.getHours() + endDate.getMinutes() / 60;
  return startHour >= 8 && endHour <= 18;
}

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
    holidays = [],
  } = req.body;

  if (!professionalId || !clientName || !clientEmail || !serviceType || !date) {
    return res.status(400).json({
      message: 'Campos obrigatórios: professionalId, clientName, clientEmail, serviceType, date',
    });
  }

  const serviceDuration = defaultDurations[serviceType];
  if (!serviceDuration && !duration) {
    return res.status(400).json({ message: 'Duração do serviço não definida' });
  }

  const finalDuration = duration ?? serviceDuration;
  const startDate = new Date(date);
  const startDateStr = startDate.toISOString().split('T')[0];

  if (isWeekend(startDate)) return res.status(400).json({ message: 'Não agendamos em finais de semana' });
  if (holidays.includes(startDateStr)) return res.status(400).json({ message: 'Feriado - não disponível' });
  if (!isWithinWorkingHours(startDate, finalDuration)) {
    return res.status(400).json({ message: 'Horário fora do funcionamento (8h - 18h)' });
  }

  const endDate = new Date(startDate.getTime() + finalDuration * 60000);
  const conflicting = await prisma.booking.findFirst({
    where: {
      professionalId,
      OR: [
        { date: { gte: startDate, lt: endDate } },
        {
          AND: [
            { date: { lte: startDate } },
            { date: { lt: endDate } },
          ],
        },
      ],
    },
  });

  if (conflicting) return res.status(409).json({ message: 'Horário ocupado' });

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

  console.log(`[LOG] Agendamento criado por ${userId} para ${clientName} (${clientEmail}) em ${startDate}`);

  sendNotification({
    to: clientEmail,
    subject: 'Confirmação de agendamento',
    message: `Olá ${clientName}, seu agendamento foi confirmado para ${startDate.toLocaleString()}`,
  });

  sendNotification({
    to: professionalId,
    subject: 'Novo agendamento recebido',
    message: `Você recebeu um novo agendamento de ${clientName} para ${startDate.toLocaleString()}`,
  });

  return res.status(201).json(booking);
}

async function listBookings(req, res) {
  const { id: userId, role: userRole } = req.user;
  const { start, end } = req.query;

  let filter = {};
  if (start && end) {
    filter.date = {
      gte: new Date(start),
      lte: new Date(end),
    };
  }

  if (userRole === 'ADMIN') {
    // Admin vê todos
  } else if (userRole === 'PROFESSIONAL') {
    filter.professionalId = userId;
  } else if (userRole === 'CLIENT') {
    filter.userId = userId;
  } else {
    return res.status(403).json({ message: 'Acesso não autorizado' });
  }

  const bookings = await prisma.booking.findMany({
    where: filter,
    orderBy: { date: 'asc' },
  });

  return res.json(bookings);
}

async function getMyBookings(req, res) {
  const userId = req.user.id;

  const bookings = await prisma.booking.findMany({
    where: { userId },
    orderBy: { date: 'asc' },
  });

  return res.json(bookings);
}

async function getBooking(req, res) {
  const { id } = req.params;
  const { id: userId, role } = req.user;

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) return res.status(404).json({ message: 'Agendamento não encontrado' });

  if (
    role === 'ADMIN' ||
    (role === 'PROFESSIONAL' && booking.professionalId === userId) ||
    (role === 'CLIENT' && booking.userId === userId)
  ) {
    return res.json(booking);
  }

  return res.status(403).json({ message: 'Acesso negado' });
}

async function updateBooking(req, res) {
  const userId = req.user.id;
  const { id } = req.params;
  const { clientName, clientEmail, clientWhatsapp, serviceType, date, duration, note } = req.body;

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) return res.status(404).json({ message: 'Agendamento não encontrado' });
  if (booking.userId !== userId) return res.status(403).json({ message: 'Acesso negado' });

  const newDate = date ? new Date(date) : booking.date;
  const newDuration = duration ?? booking.duration;
  const newEnd = new Date(newDate.getTime() + newDuration * 60000);

  const conflict = await prisma.booking.findFirst({
    where: {
      professionalId: booking.professionalId,
      id: { not: id },
      OR: [
        { date: { gte: newDate, lt: newEnd } },
        {
          AND: [
            { date: { lte: newDate } },
            { date: { lt: newEnd } },
          ],
        },
      ],
    },
  });

  if (conflict) return res.status(409).json({ message: 'Conflito com outro agendamento' });

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
}

async function deleteBooking(req, res) {
  const userId = req.user.id;
  const { id } = req.params;

  const booking = await prisma.booking.findUnique({ where: { id } });
  if (!booking) return res.status(404).json({ message: 'Agendamento não encontrado' });
  if (booking.userId !== userId) return res.status(403).json({ message: 'Acesso negado' });

  await prisma.booking.delete({ where: { id } });
  return res.json({ message: 'Agendamento cancelado' });
}

async function getOccupiedSlots(req, res) {
  const { professionalId } = req.params;

  const bookings = await prisma.booking.findMany({
    where: { professionalId },
    select: { date: true, duration: true },
    orderBy: { date: 'asc' },
  });

  return res.json(bookings);
}

async function exportBookingsCSV(req, res) {
  const { role, id } = req.user;
  let filter = {};

  if (role === 'PROFESSIONAL') {
    filter.professionalId = id;
  } else if (role === 'CLIENT') {
    filter.userId = id;
  }

  const bookings = await prisma.booking.findMany({ where: filter });
  const fields = ['id', 'clientName', 'serviceType', 'date', 'duration', 'note'];
  const parser = new Parser({ fields });
  const csv = parser.parse(bookings);

  res.header('Content-Type', 'text/csv');
  res.attachment('agendamentos.csv');
  return res.send(csv);
}

module.exports = {
  createBooking,
  listBookings,
  getBooking,
  updateBooking,
  deleteBooking,
  getOccupiedSlots,
  getMyBookings,
  exportBookingsCSV,
};
