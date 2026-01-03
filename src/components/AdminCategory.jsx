import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';

const AdminCategory = () => {
  const navigate = useNavigate();
  
  // --- STATE ---
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]); 
  const [ordersData, setOrdersData] = useState([]); 
  const [loading, setLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null); 
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const [stats, setStats] = useState({ totalDishes: 0, topSold: '-', mostDishesCat: '-' });
  const [formData, setFormData] = useState({ name: '', imageColor: '#e0e0e0' });

  // --- 1. DATA FETCHING ---
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);

    const unsubCategories = onSnapshot(collection(db, "categories"), (snapshot) => {
        const fetchedCats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCategories(fetchedCats.sort((a,b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)));
        setLoading(false);
    });

    const fetchStatsData = async () => {
        try {
            const itemSnap = await getDocs(collection(db, "menu_items"));
            const fetchedItems = itemSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMenuItems(fetchedItems);

            const orderSnap = await getDocs(collection(db, "orders"));
            const fetchedOrders = orderSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setOrdersData(fetchedOrders);
        } catch (err) {
            console.error("Stats Error:", err);
        }
    };
    fetchStatsData();

    return () => {
        window.removeEventListener('resize', handleResize);
        unsubCategories();
    };
  }, []);

  useEffect(() => {
      if (menuItems.length > 0 || categories.length > 0) {
          calculateStats();
      }
  }, [categories, menuItems, ordersData]);

  const calculateStats = () => {
      const catCounts = menuItems.reduce((acc, item) => {
          let catName = 'Uncategorized';
          if (item.categoryId) {
              const foundCat = categories.find(c => c.id === item.categoryId);
              catName = foundCat ? foundCat.name : item.categoryId; 
          }
          acc[catName] = (acc[catName] || 0) + 1;
          return acc;
      }, {});
      
      const mostDishesCat = Object.keys(catCounts).length > 0 
          ? Object.keys(catCounts).reduce((a, b) => catCounts[a] > catCounts[b] ? a : b) 
          : '-';

      const catSales = {};
      ordersData.forEach(order => {
          if(order.items && Array.isArray(order.items)) {
              order.items.forEach(item => {
                  let catName = 'Uncategorized';
                  if (item.categoryId) {
                      const foundCat = categories.find(c => c.id === item.categoryId);
                      catName = foundCat ? foundCat.name : item.categoryId;
                  }
                  catSales[catName] = (catSales[catName] || 0) + item.qty;
              });
          }
      });
      
      const topSold = Object.keys(catSales).length > 0
          ? Object.keys(catSales).reduce((a, b) => catSales[a] > catSales[b] ? a : b)
          : '-';

      setStats({ 
          totalDishes: menuItems.length, 
          topSold: topSold, 
          mostDishesCat: mostDishesCat 
      });
  };

  const handleEditClick = (cat) => {
      setFormData({ name: cat.name, imageColor: cat.imageColor });
      setEditingId(cat.id);
      setShowForm(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return alert("Category Name is required!");

    try {
        if (editingId) {
            await updateDoc(doc(db, "categories", editingId), { name: formData.name });
            alert("Category Updated!");
        } else {
            const colors = ['#FFEBEE', '#E3F2FD', '#E8F5E9', '#FFF3E0', '#F3E5F5', '#E0F2F1'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            await addDoc(collection(db, "categories"), {
                name: formData.name,
                sortOrder: categories.length + 1,
                imageColor: randomColor,
                createdAt: serverTimestamp()
            });
            alert("Category Added!");
        }
        setShowForm(false);
        setEditingId(null);
        setFormData({ name: '', imageColor: '#e0e0e0' });
    } catch (error) {
        console.error("Error saving category:", error);
        alert("Error saving category.");
    }
  };

  const handleDelete = async (id) => {
      if(window.confirm("Delete this category? Items in this category might become hidden.")) {
          try { await deleteDoc(doc(db, "categories", id)); } 
          catch (e) { console.error(e); alert("Error deleting."); }
      }
  };

  if (loading) return <div style={{padding:'40px', textAlign:'center'}}>Loading Categories...</div>;

  return (
    <div style={{ padding: isMobile ? '15px' : '20px', backgroundColor: '#f4f6f8', minHeight: '100vh', fontFamily: 'Arial, sans-serif' }}>
      
      {/* HEADER */}
      <div style={{ 
          display: 'flex', 
          flexDirection: isMobile ? 'column' : 'row', 
          justifyContent: 'space-between', 
          alignItems: isMobile ? 'stretch' : 'center', 
          marginBottom: '25px', 
          gap: '15px' 
      }}>
        <div>
            <h1 style={{ margin: 0, fontSize: isMobile ? '1.3rem' : '1.5rem', textTransform: 'uppercase' }}>Menu Categories</h1>
            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '5px' }}>Manage your menu sections</div>
        </div>
        <div style={{display:'flex', gap:'10px'}}>
            <button onClick={() => navigate('/')} style={{ flex: 1, padding: '10px 15px', background: 'white', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', fontWeight:'bold' }}>Back</button>
            <button 
                onClick={() => { setShowForm(!showForm); setEditingId(null); setFormData({ name: '', imageColor: '#e0e0e0' }); }} 
                style={{ flex: 2, padding: '10px 15px', backgroundColor: 'black', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
                {showForm ? "✕ Close" : "+ Add New"}
            </button>
        </div>
      </div>

      {/* STATS - Responsive Grid */}
      <div style={{ 
          display: 'grid', 
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '12px', 
          marginBottom: '30px' 
      }}>
          <div style={styles.statCard}>
              <div style={styles.statLabel}>Total Dishes</div>
              <div style={styles.statValue}>{stats.totalDishes}</div>
          </div>
          <div style={styles.statCard}>
              <div style={styles.statLabel}>Top Sold Category</div>
              <div style={{...styles.statValue, fontSize: isMobile ? '1.1rem' : '1.4rem', color:'#4CAF50', textTransform:'capitalize'}}>{stats.topSold}</div>
          </div>
          <div style={styles.statCard}>
              <div style={styles.statLabel}>Most Dishes Category</div>
              <div style={{...styles.statValue, fontSize: isMobile ? '1.1rem' : '1.4rem', textTransform:'capitalize'}}>{stats.mostDishesCat}</div>
          </div>
      </div>

      {/* FORM - Centered and full width on mobile */}
      {showForm && (
          <div style={{ 
              backgroundColor: 'white', 
              padding: isMobile ? '20px' : '25px', 
              borderRadius: '12px', 
              marginBottom: '30px', 
              maxWidth: isMobile ? '100%' : '500px', 
              margin: isMobile ? '0 0 30px 0' : '0 auto 30px 0',
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)', 
              borderLeft: '5px solid black' 
          }}>
              <h3 style={{marginTop:0, fontSize: '1.1rem'}}>{editingId ? "Edit Category" : "Add New Category"}</h3>
              <form onSubmit={handleSubmit} style={{display:'grid', gap:'15px'}}>
                  <div>
                      <label style={{display:'block', marginBottom:'5px', fontWeight:'bold', fontSize:'0.85rem'}}>Category Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Desserts, Starters" 
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        style={styles.input}
                      />
                  </div>
                  <div style={{display:'flex', gap:'10px'}}>
                      <button type="button" onClick={() => setShowForm(false)} style={styles.cancelBtn}>Cancel</button>
                      <button type="submit" style={styles.saveBtn}>{editingId ? "Update" : "Save"}</button>
                  </div>
              </form>
          </div>
      )}

      {/* LIST - Responsive Grid */}
      {categories.length === 0 ? (
          <div style={{textAlign:'center', padding:'50px 20px', color:'#888', background:'white', borderRadius:'12px', border:'1px solid #eee'}}>
              <h3>No Categories Found</h3>
              <p>Click <b>"+ Add New"</b> to create your first category.</p>
          </div>
      ) : (
          <div style={{ 
              display: 'grid', 
              gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(220px, 1fr))', 
              gap: isMobile ? '12px' : '25px' 
          }}>
              {categories.map((cat) => (
                  <div key={cat.id} style={styles.catCard}>
                      <div style={{
                          height: isMobile ? '80px' : '120px', 
                          backgroundColor: cat.imageColor || '#f0f0f0', 
                          borderRadius: '8px', 
                          marginBottom: '12px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: isMobile ? '2rem' : '3rem',
                          color: '#555'
                      }}>
                          {cat.name.toLowerCase().includes('drink') ? '🥤' : 
                           cat.name.toLowerCase().includes('dessert') ? '🍰' : '🍽️'}
                      </div>
                      <h3 style={{ margin: '0 0 12px 0', fontSize: isMobile ? '1rem' : '1.2rem', color: '#000', textTransform:'capitalize', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat.name}</h3>
                      <div style={{display:'flex', flexDirection: isMobile ? 'column' : 'row', gap: '8px', marginTop:'auto'}}>
                          <button onClick={() => handleEditClick(cat)} style={{...styles.editBtn, padding: '10px'}}>Edit</button>
                          <button onClick={() => handleDelete(cat.id)} style={{...styles.deleteBtn, padding: '10px'}}>Delete</button>
                      </div>
                  </div>
              ))}
          </div>
      )}
    </div>
  );
};

const styles = {
    statCard: { backgroundColor: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', textAlign: 'center', border: '1px solid #eee' },
    statLabel: { color: '#888', fontSize: '0.8rem', marginBottom: '5px' },
    statValue: { fontSize: '1.4rem', fontWeight: 'bold', color: '#333' },
    catCard: { backgroundColor: 'white', padding: '12px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', textAlign: 'center', display: 'flex', flexDirection: 'column', border: '1px solid #eee' },
    input: { padding: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '1rem', width: '100%', boxSizing: 'border-box' },
    saveBtn: { flex: 1, padding: '12px', backgroundColor: 'black', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' },
    cancelBtn: { flex: 1, padding: '12px', backgroundColor: 'white', color: '#333', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
    editBtn: { flex: 1, backgroundColor: '#E3F2FD', color: '#1565C0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' },
    deleteBtn: { flex: 1, backgroundColor: '#FFEBEE', color: '#C62828', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }
};

export default AdminCategory;