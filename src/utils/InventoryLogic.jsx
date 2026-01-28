import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';

export const checkAndGenerateLowStockPO = async (item, newQuantity, restaurantId) => {
    // 1. Strict Check: Is stock actually low?
    const minStock = parseFloat(item.minStock || 0);
    if (newQuantity > minStock) return; // Stock is healthy

    console.log(`📉 Low Stock Detected: ${item.itemName}. Checking POs...`);

    // 2. Prevent Duplicates: Is there already a DRAFT PO for this supplier?
    // (We assume items usually have a specific supplier linked)
    const supplierId = item.supplierId || 'General_Supplier';
    
    const poRef = collection(db, "purchase_orders");
    const q = query(
        poRef,
        where("userId", "==", restaurantId),
        where("supplierId", "==", supplierId),
        where("status", "==", "Draft")
    );

    const snapshot = await getDocs(q);

    // 3. Logic: Create New PO or Update Existing
    // For MVP, we will just alert if a Draft doesn't exist yet.
    if (snapshot.empty) {
        await addDoc(poRef, {
            userId: restaurantId,
            supplierId: supplierId,
            status: "Draft",
            createdAt: serverTimestamp(),
            items: [{
                itemId: item.id || 'new_id',
                name: item.itemName,
                qtyNeeded: (minStock * 2) - newQuantity, // Simple logic: Order enough to double par
                unit: item.unit
            }]
        });
        alert(`⚡ AUTOMATION: A Draft PO was created for ${item.itemName}`);
    } else {
        console.log("A Draft PO already exists for this supplier. Item not added to avoid duplication complexity in MVP.");
    }
};