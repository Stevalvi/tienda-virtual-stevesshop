import { connectDB } from './config/db';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();
const app = express();

import { corsConfig } from './config/cors';
app.use(cors(corsConfig));

app.use(express.json());

connectDB();

app.get('/', (req, res) => {
    res.send('¡Bienvenido al backend de la tienda!');
});

export default app;
