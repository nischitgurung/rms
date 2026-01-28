import React from 'react';
import { Helmet } from 'react-helmet-async';

const MenuItemDetail = ({ item }) => {
  // Guard Clause: If no item is passed, don't crash
  if (!item) return null;

  // Multi-Tenant Logic: Get the current website URL dynamically
  // This ensures it works for "pizza.app.com" AND "burger.app.com" automatically.
  const siteUrl = window.location.origin; 
  const currentUrl = `${siteUrl}/menu/${item.slug || item.id}`;

  return (
    <div style={styles.container}>
      {/* --- SEO & SOCIAL METADATA --- */}
      <Helmet>
        {/* Browser Tab Title */}
        <title>{item.seoTitle || item.itemName} | Menu</title>
        
        {/* Google Search Description */}
        <meta name="description" content={item.seoDescription || `Enjoy our delicious ${item.itemName}. Order now!`} />
        
        {/* Social Media Cards (Facebook, WhatsApp, Twitter) */}
        <meta property="og:title" content={item.seoTitle || item.itemName} />
        <meta property="og:description" content={item.seoDescription || item.description} />
        {item.imageUrl && <meta property="og:image" content={item.imageUrl} />}
        <meta property="og:url" content={currentUrl} />
        <meta property="og:type" content="product" />
        
        {/* Dynamic Canonical Link for Multi-Tenancy */}
        <link rel="canonical" href={currentUrl} />
      </Helmet>

      {/* --- VISUAL CONTENT --- */}
      <div style={styles.content}>
          {item.imageUrl && (
            <img 
                src={item.imageUrl} 
                alt={item.altText || item.itemName} 
                style={styles.image} 
                loading="lazy"
            />
          )}
          
          <h1 style={styles.title}>{item.itemName}</h1>
          
          <div style={styles.metaRow}>
            <span style={styles.category}>{item.category}</span>
            <span style={styles.price}>Rs. {item.price}</span>
          </div>

          <p style={styles.description}>{item.description || item.seoDescription}</p>
          
          {/* Quality SOP (Only visible if you are Admin - Optional Logic) */}
          {/* If you pass an 'isAdmin' prop later, you can uncomment this */}
          {/* {item.seoDescription && (
             <div style={styles.sopBox}><strong>Staff Note:</strong> {item.seoDescription}</div>
          )} 
          */}
      </div>
    </div>
  );
};

const styles = {
    container: { padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'Arial, sans-serif' },
    content: { backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' },
    image: { width: '100%', maxHeight: '400px', objectFit: 'cover', borderRadius: '12px', marginBottom: '20px' },
    title: { margin: '0 0 10px 0', fontSize: '2rem', color: '#333' },
    metaRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '15px' },
    category: { backgroundColor: '#f0f0f0', padding: '5px 10px', borderRadius: '20px', fontSize: '0.85rem', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' },
    price: { fontSize: '1.5rem', fontWeight: 'bold', color: '#2E7D32' }, // Green for money
    description: { lineHeight: '1.6', color: '#555', fontSize: '1.1rem' },
    sopBox: { marginTop: '20px', padding: '10px', backgroundColor: '#FFF3E0', color: '#E65100', borderRadius: '8px', fontSize: '0.9rem' }
};

export default MenuItemDetail;