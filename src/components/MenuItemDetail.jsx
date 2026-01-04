import React from 'react';
import { Helmet } from 'react-helmet-async';

const MenuItemDetail = ({ item }) => {
  // 'item' is the data you fetch from your 'inventory' or 'menu_items' collection
  
  return (
    <div style={styles.container}>
      {/* --- THIS IS WHERE HER SEO KNOWLEDGE GOES LIVE --- */}
      <Helmet>
        {/* Google Search Result Title */}
        <title>{item.seoTitle || item.itemName} | Our Restaurant</title>
        
        {/* Google Search Result Description */}
        <meta name="description" content={item.seoDescription || "Check out our delicious menu items!"} />
        
        {/* Facebook/WhatsApp/Social Media Preview */}
        <meta property="og:title" content={item.seoTitle || item.itemName} />
        <meta property="og:description" content={item.seoDescription} />
        <meta property="og:image" content={item.imageUrl} />
        
        {/* Friendly URL Slug - Important for her linking strategy */}
        <link rel="canonical" href={`https://yourrestaurant.com/menu/${item.slug}`} />
      </Helmet>

      {/* --- VISUAL CONTENT FOR THE CUSTOMER --- */}
      <div style={styles.content}>
          <img src={item.imageUrl} alt={item.altText || item.itemName} style={styles.image} />
          <h1>{item.itemName}</h1>
          <p style={styles.price}>Rs. {item.price}</p>
          <p style={styles.description}>{item.description}</p>
      </div>
    </div>
  );
};

const styles = {
    container: { padding: '20px', maxWidth: '800px', margin: '0 auto' },
    image: { width: '100%', borderRadius: '12px', marginBottom: '20px' },
    price: { fontSize: '1.5rem', fontWeight: 'bold', color: '#D32F2F' },
    description: { lineHeight: '1.6', color: '#555' }
};

export default MenuItemDetail;