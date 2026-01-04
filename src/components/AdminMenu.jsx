import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

// HELPER: Auto-creates URL-friendly slugs
const generateSlug = (text) => {
    return text.toLowerCase().trim().replace(/[^\w ]+/g, '').replace(/ +/g, '-');    
};

const AdminMenu = () => {
  const navigate = useNavigate();
  
  // --- STATE ---
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]); 
  const [orders, setOrders] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [uploading, setUploading] = useState(false);

  const [stats, setStats] = useState({ total: 0, topSold: '-', mostCategory: '-' });
  const [filterText, setFilterText] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');

  const [editingId, setEditingId] = useState(null); 
  const [formData, setFormData] = useState({
    name: '', price: '', categoryId: '', type: 'Veg', description: '', isAvailable: true,
    imageUrl: '', seoTitle: '', seoDescription: '', slug: '', altText: ''
  });

  // --- 1. DATA FETCHING ---
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);

    const fetchData = async () => {
        try {
            const catSnap = await getDocs(collection(db, "categories"));
            const fetchedCats = catSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCategories(fetchedCats);

            const itemSnap = await getDocs(collection(db, "menu_items"));
            const fetchedItems = itemSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setItems(fetchedItems);

            const orderSnap = await getDocs(collection(db, "orders"));
            const fetchedOrders = orderSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setOrders(fetchedOrders);

            calculateStats(fetchedItems, fetchedOrders, fetchedCats); 
            setLoading(false);
        } catch(err) {
            console.error(err);
            setLoading(false);
        }
    };
    fetchData();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- ADDED: CLOUDINARY UPLOAD LOGIC ---
  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", "rms_uploads"); 
    data.append("cloud_name", "driy6e3td"); 

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/driy6e3td/image/upload`, {
        method: "POST",
        body: data,
      });
      const fileData = await res.json();
      setFormData(prev => ({ ...prev, imageUrl: fileData.secure_url }));
      setUploading(false);
    } catch (err) {
      console.error(err);
      setUploading(false);
      alert("Image upload failed");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFileUpload(e.dataTransfer.files[0]);
  };

  const getCategoryName = (catId) => {
      const cat = categories.find(c => c.id === catId);
      if (cat) return cat.name;
      return catId || 'Uncategorized';
  };

  const calculateStats = (itemsData, ordersData, catsData) => {
      const total = itemsData.length;
      const catCounts = itemsData.reduce((acc, item) => {
          let catName = 'Uncategorized';
          if (item.categoryId) {
              const foundCat = catsData.find(c => c.id === item.categoryId);
              catName = foundCat ? foundCat.name : item.categoryId;
          }
          acc[catName] = (acc[catName] || 0) + 1;
          return acc;
      }, {});
      
      const mostCategory = Object.keys(catCounts).length > 0 
        ? Object.keys(catCounts).reduce((a, b) => catCounts[a] > catCounts[b] ? a : b)
        : '-';

      const itemSales = {};
      ordersData.forEach(order => {
          if(order.items && Array.isArray(order.items)) {
              order.items.forEach(item => {
                  itemSales[item.name] = (itemSales[item.name] || 0) + item.qty;
              });
          }
      });
      
      const topSold = Object.keys(itemSales).length > 0
        ? Object.keys(itemSales).reduce((a, b) => itemSales[a] > itemSales[b] ? a : b)
        : '-';

      setStats({ total, topSold, mostCategory });
  };

  const handleEditClick = (item) => {
      let resolvedId = item.categoryId;
      const matchingCat = categories.find(c => c.name === item.categoryId);
      if (matchingCat) resolvedId = matchingCat.id;

      setFormData({
          name: item.name, price: item.price, categoryId: resolvedId || '', 
          type: item.type || 'Veg', description: item.description || '', isAvailable: item.isAvailable,
          imageUrl: item.imageUrl || '', seoTitle: item.seoTitle || '', 
          seoDescription: item.seoDescription || '', slug: item.slug || '', altText: item.altText || ''
      });
      setEditingId(item.id);
      setShowForm(true);
      window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (uploading) return alert("Uploading image...");
    if (!formData.name || !formData.price || !formData.categoryId) return alert("Name, Price and Category are required!");

    try {
        const payload = {
            ...formData,
            price: parseFloat(formData.price),
            slug: formData.slug || generateSlug(formData.name),
            updatedAt: serverTimestamp()
        };

        if (editingId) {
            await updateDoc(doc(db, "menu_items", editingId), payload);
            alert("Dish Updated Successfully!");
        } else {
            await addDoc(collection(db, "menu_items"), { ...payload, createdAt: serverTimestamp() });
            alert("Dish Added Successfully!");
        }

        setFormData({ name: '', price: '', categoryId: '', type: 'Veg', description: '', isAvailable: true, imageUrl: '', seoTitle: '', seoDescription: '', slug: '', altText: '' });
        setEditingId(null);
        setShowForm(false);
        
        const refreshSnap = await getDocs(collection(db, "menu_items"));
        const refreshItems = refreshSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setItems(refreshItems);
        calculateStats(refreshItems, orders, categories); 

    } catch (error) {
        console.error("Error saving:", error);
        alert("Failed to save.");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this dish?")) {
      await deleteDoc(doc(db, "menu_items", id));
      const newItems = items.filter(i => i.id !== id);
      setItems(newItems);
      calculateStats(newItems, orders, categories);
    }
  };

  const filteredItems = items.filter(item => {
      const matchesText = item.name.toLowerCase().includes(filterText.toLowerCase());
      let matchesCategory = false;
      if (filterCategory === 'All') {
          matchesCategory = true;
      } else {
          if (item.categoryId === filterCategory) matchesCategory = true;
          const selectedCatObj = categories.find(c => c.id === filterCategory);
          if (selectedCatObj && item.categoryId === selectedCatObj.name) matchesCategory = true;
      }
      return matchesText && matchesCategory;
  });

  const getTypeStyle = (type) => {
      const label = type || 'Veg'; 
      if (label === 'Non-Veg') return { bg: '#FFEBEE', color: '#C62828', border: '#EF9A9A' };
      if (label === 'Drinks') return { bg: '#E3F2FD', color: '#1565C0', border: '#90CAF9' };
      return { bg: '#E8F5E9', color: '#2E7D32', border: '#A5D6A7' };
  };

  if (loading) return <div style={{padding:'40px', textAlign: 'center'}}>Loading Menu...</div>;

  return (
    <div style={{ padding: isMobile ? '10px' : '20px', backgroundColor: '#f4f6f8', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: '20px', gap: '15px' }}>
        <div>
            <h1 style={{ margin: 0, fontSize: isMobile ? '1.2rem' : '1.5rem', textTransform: 'uppercase' }}>Menu Dishes</h1>
            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '5px' }}>Manage your restaurant menu items</div>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => navigate('/')} style={{ flex: 1, padding: '10px', border: '1px solid #ccc', background: 'white', borderRadius: '6px', fontWeight: 'bold' }}>Back</button>
            <button 
              onClick={() => { setShowForm(!showForm); setEditingId(null); setFormData({ name: '', price: '', categoryId: '', type: 'Veg', description: '', isAvailable: true, imageUrl: '', seoTitle: '', seoDescription: '', slug: '', altText: '' }); }} 
              style={{ flex: 2, padding: '10px', backgroundColor: 'black', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}
            >
              {showForm ? "✕ Close" : "+ Add Dish"}
            </button>
        </div>
      </div>

      {/* STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '25px' }}>
          <div style={styles.statCard}>
              <div style={styles.statLabel}>Total Dishes</div>
              <div style={styles.statValue}>{stats.total}</div>
          </div>
          <div style={styles.statCard}>
              <div style={styles.statLabel}>Top Sold Item</div>
              <div style={{...styles.statValue, color: '#4CAF50', fontSize: isMobile ? '1rem' : '1.1rem'}}>{stats.topSold}</div>
          </div>
          <div style={styles.statCard}>
              <div style={styles.statLabel}>Most Popular Dish</div>
              <div style={{...styles.statValue, textTransform:'capitalize', fontSize: isMobile ? '1rem' : '1.1rem'}}>{stats.mostCategory}</div>
          </div>
      </div>

      {/* FILTER AREA */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '10px', marginBottom: '20px' }}>
          <input 
            type="text" 
            placeholder="Search Dish Name..." 
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            style={{ flex: 2, padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem' }}
          />
          <select 
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '1rem', backgroundColor: 'white' }}
          >
              <option value="All">All Categories</option>
              {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
          </select>
      </div>

      {/* FORM */}
      {showForm && (
        <div style={{ backgroundColor: 'white', padding: isMobile ? '15px' : '25px', borderRadius: '12px', marginBottom: '30px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', borderLeft: '5px solid #000' }}>
          <h3 style={{marginTop:0, fontSize: '1.1rem'}}>{editingId ? "Edit Dish" : "Add New Dish"}</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '15px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
               {/* ADDED: DRAG & DROP ZONE */}
               <div 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  style={{
                    ...styles.dropZone,
                    backgroundImage: formData.imageUrl ? `url(${formData.imageUrl})` : 'none',
                    border: uploading ? '2px dashed blue' : '2px dashed #ccc'
                  }}
                >
                  {!formData.imageUrl && !uploading && <span>Drag Image Here</span>}
                  {uploading && <span>Uploading...</span>}
                  <input type="file" onChange={(e) => handleFileUpload(e.target.files[0])} style={styles.fileInput} id="fileInput" />
                  {!uploading && <label htmlFor="fileInput" style={{marginTop:'10px', fontSize:'0.7rem', padding:'5px 10px', background:'#eee', borderRadius:'4px', cursor:'pointer'}}>Or Click to Browse</label>}
               </div>

               <div style={{display:'grid', gap:'15px'}}>
                  <div>
                      <label style={styles.label}>Dish Name</label>
                      <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value, slug: generateSlug(e.target.value)})} style={styles.input} />
                  </div>
                  <div style={{display:'grid', gridTemplateColumns: '1fr 1fr', gap:'15px'}}>
                      <div>
                          <label style={styles.label}>Price (Rs.)</label>
                          <input type="number" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} style={styles.input} />
                      </div>
                      <div>
                          <label style={styles.label}>Category</label>
                          <select value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})} style={styles.input} required>
                            <option value="">Select Category</option>
                            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                          </select>
                      </div>
                  </div>
               </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: '15px' }}>
                <div>
                    <label style={styles.label}>Food Type</label>
                    <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} style={styles.input}>
                        <option value="Veg">Veg</option>
                        <option value="Non-Veg">Non-Veg</option>
                        <option value="Drinks">Drinks</option>
                    </select>
                </div>
                <div style={{display: 'flex', alignItems:'center', marginTop: isMobile ? '0' : '25px', gridColumn: isMobile ? 'span 2' : 'span 2'}}>
                    <label style={{display:'flex', alignItems:'center', cursor:'pointer', fontSize: '0.9rem'}}>
                        <input type="checkbox" checked={formData.isAvailable} onChange={e => setFormData({...formData, isAvailable: e.target.checked})} style={{marginRight:'10px', width:'22px', height:'22px'}} />
                        Available in Menu?
                    </label>
                </div>
            </div>

            {/* ADDED: SEO CMS SECTION */}
            <div style={styles.seoBox}>
                <h4 style={{margin:0, fontSize: '0.9rem', color: '#333'}}>SEO / STAFF CMS</h4>
                <div style={{display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:'15px', marginTop:'10px'}}>
                    <div>
                        <label style={styles.label}>Search Aliases (SEO Title)</label>
                        <input placeholder="Ex: C. Momo, Plate 10" value={formData.seoTitle} onChange={e => setFormData({...formData, seoTitle: e.target.value})} style={styles.input} />
                    </div>
                    <div>
                        <label style={styles.label}>URL Slug (Auto)</label>
                        <input value={formData.slug} readOnly style={{...styles.input, backgroundColor:'#f9f9f9'}} />
                    </div>
                </div>
                <div style={{marginTop:'10px'}}>
                    <label style={styles.label}>Staff Note / Allergy Warnings</label>
                    <textarea placeholder="Ex: Contains ginger. Upsell Coke." value={formData.seoDescription} onChange={e => setFormData({...formData, seoDescription: e.target.value})} style={{...styles.input, height:'60px'}} />
                </div>
                <div style={{marginTop:'10px'}}>
                    <label style={styles.label}>Plating Guide (Alt Text)</label>
                    <input placeholder="Ex: Garnish with cilantro" value={formData.altText} onChange={e => setFormData({...formData, altText: e.target.value})} style={styles.input} />
                </div>
            </div>

            <button type="submit" disabled={uploading} style={{ padding: '15px', backgroundColor: uploading ? '#ccc' : (editingId ? '#2196F3' : 'black'), color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '1rem', cursor: uploading ? 'not-allowed' : 'pointer' }}>
              {uploading ? "Uploading Image..." : (editingId ? "Update Dish" : "Add to Menu")}
            </button>
          </form>
        </div>
      )}

      {/* DATA VIEW (TABLE/CARDS) */}
      {isMobile ? (
          <div style={{ display: 'grid', gap: '15px' }}>
              {filteredItems.map((item) => {
                  const style = getTypeStyle(item.type);
                  return (
                    <div key={item.id} style={{ backgroundColor: 'white', padding: '15px', borderRadius: '12px', border: '1px solid #eee', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                        <img src={item.imageUrl || 'https://via.placeholder.com/150'} alt={item.name} style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px', marginBottom: '10px' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{fontWeight:'bold', fontSize:'1rem'}}>{item.name}</div>
                            <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold', backgroundColor: style.bg, color: style.color, border: `1px solid ${style.border}` }}>
                                {item.type || 'Veg'}
                            </span>
                        </div>
                        <div style={{display:'flex', justifyContent:'space-between', color:'#666', fontSize:'0.85rem', marginBottom:'15px'}}>
                            <span style={{textTransform: 'capitalize'}}>📂 {getCategoryName(item.categoryId)}</span>
                            <span style={{color:'black', fontWeight:'bold'}}>Rs. {item.price}</span>
                        </div>
                        <div style={{display:'flex', gap:'10px'}}>
                            <button onClick={() => handleEditClick(item)} style={{flex:1, padding:'10px', background:'#E3F2FD', color:'#1976D2', border:'none', borderRadius:'6px', fontWeight:'bold'}}>Edit</button>
                            <button onClick={() => handleDelete(item.id)} style={{flex:1, padding:'10px', background:'#FFEBEE', color:'#D32F2F', border:'none', borderRadius:'6px', fontWeight:'bold'}}>Delete</button>
                        </div>
                    </div>
                  );
              })}
          </div>
      ) : (
          <div style={{ backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ backgroundColor: '#f9f9f9', borderBottom: '1px solid #eee' }}>
                  <tr>
                    <th style={styles.th}>Image</th>
                    <th style={styles.th}>Dish Name</th>
                    <th style={styles.th}>Price</th>
                    <th style={styles.th}>Category</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => {
                    const style = getTypeStyle(item.type);
                    return (
                        <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                          <td style={styles.td}><img src={item.imageUrl || 'https://via.placeholder.com/150'} alt="" style={{width:'50px', height:'40px', objectFit:'cover', borderRadius:'4px'}} /></td>
                          <td style={styles.td}><span style={{fontWeight:'bold'}}>{item.name}</span></td>
                          <td style={styles.td}>Rs. {item.price}</td>
                          <td style={{...styles.td, textTransform: 'capitalize'}}>{getCategoryName(item.categoryId)}</td>
                          <td style={styles.td}>{item.isAvailable ? <span style={{color:'green', fontWeight:'bold'}}>Available</span> : <span style={{color:'red'}}>Hidden</span>}</td>
                          <td style={styles.td}>
                            <button onClick={() => handleEditClick(item)} style={{marginRight:'10px', padding:'6px 12px', background:'#E3F2FD', color:'#1976D2', border:'none', borderRadius:'4px', fontWeight:'bold'}}>Edit</button>
                            <button onClick={() => handleDelete(item.id)} style={{padding:'6px 12px', background:'#FFEBEE', color:'#D32F2F', border:'none', borderRadius:'4px', fontWeight:'bold'}}>Delete</button>
                          </td>
                        </tr>
                    );
                  })}
                </tbody>
              </table>
          </div>
      )}
    </div>
  );
};

const styles = {
    statCard: { backgroundColor: 'white', padding: '15px', borderRadius: '12px', border: '1px solid #eee', textAlign: 'center' },
    statLabel: { color: '#888', fontSize: '0.8rem', marginBottom: '5px' },
    statValue: { fontSize: '1.2rem', fontWeight: 'bold' },
    input: { width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.9rem', boxSizing: 'border-box' },
    label: { display: 'block', marginBottom: '5px', fontSize: '0.75rem', fontWeight: 'bold', color: '#555' },
    th: { padding: '15px', textAlign: 'left', fontSize: '0.85rem', color: '#666', fontWeight: 'bold' },
    td: { padding: '15px', fontSize: '0.9rem', color: '#333' },
    seoBox: { background: '#f9f9f9', padding: '15px', borderRadius: '8px', border: '1px solid #eee', marginTop: '10px' },
    dropZone: { height: '180px', borderRadius: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative', backgroundColor: '#eee', cursor: 'pointer', overflow: 'hidden' },
    fileInput: { opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer' }
};

export default AdminMenu;