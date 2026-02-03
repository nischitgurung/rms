import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp,
  doc,
  getDoc
} from 'firebase/firestore';

import emailjs from '@emailjs/browser';

// 🔑 EMAIL JS CONFIG
const SERVICE_ID = 'service_lt5byrp';
const TEMPLATE_ID = 'template_okebe4v';
const PUBLIC_KEY = 'q6gnSNf0gppPaEkI3';

export const checkAndGenerateLowStockPO = async (item, newQuantity, restaurantId) => {
    try {
        // 1. Strict Check: Is stock actually low?
        const minStock = parseFloat(item.minStock || 0);
        if (newQuantity > minStock) return; // Stock is healthy

        console.log(`📉 Low Stock Detected: ${item.itemName}`);

        // 2. Supplier check
        const supplierId = item.supplierId;
        if (!supplierId) {
            console.warn('No supplier linked. Skipping email + PO.');
            return;
        }

        // 3. Fetch supplier details
        const supplierRef = doc(db, "suppliers", supplierId);
        const supplierSnap = await getDoc(supplierRef);

        if (!supplierSnap.exists()) {
            console.warn('Supplier not found.');
            return;
        }

        const supplier = supplierSnap.data();

        // 4. Send LOW STOCK EMAIL
        if (supplier.email) {
            await emailjs.send(
                SERVICE_ID,
                TEMPLATE_ID,
                {
                    supplier_name: supplier.name,
                    item_name: item.itemName,
                    current_qty: newQuantity,
                    min_stock: minStock,
                    unit: item.unit
                },
                PUBLIC_KEY
            );

            console.log('📧 Low stock email sent');
        }

        // 5. Prevent Duplicate Draft PO
        const poRef = collection(db, "purchase_orders");
        const q = query(
            poRef,
            where("userId", "==", restaurantId),
            where("supplierId", "==", supplierId),
            where("status", "==", "Draft")
        );

        const snapshot = await getDocs(q);

        // 6. Create Draft PO if none exists
        if (snapshot.empty) {
            await addDoc(poRef, {
                userId: restaurantId,
                supplierId: supplierId,
                status: "Draft",
                createdAt: serverTimestamp(),
                items: [{
                    itemId: item.id || 'new_id',
                    name: item.itemName,
                    qtyNeeded: (minStock * 2) - newQuantity,
                    unit: item.unit
                }]
            });

            alert(`⚡ AUTOMATION: Draft PO created & email sent for ${item.itemName}`);
        } else {
            console.log("Draft PO already exists. Email already sent.");
        }

    } catch (error) {
        console.error("Low stock automation failed:", error);
    }
};
