import express, { Request, Response } from 'express';
import Order from '../models/Order';
import { createPreference } from '../controllers/mercadopagoController';
import axios from 'axios';

const router = express.Router();

interface OrderRequestBody {
  formData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    country: string;
    state: string;
    city: string;
    address: string;
    additionalInfo?: string;
  };
  cart: {
    id: string;
    title: string;
    price: number;
    quantity: number;
    size?: number | string;
    image?: string;
  }[];
  paymentMethod: string;
}

router.post('/create-preference', createPreference);
router.post('/orders', async (req: Request<{}, {}, OrderRequestBody>, res: Response) => {
  const { formData, cart, paymentMethod } = req.body;

  try {
    const totalAmount = cart.reduce((total: number, item: { price: number; quantity: number }) => total + item.price * item.quantity, 0);

    const newOrder = new Order({
      ...formData,
      cart,
      paymentMethod,
      totalAmount,
      payerEmail: formData.email,
      status: paymentMethod === 'mercado pago' || paymentMethod === 'cash' ? 'pendiente' : 'pagado',
    });

    const savedOrder = await newOrder.save();

    res.status(201).json({ message: 'Pedido creado con éxito', order: savedOrder });
  } catch (error) {
    console.error("Error al crear el pedido:", error);
    res.status(500).json({ message: 'Error al crear el pedido', error });
  }
});

router.post('/update-order-status', async (req: Request<{}, {}, { orderId: string; status: string }>, res: Response) => {
  const { orderId, status } = req.body;

  try {
    const order = await Order.findByIdAndUpdate(orderId, { status }, { new: true });

    if (!order) {
      return res.status(404).json({ message: 'Pedido no encontrado' });
    }

    res.status(200).json({ message: 'Estado del pedido actualizado', order });
  } catch (error) {
    console.error('Error al actualizar el estado del pedido:', error);
    res.status(500).json({ message: 'Error al actualizar el estado del pedido', error });
  }
});

router.post('/webhook', async (req: Request, res: Response) => {
  console.log('📢 Webhook recibido:', JSON.stringify(req.body, null, 2));

  const { topic, resource, action, data } = req.body;

  try {
    let paymentId;

    
    if (topic === 'payment' && typeof resource === 'string') {
      paymentId = resource;
    } else if (action === 'payment.created' && data?.id) {
      paymentId = data.id;
    } else {
      console.warn('⚠️ Webhook no contiene un payment_id válido');
      return res.status(400).json({ message: 'Webhook inválido' });
    }
    console.log(`🛒 Payment ID extraído: ${paymentId}`);

    console.log(`🔍 Consultando Mercado Pago para obtener detalles del pago ID: ${paymentId}`);

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    console.log('🔑 Access Token:', accessToken); 
    if (!accessToken) {
      throw new Error('⚠️ MERCADOPAGO_ACCESS_TOKEN no está definido en las variables de entorno');
    }

    const { data: payment } = await axios.get(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    console.log('✅ Respuesta de Mercado Pago:', payment);

    const externalReference = payment.external_reference;
    const status = payment.status;

    if (!externalReference) {
      console.warn('⚠️ No se encontró external_reference en la respuesta de Mercado Pago');
      return res.status(400).json({ message: 'No se encontró external_reference' });
    }

    console.log(`🔍 Buscando orden en MongoDB con ID: ${externalReference}`);
    const order = await Order.findById(externalReference);

    if (!order) {
      console.warn(`⚠️ No se encontró ninguna orden con ID: ${externalReference}`);
      return res.status(404).json({ message: 'Orden no encontrada' });
    }

    console.log(`Actualizando el estado de la orden ${externalReference} a ${status}`);

    if (status === 'approved') {
      order.status = 'pagado';
    } else if (status === 'pending') {
      order.status = 'pendiente';
    } else {
      order.status = 'fallido';
    }

    await order.save();
    console.log(`✅ Pedido actualizado: ${order._id} - Estado: ${order.status}`);

    res.sendStatus(200);
  } catch (error: any) {
    console.error('❌ Error al procesar el webhook:', error.response?.data || error.message);
    res.status(500).json({ message: 'Error interno al procesar el webhook' });
  }
});

export default router;

