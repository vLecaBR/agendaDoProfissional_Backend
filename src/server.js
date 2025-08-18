const app = require('./app');
const http = require('http');

const PORT = process.env.PORT || 3333;

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
});

// Graceful shutdown
const shutdown = () => {
  console.log('🛑 Encerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor fechado com sucesso');
    process.exit(0);
  });

  // Caso demore muito, forçar saída
  setTimeout(() => {
    console.error('⏱ Forçando shutdown');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', shutdown);  // CTRL+C
process.on('SIGTERM', shutdown); // kill, docker stop, etc
