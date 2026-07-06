# 📸 Image Sources & Replacement Guide

## Current Images (Unsplash - Free to Use)

### Hero Section
**Current**: Barista creating latte art with warm lighting
- URL: `https://images.unsplash.com/photo-1495474472287-4d71bcdd2085`
- Style: Professional barista pouring milk, warm bokeh background
- Resolution: 1920x1080
- Perfect for: Hero banner with text overlay on left

### About Section
**Current**: Cozy café interior with warm atmosphere
- URL: `https://images.unsplash.com/photo-1442512595331-e89e73853f31`
- Style: Modern café interior, warm lighting, inviting atmosphere
- Resolution: 800x1000
- Perfect for: Brand story section

### Featured Menu Items
- **Espresso**: Coffee cup with rich crema
- **Latte**: Vanilla latte with latte art
- **Cappuccino**: Perfect cappuccino with foam
- **Iced Coffee**: Iced caramel macchiato

### Final CTA Background
**Current**: Coffee shop warm atmosphere
- URL: `https://images.unsplash.com/photo-1511920170033-f8396924c348`
- Style: Coffee shop interior with warm lighting
- Resolution: 1600x600
- Perfect for: Background with text overlay

## Why These Images Work

✅ **Warm Color Temperature** - All images have warm lighting (3500-4500K)
✅ **Professional Quality** - High resolution, sharp focus
✅ **Brand Alignment** - Matches artisan café aesthetic
✅ **Text Overlay Ready** - Composition allows for text placement
✅ **Emotional Appeal** - Inviting, cozy, welcoming atmosphere

## Image Replacement Tips

### For Best Results:
1. **Resolution**:
   - Hero images: Minimum 1920x1080px
   - Section images: Minimum 800x600px
   - Product images: Minimum 600x600px

2. **Color Temperature**:
   - Aim for warm tones (3500-4500K)
   - Avoid cool blue tones
   - Consistent color grading across all images

3. **Photography Style**:
   - Natural lighting preferred
   - Shallow depth of field (f/1.8-f/2.8)
   - 45-degree or overhead angles
   - Show hands, steam, action moments

4. **File Optimization**:
   - Use WebP format for modern browsers
   - Compress images (70-85% quality)
   - Lazy load below-the-fold images
   - Use responsive images with srcset

## How to Replace Images

### Option 1: Update HTML Directly
```html
<!-- Find the image in index.html -->
<img src="OLD_URL" alt="Description">

<!-- Replace with your URL -->
<img src="YOUR_IMAGE_URL" alt="Updated description">
```

### Option 2: Add Local Images
1. Create `images/` folder in project root
2. Add your images: `images/hero-coffee.jpg`
3. Update HTML:
```html
<img src="images/hero-coffee.jpg" alt="Description">
```

### Option 3: Use Your Own CDN
1. Upload images to image hosting service
2. Get image URLs
3. Replace URLs in HTML

## Recommended Image Sizes

| Section | Recommended Size | Aspect Ratio |
|---------|-----------------|--------------|
| Hero Banner | 1920x1080px | 16:9 |
| About Image | 800x1000px | 4:5 |
| Featured Items | 600x600px | 1:1 |
| Menu Items | 400x400px | 1:1 |
| CTA Background | 1600x800px | 2:1 |
| Review Avatars | 150x150px | 1:1 |

## Stock Photo Resources

### Free Resources:
- **Unsplash** - https://unsplash.com (Used in this project)
- **Pexels** - https://pexels.com
- **Pixabay** - https://pixabay.com

### Search Terms:
- "coffee shop barista"
- "latte art"
- "café interior warm"
- "espresso machine"
- "coffee cup steam"
- "artisan coffee"
- "cozy café"

### Paid Resources (Higher Quality):
- **Adobe Stock**
- **Shutterstock**
- **iStock**

## Brand Photography Tips

For professional results, consider:

1. **Hire a Professional Photographer**
   - Capture your actual café
   - Show your real baristas
   - Feature your unique atmosphere

2. **Photo Shoot Checklist**:
   - [ ] Coffee preparation action shots
   - [ ] Latte art close-ups
   - [ ] Interior ambiance photos
   - [ ] Barista portraits
   - [ ] Food and pastries
   - [ ] Exterior storefront
   - [ ] Customer experience moments

3. **Lighting Setup**:
   - Natural window light
   - Warm LED lights (3000-3500K)
   - Avoid harsh overhead lighting
   - Use reflectors for fill light

4. **Styling Tips**:
   - Clean, uncluttered surfaces
   - Fresh flowers or plants
   - Quality ceramics and cups
   - Natural wood textures
   - Minimal props

## Mobile Optimization

All images should have mobile-optimized versions:

```html
<img 
  src="image-large.jpg" 
  srcset="image-small.jpg 400w, 
          image-medium.jpg 800w, 
          image-large.jpg 1200w"
  sizes="(max-width: 768px) 100vw, 50vw"
  alt="Description"
  loading="lazy"
>
```

## SEO Best Practices

1. **Alt Text**: Always descriptive and relevant
2. **File Names**: Use descriptive names (hero-coffee-shop.jpg)
3. **Compression**: Balance quality and file size
4. **Lazy Loading**: Use for images below the fold
5. **Responsive**: Serve appropriate sizes for devices

## License Information

### Unsplash (Current Images):
- ✅ Free to use
- ✅ Commercial use allowed
- ✅ No attribution required (but appreciated)
- ✅ Can be modified
- ❌ Cannot sell unmodified images
- ❌ Cannot use for competing services

### Your Own Images:
- Full ownership and rights
- Complete creative control
- Brand authenticity
- Unique visual identity

## Next Steps

1. **Short Term**: Use provided Unsplash images
2. **Medium Term**: Replace with professional stock photos
3. **Long Term**: Commission custom photography of your café

---

**Need Help?** Check the main README.md for full documentation.

**Ready to Customize?** Follow this guide to make the images your own!