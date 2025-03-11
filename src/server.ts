import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import orderRoutes from './routes/OrderRoutes';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());


const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log("Conexión exitosa a MongoDB");
  } catch (err) {
    console.error("Error de conexión a MongoDB", err);
    process.exit(1);
  }
};

connectDB();

app.post('/webhook', (req, res) => {
  console.log('📢 Webhook recibido:', req.body);
  res.sendStatus(200);
});

app.use('/api', orderRoutes);

app.get("/", (req, res) => {
  res.send("¡Servidor backend funcionando!");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
