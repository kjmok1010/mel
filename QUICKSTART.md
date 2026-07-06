# 🚀 47th Café - Quick Start Guide

## ⚡ Instant Preview

Simply open `index.html` in your browser to view the website locally.

## 📂 Project Structure

```
47th-cafe/
├── index.html              # Main page (32KB)
├── css/
│   └── style.css          # All styles (25KB)
├── js/
│   └── main.js            # Interactions (18KB)
├── README.md              # Full documentation
└── QUICKSTART.md          # This file
```

## 🎨 Key Design Elements

### Color Palette
- **Deep Coffee**: `#3D2817` - Primary text, footer
- **Caramel**: `#A67B5B` - Accents, hover states
- **Warm Beige**: `#F4EDE3` - Navigation, backgrounds
- **Cream**: `#FFFBF5` - Light backgrounds, text on dark
- **Gold**: `#B8926A` - Special highlights

### Fonts (Google Fonts via CDN)
- **Playfair Display** - Logo, headings
- **Montserrat** - Navigation, labels
- **Lato** - Body text, paragraphs

## 🔧 Customization Checklist

### 1. Update Contact Information
```html
<!-- In index.html, find and replace: -->
Phone: (212) 555-1234
Email: hello@47thcafe.com
Address: 47th Street, New York, NY
```

### 2. Replace Images
- Hero image: Currently using provided URL
- Featured items: Unsplash placeholders
- Add your images to `/images` folder
- Update `src` attributes in HTML

### 3. Connect Social Media
```html
<!-- Find these in footer and location sections: -->
<a href="#">Instagram</a>  → <a href="https://instagram.com/yourhandle">
<a href="#">Facebook</a>   → <a href="https://facebook.com/yourpage">
<a href="#">Twitter</a>    → <a href="https://twitter.com/yourhandle">
<a href="#">Yelp</a>       → <a href="https://yelp.com/yourpage">
```

### 4. Update Menu Items & Prices
Located in index.html under sections:
- `.featured-menu` - Signature drinks
- `.menu-preview` - Full menu with tabs

### 5. Change Google Maps Location
```html
<!-- In location section, update iframe src: -->
<iframe src="YOUR_GOOGLE_MAPS_EMBED_URL"></iframe>
```
Get embed code from [Google Maps](https://maps.google.com)

## 🎯 Main Sections (Anchor Links)

- `#home` - Hero banner
- `#about` - About us story
- `#menu` - Full menu with tabs
- `#order` - Order online CTA
- `#contact` - Location & hours

## ✨ Interactive Features

### Already Working
✅ Smooth scroll navigation
✅ Mobile hamburger menu
✅ Menu tab switching
✅ Add to cart buttons (with counter)
✅ Newsletter form submission
✅ Scroll animations
✅ Back to top button
✅ Hover effects throughout

### Placeholders (Need Backend)
⚠️ Shopping cart checkout
⚠️ User authentication
⚠️ Online ordering system
⚠️ Newsletter email delivery
⚠️ Contact form submission

## 📱 Responsive Breakpoints

- **Desktop**: 1200px+
- **Tablet**: 768px - 1200px
- **Mobile**: < 768px

## 🚀 Deployment Options

### Quick Deploy (Recommended)
1. Go to **Publish tab**
2. Click publish button
3. Get your live URL

### Manual Deploy
- **Netlify**: Drag & drop folder → [netlify.com](https://netlify.com)
- **Vercel**: Connect GitHub → [vercel.com](https://vercel.com)
- **GitHub Pages**: Push to gh-pages branch

## 🎨 Color Customization

Want to change the color scheme?

1. Open `css/style.css`
2. Find `:root` section (top of file)
3. Change CSS variables:

```css
:root {
    --color-deep-coffee: #YOUR_COLOR;
    --color-caramel: #YOUR_COLOR;
    --color-warm-beige: #YOUR_COLOR;
    /* ... etc */
}
```

## 📝 Quick Edits

### Change Café Name
Search and replace "47th Café" in:
- `index.html` (multiple locations)
- `README.md` (documentation)

### Update Establishment Year
Currently: "Est. 2035"
Location: Hero section `.hero-label`

### Modify Tagline
Currently: "Your Go-to Spot for Delicious Eats & Coffee"
Location: Hero section `.hero-title`

### Change Operating Hours
Location: `#contact` section, `.hours-list`

## 🐛 Troubleshooting

### Images Not Loading?
- Check file paths (case-sensitive)
- Verify images are in correct folders
- Use browser DevTools to check 404 errors

### JavaScript Not Working?
- Open browser console (F12)
- Check for errors
- Verify `js/main.js` is loading

### Mobile Menu Not Opening?
- Clear browser cache
- Check JavaScript console for errors
- Verify mobile breakpoint styles in CSS

### Fonts Not Loading?
- Check internet connection (fonts load from CDN)
- Verify Google Fonts link in `<head>`
- Check browser console for blocked requests

## 📊 Performance Tips

### Already Optimized
✅ Lazy loading images
✅ Efficient CSS animations
✅ Minimal JavaScript
✅ CDN-hosted fonts/icons

### Further Optimization
- Compress/resize images before upload
- Convert images to WebP format
- Minify CSS and JavaScript for production
- Enable gzip compression on server

## 🔍 SEO Checklist

✅ Semantic HTML structure
✅ Meta description in `<head>`
✅ Alt text on images (check and update)
✅ Heading hierarchy (H1 → H2 → H3)
⚠️ Add Open Graph tags for social sharing
⚠️ Add Schema.org markup for local business
⚠️ Create sitemap.xml
⚠️ Add robots.txt

## 📞 Testing Checklist

Before going live, test:
- [ ] All navigation links work
- [ ] Mobile menu opens/closes
- [ ] Forms validate properly
- [ ] All images load
- [ ] Responsive design on multiple devices
- [ ] Cross-browser compatibility
- [ ] Page load speed
- [ ] Social media links
- [ ] Contact information is correct

## 🎉 Launch Checklist

- [ ] Update all contact information
- [ ] Replace placeholder images
- [ ] Connect social media accounts
- [ ] Test all forms
- [ ] Set up Google Analytics (optional)
- [ ] Configure custom domain
- [ ] Enable HTTPS/SSL
- [ ] Submit to Google Search Console
- [ ] Share on social media

## 💡 Pro Tips

1. **Regular Updates**: Keep menu items and prices current
2. **Fresh Content**: Update featured items seasonally
3. **Customer Reviews**: Add real testimonials
4. **Instagram Integration**: Connect live feed once live
5. **Performance**: Monitor loading speed monthly
6. **Mobile First**: Most visitors will be on mobile
7. **Local SEO**: Claim Google My Business listing

## 📚 Need Help?

Refer to:
- `README.md` - Complete documentation
- Inline code comments in HTML/CSS/JS
- Browser DevTools for debugging
- MDN Web Docs for web standards

## ☕ Enjoy Your New Café Website!

Built with passion for coffee and great design.

---

**Questions?** Check README.md for detailed documentation.

**Ready to launch?** Use the Publish tab for instant deployment!