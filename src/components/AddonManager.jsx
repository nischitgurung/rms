import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp, query, where, getDocs } from 'firebase/firestore'; // <--- Added query, where
import { useUser } from '../contexts/UserContext'; // <--- 1. NEW IMPORT

const AddonManager = () => {
    const navigate = useNavigate();
    const { restaurantId } = useUser(); // <--- 2. GET RESTAURANT ID

    // --- STATE ---
    const [addons, setAddons] = useState([]);
    const [stockItems, setStockItems] = useState([]); // To link with Inventory
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    const [formData, setFormData] = useState({
        name: '',
        price: '',
        isAvailable: true,
        recipe: [], // Array of { stockId, name, qty, unit }
        seoTitle: '',
        seoDescription: ''
    });

    // Temp state for adding ingredient
    const [ingForm, setIngForm] = useState({ stockId: '', qty: '' });
    const [ingSearch, setIngSearch] = useState(''); 

    // --- 1. DATA FETCHING ---
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);

        // <--- 3. GUARD CLAUSE
        if (!restaurantId) return;

        // <--- 4. FILTER MODIFIERS BY RESTAURANT ID
        const qModifiers = query(collection(db, "modifiers"), where("userId", "==", restaurantId));
        const unsubAddons = onSnapshot(qModifiers, (snapshot) => {
            setAddons(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });

        // <--- 5. FILTER INVENTORY BY RESTAURANT ID
        const qInventory = query(collection(db, "inventory"), where("userId", "==", restaurantId));
        const unsubInventory = onSnapshot(qInventory, (snapshot) => {
            setStockItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => {
            unsubAddons();
            unsubInventory();
            window.removeEventListener('resize', handleResize);
        };
    }, [restaurantId]); // <--- 6. ADD DEPENDENCY

    // --- 2. RECIPE LOGIC ---
    const addIngredientToRecipe = () => {
        if (!ingForm.stockId || !ingForm.qty) return alert("Select material and quantity");
        const stockItem = stockItems.find(s => s.id === ingForm.stockId);
        
        const newEntry = {
            stockId: stockItem.id,
            name: stockItem.itemName,
            qty: parseFloat(ingForm.qty),
            unit: stockItem.unit
        };

        setFormData(prev => ({ ...prev, recipe: [...prev.recipe, newEntry] }));
        setIngForm({ stockId: '', qty: '' });
        setIngSearch('');
    };

    const removeIngredientFromRecipe = (index) => {
        setFormData(prev => ({ ...prev, recipe: prev.recipe.filter((_, i) => i !== index) }));
    };

    // --- 3. CRUD HANDLERS ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.price) return alert("Name and Price are required!");

        const payload = {
            name: formData.name,
            price: parseFloat(formData.price),
            isAvailable: formData.isAvailable,
            recipe: formData.recipe, 
            seoTitle: formData.seoTitle || formData.name,
            seoDescription: formData.seoDescription || '',
            updatedAt: serverTimestamp()
        };

        try {
            if (editingId) {
                await updateDoc(doc(db, "modifiers", editingId), payload);
                alert("Updated!");
            } else {
                // <--- 7. TAG NEW ADDON WITH RESTAURANT ID
                await addDoc(collection(db, "modifiers"), { 
                    ...payload, 
                    userId: restaurantId, // <--- IMPORTANT
                    createdAt: serverTimestamp() 
                });
                alert("Created!");
            }
            handleCancelEdit();
        } catch (error) {
            console.error(error);
            alert("Error saving.");
        }
    };

    const handleEditClick = (item) => {
        setFormData({
            name: item.name,
            price: item.price,
            isAvailable: item.isAvailable ?? true,
            recipe: item.recipe || [],
            seoTitle: item.seoTitle || '',
            seoDescription: item.seoDescription || ''
        });
        setEditingId(item.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setFormData({ name: '', price: '', isAvailable: true, recipe: [], seoTitle: '', seoDescription: '' });
        setEditingId(null);
    };

    const handleDelete = async (id) => {
        if (window.confirm("Delete this Add-on?")) {
            await deleteDoc(doc(db, "modifiers", id));
        }
    };

    const filteredStock = stockItems.filter(s => 
        s.itemName?.toLowerCase().includes(ingSearch.toLowerCase()) || 
        s.seoTitle?.toLowerCase().includes(ingSearch.toLowerCase())
    );

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;

    return (
        <div style={{ padding: isMobile ? '10px' : '20px', backgroundColor: '#f4f6f8', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
            
            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: isMobile ? '1.2rem' : '1.5rem' }}>ADD-ONS</h1>
                    <p style={{ fontSize: '0.8rem', color: '#666', margin: 0 }}>Manage extras & toppings</p>
                </div>
                <button onClick={() => navigate('/')} style={styles.backBtn}>Back</button>
            </div>

            {/* FORM CARD */}
            <div style={{ ...styles.card, borderLeft: `5px solid ${editingId ? '#2196F3' : 'black'}`, padding: isMobile ? '12px' : '20px' }}>
                <h3 style={{ marginTop: 0, fontSize: '1rem' }}>{editingId ? "Edit Add-on" : "Create New Add-on"}</h3>
                <form onSubmit={handleSubmit}>
                    
                    {/* Name & Price Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px', marginBottom: '10px' }}>
                        <input type="text" placeholder="Name (e.g. Cheese)" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} style={styles.input} required />
                        <input type="number" placeholder="Price" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} style={styles.input} required />
                    </div>

                    {/* SEO / Upsell - Collapsed look */}
                    <div style={styles.seoBox}>
                        <div style={{display:'flex', justifyContent:'space-between', marginBottom:'5px'}}>
                            <span style={{fontSize:'0.75rem', fontWeight:'bold', color:'#d32f2f'}}>🚀 UPSELL CONFIG</span>
                        </div>
                        <div style={{display:'grid', gap:'8px'}}>
                            <input 
                                placeholder="Alias (Short Code)" 
                                value={formData.seoTitle} 
                                onChange={e => setFormData({...formData, seoTitle: e.target.value})} 
                                style={styles.miniInput} 
                            />
                            <textarea 
                                placeholder="Staff Script (e.g. 'Good with spicy!')" 
                                value={formData.seoDescription} 
                                onChange={e => setFormData({...formData, seoDescription: e.target.value})} 
                                style={{...styles.miniInput, height:'40px'}} 
                            />
                        </div>
                    </div>

                    {/* INVENTORY MAPPING */}
                    <div style={{ backgroundColor: '#f9f9f9', padding: '10px', borderRadius: '8px', marginBottom: '15px', border: '1px dashed #ccc' }}>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem' }}>📦 Link Inventory (Recipe)</h4>
                        
                        {/* Search Input */}
                        <input 
                            placeholder="Search material..." 
                            value={ingSearch} 
                            onChange={e => setIngSearch(e.target.value)} 
                            style={{...styles.miniInput, marginBottom:'8px'}} 
                        />

                        {/* Selection Row - Optimized Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '8px', marginBottom: '8px' }}>
                            <select value={ingForm.stockId} onChange={e => setIngForm({ ...ingForm, stockId: e.target.value })} style={styles.miniInput}>
                                <option value="">Select Material</option>
                                {filteredStock.map(s => <option key={s.id} value={s.id}>{s.itemName} ({s.unit})</option>)}
                            </select>
                            <input type="number" placeholder="Qty" value={ingForm.qty} onChange={e => setIngForm({ ...ingForm, qty: e.target.value })} style={styles.miniInput} />
                            <button type="button" onClick={addIngredientToRecipe} style={styles.addIngBtn}>+</button>
                        </div>

                        {/* Tags */}
                        <div style={{display:'flex', flexWrap:'wrap', gap:'5px'}}>
                            {formData.recipe.map((ing, idx) => (
                                <div key={idx} style={styles.recipeTag}>
                                    {ing.name}: {ing.qty}{ing.unit}
                                    <span onClick={() => removeIngredientFromRecipe(idx)} style={{ marginLeft: '8px', color: 'red', fontWeight:'bold', cursor: 'pointer' }}>×</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button type="submit" style={{ ...styles.submitBtn, backgroundColor: editingId ? '#2196F3' : 'black' }}>
                            {editingId ? "Update" : "Save"}
                        </button>
                        {editingId && <button type="button" onClick={handleCancelEdit} style={styles.cancelBtn}>Cancel</button>}
                    </div>
                </form>
            </div>

            {/* LIST VIEW - 2 Column Grid on Mobile */}
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(auto-fill, minmax(250px, 1fr))', 
                gap: '10px' 
            }}>
                {addons.map(item => (
                    <div key={item.id} style={styles.itemCard}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems:'start', marginBottom:'5px' }}>
                            <span style={{fontWeight:'bold', fontSize:'0.95rem', lineHeight:'1.2'}}>{item.name}</span>
                            <span style={{fontWeight:'bold', color:'#4CAF50', fontSize:'0.9rem'}}>Rs.{item.price}</span>
                        </div>
                        
                        {item.seoTitle && <div style={{fontSize:'0.7rem', color:'#888', marginBottom:'5px'}}>Alias: {item.seoTitle}</div>}
                        
                        <div style={{ fontSize: '0.75rem', color: '#666', marginBottom:'10px', height:'30px', overflow:'hidden' }}>
                            {item.recipe?.length > 0 ? (
                                <span>🔗 {item.recipe.map(r => `${r.qty}${r.unit} ${r.name}`).join(', ')}</span>
                            ) : (
                                <span style={{fontStyle:'italic', color:'#ccc'}}>No recipe linked</span>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '5px', marginTop: 'auto' }}>
                            <button onClick={() => handleEditClick(item)} style={styles.editBtn}>Edit</button>
                            <button onClick={() => handleDelete(item.id)} style={styles.deleteBtn}>Del</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const styles = {
    card: { backgroundColor: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '20px' },
    itemCard: { 
        backgroundColor: 'white', 
        padding: '12px', 
        borderRadius: '10px', 
        border: '1px solid #eee', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        display: 'flex', 
        flexDirection: 'column',
        minHeight: '110px'
    },
    input: { padding: '10px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.95rem', width: '100%', boxSizing: 'border-box' },
    miniInput: { padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' },
    
    backBtn: { padding: '8px 15px', border: '1px solid #ccc', background: 'white', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize:'0.85rem' },
    
    addIngBtn: { padding: '0 12px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight:'bold', fontSize:'1.2rem', display:'flex', alignItems:'center', justifyContent:'center' },
    
    recipeTag: { display: 'inline-flex', alignItems:'center', backgroundColor: '#e0e0e0', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight:'500' },
    
    submitBtn: { flex: 1, padding: '12px', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize:'1rem' },
    cancelBtn: { padding: '12px', background: '#e0e0e0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize:'0.9rem', fontWeight:'bold' },
    
    editBtn: { flex: 1, padding: '6px', background: '#E3F2FD', color: '#1565C0', border: 'none', borderRadius: '4px', fontWeight: 'bold', fontSize:'0.8rem', cursor:'pointer' },
    deleteBtn: { flex: 1, padding: '6px', background: '#FFEBEE', color: '#C62828', border: 'none', borderRadius: '4px', fontWeight: 'bold', fontSize:'0.8rem', cursor:'pointer' },
    
    seoBox: { backgroundColor: '#fff5f5', padding: '10px', borderRadius: '8px', border: '1px solid #ffcdd2', marginBottom: '15px' }
};

export default AddonManager;