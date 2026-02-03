import emailjs from '@emailjs/browser';

const SERVICE_ID = 'service_lt5byrp';
const TEMPLATE_ID = 'template_okebe4v';
const PUBLIC_KEY = 'q6gnSNf0gppPaEkI3';

export const sendLowStockEmail = async ({
  supplierEmail,
  supplierName,
  itemName,
  currentQty,
  minStock,
  unit
}) => {
  if (!supplierEmail) return;

  try {
    await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        supplier_name: supplierName,
        item_name: itemName,
        current_qty: currentQty,
        min_stock: minStock,
        unit: unit
      },
      PUBLIC_KEY
    );

    console.log('Low stock email sent');
  } catch (error) {
    console.error('Email failed:', error);
  }
};
