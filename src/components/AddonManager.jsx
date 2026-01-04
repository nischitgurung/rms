import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp, getDocs } from 'firebase/firestore';

const AddonManager = () => {
    const navigate = useNavigate();

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
        // SEO Strategy Fields
        seoTitle: '',
        seoDescription: ''
    });

    // Temp state for adding ingredient to the add-on
    const [ingForm, setIngForm] = useState({ stockId: '', qty: '' });
    const [ingSearch, setIngSearch] = useState(''); // ADDED: For searching materials by Alias

    // --- 1. DATA FETCHING ---
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);

        // Fetch Modifiers/Add-ons
        const unsubAddons = onSnapshot(collection(db, "modifiers"), (snapshot) => {
            setAddons(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });

        // Fetch Inventory Items for mapping
        const unsubInventory = onSnapshot(collection(db, "inventory"), (snapshot) => {
            setStockItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => {
            unsubAddons();
            unsubInventory();
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // --- 2. RECIPE LOGIC FOR ADD-ONS ---
    const addIngredientToRecipe = () => {
        if (!ingForm.stockId || !ingForm.qty) return alert("Select material and quantity");
        const stockItem = stockItems.find(s => s.id === ingForm.stockId);
        
        const newEntry = {
            stockId: stockItem.id,
            name: stockItem.itemName,
            qty: parseFloat(ingForm.qty),
            unit: stockItem.unit
        };

        setFormData(prev => ({
            ...prev,
            recipe: [...prev.recipe, newEntry]
        }));
        setIngForm({ stockId: '', qty: '' });
        setIngSearch('');
    };

    const removeIngredientFromRecipe = (index) => {
        setFormData(prev => ({
            ...prev,
            recipe: prev.recipe.filter((_, i) => i !== index)
        }));
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
            // Save SEO Fields
            seoTitle: formData.seoTitle || formData.name,
            seoDescription: formData.seoDescription || '',
            updatedAt: serverTimestamp()
        };

        try {
            if (editingId) {
                await updateDoc(doc(db, "modifiers", editingId), payload);
                alert("Updated!");
            } else {
                await addDoc(collection(db, "modifiers"), { ...payload, createdAt: serverTimestamp() });
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

    // Filter stock items by Alias or Name
    const filteredStock = stockItems.filter(s => 
        s.itemName?.toLowerCase().includes(ingSearch.toLowerCase()) || 
        s.seoTitle?.toLowerCase().includes(ingSearch.toLowerCase())
    );

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;

    return (
        <div style={{ padding: isMobile ? '10px' : '20px', backgroundColor: '#f4f6f8', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
            
            {/* HEADER */}
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', marginBottom: '20px', gap: '15px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: isMobile ? '1.2rem' : '1.5rem' }}>ADD-ONS & INVENTORY</h1>
                    <p style={{ fontSize: '0.85rem', color: '#666' }}>Link extra toppings to stock materials</p>
                </div>
                <button onClick={() => navigate('/')} style={styles.backBtn}>Back</button>
            </div>

            {/* FORM CARD */}
            <div style={{ ...styles.card, borderLeft: `5px solid ${editingId ? '#2196F3' : 'black'}` }}>
                <h3 style={{ marginTop: 0 }}>{editingId ? "Edit Add-on" : "Create Add-on"}</h3>
                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '15px', marginBottom: '15px' }}>
                        <input type="text" placeholder="Add-on Name (e.g. Extra Cheese)" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} style={styles.input} required />
                        <input type="number" placeholder="Price" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} style={styles.input} required />
                    </div>

                    {/* ADDED: SEO UPSELL PANEL */}
                    <div style={styles.seoBox}>
                        <h4 style={{marginTop:0, color:'#d32f2f', fontSize:'0.85rem'}}>🚀 UPSELL OPTIMIZATION</h4>
                        <div style={{display:'grid', gap:'10px'}}>
                            <input 
                                placeholder="Upsell Alias (Short Code for Staff)" 
                                value={formData.seoTitle} 
                                onChange={e => setFormData({...formData, seoTitle: e.target.value})} 
                                style={styles.miniInput} 
                            />
                            <textarea 
                                placeholder="Staff Upsell Script (e.g. 'Highly recommended with Spicy Burgers!')" 
                                value={formData.seoDescription} 
                                onChange={e => setFormData({...formData, seoDescription: e.target.value})} 
                                style={{...styles.miniInput, height:'50px'}} 
                            />
                        </div>
                    </div>

                    {/* INVENTORY MAPPING SECTION */}
                    <div style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px dashed #ccc' }}>
                        <h4 style={{ marginTop: 0, fontSize: '0.9rem' }}>📦 Inventory Impact (Recipes)</h4>
                        
                        {/* Material Search */}
                        <input 
                            placeholder="Find material by alias..." 
                            value={ingSearch} 
                            onChange={e => setIngSearch(e.target.value)} 
                            style={{...styles.input, marginBottom:'10px', height:'35px', fontSize:'0.8rem'}} 
                        />

                        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                            <select value={ingForm.stockId} onChange={e => setIngForm({ ...ingForm, stockId: e.target.value })} style={{ ...styles.input, flex: 2 }}>
                                <option value="">Select Material ({filteredStock.length} found)</option>
                                {filteredStock.map(s => <option key={s.id} value={s.id}>{s.itemName} ({s.unit}) {s.seoTitle && `[${s.seoTitle}]`}</option>)}
                            </select>
                            <input type="number" placeholder="Qty" value={ingForm.qty} onChange={e => setIngForm({ ...ingForm, qty: e.target.value })} style={{ ...styles.input, flex: 1 }} />
                            <button type="button" onClick={addIngredientToRecipe} style={styles.addIngBtn}>Link</button>
                        </div>

                        {/* Current Linked Ingredients */}
                        {formData.recipe.map((ing, idx) => (
                            <div key={idx} style={styles.recipeTag}>
                                {ing.name}: {ing.qty} {ing.unit}
                                <span onClick={() => removeIngredientFromRecipe(idx)} style={{ marginLeft: '10px', color: 'red', cursor: 'pointer' }}>×</span>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button type="submit" style={{ ...styles.submitBtn, backgroundColor: editingId ? '#2196F3' : 'black' }}>
                            {editingId ? "Update Add-on" : "Save Add-on"}
                        </button>
                        {editingId && <button type="button" onClick={handleCancelEdit} style={styles.cancelBtn}>Cancel</button>}
                    </div>
                </form>
            </div>

            {/* LIST VIEW */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
                {addons.map(item => (
                    <div key={item.id} style={styles.card}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                            <span>{item.name}</span>
                            <span>Rs. {item.price}</span>
                        </div>
                        {item.seoTitle && <div style={{fontSize:'0.7rem', color:'#888', marginTop:'5px'}}>Alias: {item.seoTitle}</div>}
                        <div style={{ margin: '10px 0', fontSize: '0.8rem', color: '#666' }}>
                            <strong>Stock Impact:</strong> {item.recipe?.length > 0 ? item.recipe.map(r => `${r.qty}${r.unit} ${r.name}`).join(', ') : 'None'}
                        </div>
                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                            <button onClick={() => handleEditClick(item)} style={styles.editBtn}>Edit</button>
                            <button onClick={() => handleDelete(item.id)} style={styles.deleteBtn}>Delete</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const styles = {
    card: { backgroundColor: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '20px' },
    input: { padding: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '1rem', width: '100%', boxSizing: 'border-box' },
    miniInput: { padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' },
    backBtn: { padding: '10px 20px', border: '1px solid #ccc', background: 'white', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
    addIngBtn: { padding: '0 15px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    recipeTag: { display: 'inline-block', backgroundColor: '#eee', padding: '5px 10px', borderRadius: '4px', marginRight: '5px', marginTop: '5px', fontSize: '0.85rem' },
    submitBtn: { flex: 1, padding: '15px', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
    cancelBtn: { padding: '15px', background: '#ccc', border: 'none', borderRadius: '6px', cursor: 'pointer' },
    editBtn: { flex: 1, padding: '8px', background: '#E3F2FD', color: '#1976D2', border: 'none', borderRadius: '4px', fontWeight: 'bold' },
    deleteBtn: { flex: 1, padding: '8px', background: '#FFEBEE', color: '#D32F2F', border: 'none', borderRadius: '4px', fontWeight: 'bold' },
    seoBox: { backgroundColor: '#fff5f5', padding: '12px', borderRadius: '8px', border: '1px solid #ffcdd2', marginBottom: '15px' }
};

export default AddonManager;