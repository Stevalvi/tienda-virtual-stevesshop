import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  country: { type: String, required: true },
  state: { type: String, required: true },
  city: { type: String, required: true },
  address: { type: String, required: true },
  additionalInfo: { type: String, required: false },
  paymentMethod: { type: String, required: true },
  cart: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      title: { type: String, required: true },
      price: { type: Number, required: true },
      quantity: { type: Number, required: true },
      size: { type: mongoose.Schema.Types.Mixed },
      image: { type: String, required: true }
    }
  ],
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['pendiente', 'pagado', 'fallido'], default: 'pendiente' },
  createdAt: { type: Date, default: Date.now },
  payerEmail: {type: String },
});

const Order = mongoose.model('Order', orderSchema);

export default Order;
