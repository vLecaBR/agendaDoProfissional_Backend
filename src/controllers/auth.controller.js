const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient, Role } = require('@prisma/client');
const { OAuth2Client } = require('google-auth-library');

const prisma = new PrismaClient();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Gera token JWT
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Registro de usuário
exports.register = async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) return res.status(400).json({ message: 'Usuário já existe' });

    const hashedPassword = await bcrypt.hash(password, 10);

    // Se a role enviada for inválida ou não enviada, define CLIENT
    const userRole = Object.values(Role).includes(role) ? role : Role.CLIENT;

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: userRole,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    const token = generateToken(user.id);

    res.status(201).json({ token, user });
  } catch (err) {
    console.error('[REGISTER ERROR]', err);
    res.status(500).json({ error: 'Erro no registro' });
  }
};

// Login de usuário
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) return res.status(400).json({ message: 'Credenciais inválidas' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Senha incorreta' });

    const token = generateToken(user.id);

    const { id, name, role, createdAt } = user;
    res.json({ token, user: { id, name, email, role, createdAt } });
  } catch (err) {
    console.error('[LOGIN ERROR]', err);
    res.status(500).json({ error: 'Erro no login' });
  }
};

// Login com Google OAuth
exports.googleLogin = async (req, res) => {
  const { token } = req.body;

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload.email;
    const name = payload.name;

    // Busca usuário pelo email
    let user = await prisma.user.findUnique({ where: { email } });

    // Cria usuário se não existir
    if (!user) {
      user = await prisma.user.create({
        data: {
          name,
          email,
          role: Role.CLIENT,
        },
      });
    }

    const jwtToken = generateToken(user.id);
    const { id, role, createdAt } = user;

    res.json({
      token: jwtToken,
      user: { id, name, email, role, createdAt },
    });
  } catch (err) {
    console.error('[GOOGLE LOGIN ERROR]', err);
    res.status(401).json({ message: 'Falha no login com Google' });
  }
};

// Buscar perfil do usuário autenticado
exports.getProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) return res.status(404).json({ message: 'Usuário não encontrado' });

    res.json(user);
  } catch (err) {
    console.error('[PROFILE ERROR]', err);
    res.status(500).json({ error: 'Erro ao buscar perfil' });
  }
};
