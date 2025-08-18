const jwt = require('jsonwebtoken');
const prisma = require('../prisma'); // único client centralizado

// Middleware de autenticação
exports.authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Não autorizado' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({ 
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true } // só pega o necessário
    });

    if (!user) {
      return res.status(401).json({ message: 'Não autorizado' });
    }

    req.user = user; 
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido ou expirado' });
  }
};

// Middleware para restringir acesso por papel
exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ message: 'Acesso negado' });
    }
    next();
  };
};
