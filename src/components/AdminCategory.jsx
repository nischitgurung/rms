import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import Cropper from 'react-easy-crop';

// HELPER: Auto-creates URL-friendly slugs
const generateSlug = (text) => {
    return text.toLowerCase().trim().replace(/[^\w ]+/g, '').replace(/ +/g, '-');    
};

// HELPER: Process the manually selected portion into a Blob for upload
const getCroppedImg = (imageSrc, pixelCrop) => {
    const canvas = document.createElement('canvas');
    const image = new Image();
    image.src = imageSrc;
    return new Promise((resolve) => {
        image.onload = () => {
            canvas.width = 400;
            canvas.height = 400;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(
                image,
                pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
                0, 0, 400, 400
            );
            canvas.toBlob((blob) => {
                resolve(blob);
            }, 'image/jpeg', 0.85);
        };
    });
};

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
  const [uploading, setUploading] = useState(false);

  // --- CROPPER STATE (For manual portion adjustment) ---
  const [tempImage, setTempImage] = useState(null); 
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const [stats, setStats] = useState({ totalDishes: 0, topSold: '-', mostDishesCat: '-' });
  
  const [formData, setFormData] = useState({ 
    name: '', 
    imageColor: '#e0e0e0',
    imageUrl: '', 
    seoTitle: '',
    seoDescription: '',
    slug: ''
  });

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

  // --- CROPPER HANDLERS ---
  const onFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.readAsDataURL(e.target.files[0]);
      reader.onload = () => setTempImage(reader.result);
    }
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleApplyCrop = async () => {
    try {
      setUploading(true);
      const croppedBlob = await getCroppedImg(tempImage, croppedAreaPixels);
      
      const data = new FormData();
      data.append("file", croppedBlob);
      data.append("upload_preset", "rms_uploads"); 
      data.append("cloud_name", "driy6e3td"); 

      const res = await fetch(`https://api.cloudinary.com/v1_1/driy6e3td/image/upload`, {
        method: "POST",
        body: data,
      });
      const fileData = await res.json();
      setFormData(prev => ({ ...prev, imageUrl: fileData.secure_url }));
      setTempImage(null); 
      setUploading(false);
    } catch (err) {
      setUploading(false);
      alert("Image processing failed");
    }
  };

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
      setFormData({ 
        name: cat.name, 
        imageColor: cat.imageColor,
        imageUrl: cat.imageUrl || '',
        seoTitle: cat.seoTitle || '',
        seoDescription: cat.seoDescription || '',
        slug: cat.slug || generateSlug(cat.name)
      });
      setEditingId(cat.id);
      setShowForm(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return alert("Category Name is required!");

    const payload = {
        name: formData.name,
        imageUrl: formData.imageUrl || '',
        seoTitle: formData.seoTitle || formData.name,
        seoDescription: formData.seoDescription || '',
        slug: formData.slug || generateSlug(formData.name),
        updatedAt: serverTimestamp()
    };

    try {
        if (editingId) {
            await updateDoc(doc(db, "categories", editingId), payload);
            alert("Category Updated!");
        } else {
            const colors = ['#FFEBEE', '#E3F2FD', '#E8F5E9', '#FFF3E0', '#F3E5F5', '#E0F2F1'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            await addDoc(collection(db, "categories"), {
                ...payload,
                sortOrder: categories.length + 1,
                imageColor: randomColor,
                createdAt: serverTimestamp()
            });
            alert("Category Added!");
        }
        setShowForm(false);
        setEditingId(null);
        setFormData({ name: '', imageColor: '#e0e0e0', imageUrl: '', seoTitle: '', seoDescription: '', slug: '' });
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
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', marginBottom: '25px', gap: '15px' }}>
        <div>
            <h1 style={{ margin: 0, fontSize: isMobile ? '1.3rem' : '1.5rem', textTransform: 'uppercase' }}>Menu Categories</h1>
            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '5px' }}>Manage your menu sections</div>
        </div>
        <div style={{display:'flex', gap:'10px'}}>
            <button onClick={() => navigate('/')} style={{ flex: 1, padding: '10px 15px', background: 'white', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', fontWeight:'bold' }}>Back</button>
            <button 
                onClick={() => { setShowForm(!showForm); setEditingId(null); setFormData({ name: '', imageColor: '#e0e0e0', imageUrl: '', seoTitle: '', seoDescription: '', slug: '' }); }} 
                style={{ flex: 2, padding: '10px 15px', backgroundColor: 'black', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
                {showForm ? "✕ Close" : "+ Add New"}
            </button>
        </div>
      </div>

      {/* MANUAL PORTION ADJUSTER MODAL */}
      {tempImage && (
          <div style={styles.cropperOverlay}>
              <div style={styles.cropperContainer}>
                <Cropper
                    image={tempImage}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                />
              </div>
              <div style={styles.cropperControls}>
                  <p style={{margin: '0 0 10px 0', fontSize:'0.9rem', color:'#333'}}>Drag to position & use slider to zoom</p>
                  <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={(e) => setZoom(e.target.value)} style={{width:'80%', maxWidth:'300px'}} />
                  <div style={{display:'flex', gap:'10px', marginTop:'15px', width:'100%', maxWidth:'300px'}}>
                      <button onClick={() => setTempImage(null)} style={styles.cancelBtn}>Cancel</button>
                      <button onClick={handleApplyCrop} style={styles.saveBtn}>Apply Selection</button>
                  </div>
              </div>
          </div>
      )}

      {/* STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '30px' }}>
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

      {/* FORM */}
      {showForm && (
          <div style={{ backgroundColor: 'white', padding: isMobile ? '20px' : '25px', borderRadius: '12px', marginBottom: '30px', maxWidth: isMobile ? '100%' : '600px', margin: isMobile ? '0 0 30px 0' : '0 auto 30px 0', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', borderLeft: '5px solid black' }}>
              <h3 style={{marginTop:0, fontSize: '1.1rem'}}>{editingId ? "Edit Category" : "Add New Category"}</h3>
              <form onSubmit={handleSubmit} style={{display:'grid', gap:'15px'}}>
                  
                  {/* IMAGE PREVIEW & MANUAL ADJUSTER TRIGGER */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <div 
                      style={{ 
                        width: '120px', height: '120px', borderRadius: '12px', border: '2px dashed #ccc',
                        backgroundColor: formData.imageColor, 
                        backgroundImage: formData.imageUrl ? `url(${formData.imageUrl})` : 'none',
                        backgroundSize: 'cover', backgroundPosition: 'center',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden'
                      }}
                      onClick={() => document.getElementById('portionInput').click()}
                    >
                      {!formData.imageUrl && <span style={{fontSize: '0.7rem', color: '#666', textAlign: 'center'}}>Click to select<br/>& Adjust Image</span>}
                    </div>
                    <input type="file" id="portionInput" hidden onChange={onFileChange} accept="image/*" />
                    {uploading && <small style={{color: '#2196F3'}}>Processing portion...</small>}
                  </div>

                  <div>
                      <label style={styles.label}>Category Name</label>
                      <input 
                        type="text" placeholder="e.g. Main Course" value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value, slug: generateSlug(e.target.value)})}
                        style={styles.input}
                      />
                  </div>

                  {/* SEO STRATEGY SECTION */}
                  <div style={styles.seoBox}>
                      <h4 style={{margin:'0 0 10px 0', color:'#d32f2f', fontSize:'0.85rem'}}>🔍 SEO STRATEGY PANEL</h4>
                      <div style={{display:'grid', gap:'10px'}}>
                          <div>
                              <label style={styles.label}>SEO Title (Search Alias)</label>
                              <input type="text" value={formData.seoTitle} onChange={(e) => setFormData({...formData, seoTitle: e.target.value})} style={styles.input} />
                          </div>
                          <div>
                              <label style={styles.label}>SEO Description</label>
                              <textarea value={formData.seoDescription} onChange={(e) => setFormData({...formData, seoDescription: e.target.value})} style={{...styles.input, height:'60px'}} />
                          </div>
                          <div>
                              <label style={styles.label}>URL Slug (Auto)</label>
                              <input type="text" value={formData.slug} readOnly style={{...styles.input, backgroundColor:'#f1f1f1'}} />
                          </div>
                      </div>
                  </div>

                  <div style={{display:'flex', gap:'10px'}}>
                      <button type="button" onClick={() => setShowForm(false)} style={styles.cancelBtn}>Cancel</button>
                      <button type="submit" style={styles.saveBtn}>{editingId ? "Update Category" : "Save Category"}</button>
                  </div>
              </form>
          </div>
      )}

      {/* LIST */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(220px, 1fr))', gap: isMobile ? '12px' : '25px' }}>
          {categories.map((cat) => (
              <div key={cat.id} style={styles.catCard}>
                  <div style={{
                      height: isMobile ? '80px' : '120px', 
                      backgroundColor: cat.imageColor || '#f0f0f0', 
                      backgroundImage: cat.imageUrl ? `url(${cat.imageUrl})` : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      borderRadius: '8px', 
                      marginBottom: '12px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: isMobile ? '2rem' : '3rem'
                  }}>
                      {!cat.imageUrl && (cat.name.toLowerCase().includes('drink') ? '🥤' : cat.name.toLowerCase().includes('dessert') ? '🍰' : '🍽️')}
                  </div>
                  <h3 style={{ margin: '0 0 5px 0', fontSize: isMobile ? '1rem' : '1.2rem', color: '#000', textTransform:'capitalize', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat.name}</h3>
                  <p style={{margin:'0 0 12px 0', fontSize:'0.7rem', color:'#888', fontStyle:'italic'}}>/{cat.slug || generateSlug(cat.name)}</p>
                  
                  <div style={{display:'flex', flexDirection: isMobile ? 'column' : 'row', gap: '8px', marginTop:'auto'}}>
                      <button onClick={() => handleEditClick(cat)} style={styles.editBtn}>Edit</button>
                      <button onClick={() => handleDelete(cat.id)} style={styles.deleteBtn}>Delete</button>
                  </div>
              </div>
          ))}
      </div>
    </div>
  );
};

const styles = {
    statCard: { backgroundColor: 'white', padding: '15px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', textAlign: 'center', border: '1px solid #eee' },
    statLabel: { color: '#888', fontSize: '0.8rem', marginBottom: '5px' },
    statValue: { fontSize: '1.4rem', fontWeight: 'bold', color: '#333' },
    catCard: { backgroundColor: 'white', padding: '12px', borderRadius: '12px', boxShadow: '0 4px 10px rgba(0,0,0,0.05)', textAlign: 'center', display: 'flex', flexDirection: 'column', border: '1px solid #eee' },
    input: { width: '100%', padding: '12px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '1rem', boxSizing: 'border-box' },
    label: { display: 'block', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.8rem', color: '#555' },
    saveBtn: { flex: 1, padding: '12px', backgroundColor: 'black', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' },
    cancelBtn: { flex: 1, padding: '12px', backgroundColor: 'white', color: '#333', border: '1px solid #ccc', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' },
    editBtn: { flex: 1, backgroundColor: '#E3F2FD', color: '#1976D2', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', padding: '10px' },
    deleteBtn: { flex: 1, backgroundColor: '#FFEBEE', color: '#D32F2F', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', padding: '10px' },
    seoBox: { backgroundColor: '#fff5f5', padding: '15px', borderRadius: '8px', border: '1px solid #ffcdd2', marginTop: '5px', textAlign: 'left' },
    // CROPPER OVERLAY STYLES
    cropperOverlay: { position: 'fixed', inset: 0, backgroundColor: 'white', zIndex: 5000, display: 'flex', flexDirection: 'column' },
    cropperContainer: { position: 'relative', flex: 1, backgroundColor: '#333' },
    cropperControls: { padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: 'white', borderTop: '1px solid #eee' }
};

export default AdminCategory;