import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import { Request, Response } from "express";
import dotenv from "dotenv";
import Order from "../models/Order";
import axios from "axios";

dotenv.config(); 

console.log("Access Token:", process.env.MERCADOPAGO_ACCESS_TOKEN);

interface Item {
  title: string;
  unit_price: number;
  quantity: number;
  size: number | string;
  image?: string;
}

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || "",
});

const preference = new Preference(client);
const payment = new Payment(client);

export const createPreference = async (req: Request, res: Response) => {
  try {
    console.log("📩 Datos recibidos en createPreference:", req.body);

    const { items, payerEmail, firstName, lastName, phone, country, state, city, address, additionalInfo } = req.body;

    console.log("📧 Email del pagador recibido:", payerEmail);
    console.log("🛒 Items recibidos:", items);

    if (!firstName || !lastName || !phone || !country || !state || !city || !address) {
      return res.status(400).json({ message: "Faltan datos obligatorios en la orden." });
    }

interface Item {
  title: string;
  unit_price: number;
  quantity: number;
  size: number | string;
  image?: string;
}

const typedItems: Item[] = items as Item[];

const newOrder = new Order({
  firstName,
  lastName,
  email: payerEmail, 
  phone,
  country,
  state,
  city,
  address,
  additionalInfo,
  paymentMethod: "MercadoPago",
  cart: typedItems.map((item) => ({
    title: item.title,
    price: item.unit_price,
    quantity: item.quantity,
    size: item.size,
    image: item.image,
  })),
  totalAmount: typedItems.reduce((sum, item) => sum + item.unit_price * item.quantity, 0),
  status: "pendiente",
  payerEmail,
});

console.log("🛒 Datos que se guardarán en MongoDB:", newOrder);


console.log("🛒 Datos que se guardarán en MongoDB:", newOrder);


await newOrder.save();

    console.log("✅ Orden creada con estado pendiente:", newOrder);
    console.log("✅ Orden creada con ID:", newOrder._id.toString());

const preferenceData = {
  items: items.map((item: Item, index: number) => ({
    id: `item-${index + 1}`,
    title: item.title,
    quantity: item.quantity,
    size: item.size,
    unit_price: item.unit_price,
    currency_id: "COP",
  })),
  payer: {
    email: payerEmail,
  },
  back_urls: {
  success: "https://stevesshop.com.co/checkout",
  failure: "https://stevesshop.com.co/checkout",
  pending: "https://stevesshop.com.co/checkout",
},
  notification_url: "https://tienda-virtual-stevesshop.onrender.com/webhook",
  auto_return: "approved",
  external_reference: newOrder._id.toString(),
};
console.log("🚀 Enviando a Mercado Pago con external_reference:", preferenceData.external_reference);

    console.log("✅ Enviando a Mercado Pago - Payer email:", preferenceData.payer.email);

    const response = await preference.create({ body: preferenceData });

    res.status(200).json({ preferenceId: response.id });
  } catch (error: any) {
    console.error("❌ Error al crear la preferencia:", error.response ? error.response.data : error);
    res.status(500).json({
      message: "Error al crear la preferencia",
      error: error.response?.data || error.message,
    });
  }
};


export const handlePaymentNotification = async (req: Request, res: Response) => {
  try {
    console.log("📢 Webhook recibido:", req.body);

    const { type, data } = req.body;

    if (type === "payment" && data?.id) {
      const paymentId = data.id;
      console.log("💳 ID de pago recibido en webhook:", paymentId);

      const paymentDetails = await getPaymentDetails(paymentId);
      if (!paymentDetails) {
        console.error("🚨 No se encontraron detalles del pago para ID:", paymentId);
        return res.status(404).send("Payment details not found.");
      }

      console.log("💳 Detalles del pago recibidos:", JSON.stringify(paymentDetails, null, 2));

      const paymentStatus = paymentDetails.status;
      const payerEmail = paymentDetails.payer?.email;
      const orderId = paymentDetails.external_reference;

      if (!orderId) {
        console.error("🚨 No se encontró external_reference en el pago.");
        return res.status(400).send("No order ID found in payment details.");
      }

      console.log("🔎 External Reference (Order ID):", orderId);
      console.log("🔎 Estado del pago recibido:", paymentStatus);
      console.log("🔎 Email del pagador:", payerEmail);

      console.log("🔍 Buscando orden en MongoDB con ID:", orderId);


      const order = await Order.findById(orderId);
      if (!order) {
        console.error("🚨 Orden no encontrada en la base de datos para el ID:", orderId);
        return res.status(404).send("Order not found.");
      }

      let updatedStatus: "pendiente" | "pagado" | "fallido" = "pendiente";
      if (paymentStatus === "approved") {
        updatedStatus = "pagado";
      } else if (paymentStatus === "rejected" || paymentStatus === "cancelled") {
        updatedStatus = "fallido";
      }

      order.status = updatedStatus;
      order.payerEmail = payerEmail || order.payerEmail;
      await order.save();

      console.log(`✅ Orden actualizada - Estado: ${updatedStatus}, Email: ${order.payerEmail}`);
      return res.status(200).send("Notification processed and order updated.");
    }

    console.log("⚠️ Webhook recibido no es un pago, ignorado.");
    return res.status(200).send("Webhook received but no action taken.");
  } catch (error) {
    console.error("❌ Error al recibir la notificación de pago:", error);
    return res.status(500).send("Error processing payment notification");
  }
};




export const getPaymentDetails = async (paymentId: string) => {
  try {
    const response = await axios.get(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        },
      }
    );

    console.log("💳 Detalles del pago recibidos desde Mercado Pago:", JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error("❌ Error al obtener detalles del pago:", error);
    return null;
  }
};

