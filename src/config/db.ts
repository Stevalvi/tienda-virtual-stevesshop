import mongoose from 'mongoose';
import colors from 'colors';
import { exit } from 'process';

export const connectDB = async () => {
  try {

    const { connection } = await mongoose.connect(process.env.MONGODB_URI as string);

    const url = `${connection.host}:${connection.port}`;
    console.log(colors.magenta.bold(`MongoDB conectado en: ${url}`));

  } catch (error) {

    console.error(colors.red.bold('Error al conectar a MongoDB'), error);
    exit(1);
  }
};
