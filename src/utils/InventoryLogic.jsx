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
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 🔑 EMAIL JS CONFIG
const SERVICE_ID = 'service_lt5byrp';
const TEMPLATE_ID = 'template_okebe4v';
const PUBLIC_KEY = 'q6gnSNf0gppPaEkI3';

export const checkAndGenerateLowStockPO = async (item, newQuantity, restaurantId) => {
    try {
        const minStock = parseFloat(item.minStock || 0);
        if (newQuantity > minStock) return; 

        console.log(`📉 Low Stock Detected: ${item.itemName}`);

        const supplierId = item.supplierId;
        if (!supplierId) return;

        const supplierRef = doc(db, "suppliers", supplierId);
        const supplierSnap = await getDoc(supplierRef);
        if (!supplierSnap.exists()) return;

        const supplier = supplierSnap.data();

        // 4. Send LOW STOCK EMAIL using direct REST API (No library needed)
        if (supplier.email) {
            try {
                const emailData = {
                    service_id: SERVICE_ID,
                    template_id: TEMPLATE_ID,
                    user_id: PUBLIC_KEY,
                    template_params: {
                        to_email: supplier.email,
                        supplier_name: supplier.name,
                        item_name: item.itemName,
                        current_qty: newQuantity.toString(),
                        min_stock: minStock.toString(),
                        unit: item.unit || "units"
                    }
                };

                await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(emailData)
                });
                
                console.log('📧 Low stock email request sent');
            } catch (emailErr) {
                console.error("Email API Error:", emailErr);
            }
        }

        // 5. Purchase Order Logic
        const poRef = collection(db, "purchase_orders");
        const q = query(
            poRef,
            where("userId", "==", restaurantId),
            where("supplierId", "==", supplierId),
            where("status", "==", "Draft")
        );

        const snapshot = await getDocs(q);

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
            console.log(`⚡ PO Created`);
        }
    } catch (error) {
        console.error("Critical Logic Error:", error);
    }
};