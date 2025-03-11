import app from './app';

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await app.listen(PORT);
    console.log(`Servidor escuchando en el puerto ${PORT}`);
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
})();
