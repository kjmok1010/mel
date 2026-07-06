// ===================================
// 47th Café - JavaScript Interactions
// ===================================

// ===================================
// DOM Elements
// ===================================
const navbar = document.getElementById('navbar');
const navMenu = document.getElementById('navMenu');
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const navLinks = document.querySelectorAll('.nav-link');
const menuTabs = document.querySelectorAll('.menu-tab');
const menuCategories = document.querySelectorAll('.menu-category');
const newsletterForm = document.getElementById('newsletterForm');

// ===================================
// Navbar Scroll Effect
// ===================================
let lastScrollTop = 0;

window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // Add shadow when scrolled
    if (scrollTop > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
    
    lastScrollTop = scrollTop;
});

// ===================================
// Mobile Menu Toggle
// ===================================
if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        mobileMenuToggle.classList.toggle('active');
        document.body.style.overflow = navMenu.classList.contains('active') ? 'hidden' : '';
    });
}

// ===================================
// Navigation Active Link on Scroll
// ===================================
const sections = document.querySelectorAll('section[id]');

function highlightNavOnScroll() {
    const scrollY = window.pageYOffset;
    
    sections.forEach(section => {
        const sectionHeight = section.offsetHeight;
        const sectionTop = section.offsetTop - 100;
        const sectionId = section.getAttribute('id');
        
        if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${sectionId}`) {
                    link.classList.add('active');
                }
            });
        }
    });
}

window.addEventListener('scroll', highlightNavOnScroll);

// ===================================
// Smooth Scroll for Navigation Links
// ===================================
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        
        const targetId = link.getAttribute('href');
        const targetSection = document.querySelector(targetId);
        
        if (targetSection) {
            const navHeight = navbar.offsetHeight;
            const targetPosition = targetSection.offsetTop - navHeight;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
            
            // Close mobile menu if open
            if (navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
                mobileMenuToggle.classList.remove('active');
                document.body.style.overflow = '';
            }
        }
    });
});

// ===================================
// Menu Tabs Switching
// ===================================
menuTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const category = tab.getAttribute('data-category');
        
        // Remove active class from all tabs
        menuTabs.forEach(t => t.classList.remove('active'));
        
        // Add active class to clicked tab
        tab.classList.add('active');
        
        // Hide all menu categories
        menuCategories.forEach(cat => cat.classList.remove('active'));
        
        // Show selected category
        const activeCategory = document.querySelector(`.menu-category[data-category="${category}"]`);
        if (activeCategory) {
            activeCategory.classList.add('active');
        }
    });
});

// ===================================
// Scroll Animation - Fade In Elements
// ===================================
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const fadeElements = document.querySelectorAll('.featured-item, .review-card, .why-item, .menu-item');

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '0';
            entry.target.style.transform = 'translateY(30px)';
            
            setTimeout(() => {
                entry.target.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }, 100);
            
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

fadeElements.forEach(element => {
    observer.observe(element);
});

// ===================================
// Newsletter Form Submission
// ===================================
if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const emailInput = newsletterForm.querySelector('input[type="email"]');
        const email = emailInput.value;
        
        if (email) {
            // Show success message
            alert(`Thank you for subscribing! We'll send updates to ${email}`);
            emailInput.value = '';
        }
    });
}

// ===================================
// Add to Cart Buttons
// ===================================
const addToCartButtons = document.querySelectorAll('.btn-add-to-cart');
const cartElement = document.querySelector('.nav-cart');
let cartCount = 0;

addToCartButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Increment cart count
        cartCount++;
        
        // Update cart display
        if (cartElement) {
            cartElement.innerHTML = `<i class="fas fa-shopping-bag"></i> Cart (${cartCount})`;
        }
        
        // Visual feedback
        button.textContent = 'Added!';
        button.style.backgroundColor = '#5D4E37';
        
        setTimeout(() => {
            button.textContent = 'Add to Cart';
            button.style.backgroundColor = '#3D2817';
        }, 1500);
        
        // Show notification
        showNotification('Item added to cart!');
    });
});

// ===================================
// Notification System
// ===================================
function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background-color: #5D4E37;
        color: #FFFBF5;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        font-family: 'Montserrat', sans-serif;
        font-size: 15px;
        font-weight: 500;
        animation: slideInRight 0.3s ease;
    `;
    notification.textContent = message;
    
    // Add animation keyframes if not exists
    if (!document.querySelector('#notificationStyles')) {
        const style = document.createElement('style');
        style.id = 'notificationStyles';
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// ===================================
// Hero Section Parallax Effect
// ===================================
const heroSection = document.querySelector('.hero');

window.addEventListener('scroll', () => {
    if (heroSection && window.innerWidth > 768) {
        const scrolled = window.pageYOffset;
        const heroImage = heroSection.querySelector('.hero-image img');
        
        if (heroImage && scrolled < heroSection.offsetHeight) {
            heroImage.style.transform = `translateY(${scrolled * 0.5}px)`;
        }
    }
});

// ===================================
// Lazy Loading Images
// ===================================
const lazyImages = document.querySelectorAll('img[loading="lazy"]');

if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.src;
                img.classList.add('loaded');
                imageObserver.unobserve(img);
            }
        });
    });
    
    lazyImages.forEach(img => imageObserver.observe(img));
}

// ===================================
// Back to Top Button (Optional)
// ===================================
function createBackToTopButton() {
    const backToTop = document.createElement('button');
    backToTop.innerHTML = '<i class="fas fa-chevron-up"></i>';
    backToTop.classList.add('back-to-top');
    backToTop.style.cssText = `
        position: fixed;
        bottom: 30px;
        right: 30px;
        width: 50px;
        height: 50px;
        background-color: #3D2817;
        color: #FFFBF5;
        border: none;
        border-radius: 50%;
        font-size: 20px;
        cursor: pointer;
        display: none;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        transition: all 0.3s ease;
        z-index: 999;
    `;
    
    document.body.appendChild(backToTop);
    
    // Show/hide button based on scroll position
    window.addEventListener('scroll', () => {
        if (window.pageYOffset > 500) {
            backToTop.style.display = 'flex';
        } else {
            backToTop.style.display = 'none';
        }
    });
    
    // Scroll to top on click
    backToTop.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    // Hover effect
    backToTop.addEventListener('mouseenter', () => {
        backToTop.style.backgroundColor = '#A67B5B';
        backToTop.style.transform = 'translateY(-5px)';
    });
    
    backToTop.addEventListener('mouseleave', () => {
        backToTop.style.backgroundColor = '#3D2817';
        backToTop.style.transform = 'translateY(0)';
    });
}

// Initialize back to top button
createBackToTopButton();

// ===================================
// Loading Animation (Page Load)
// ===================================
window.addEventListener('load', () => {
    document.body.style.opacity = '0';
    
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.5s ease';
        document.body.style.opacity = '1';
    }, 100);
});

// ===================================
// Featured Items Hover Effect Enhancement
// ===================================
const featuredItems = document.querySelectorAll('.featured-item');

featuredItems.forEach(item => {
    item.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-8px) scale(1.02)';
    });
    
    item.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0) scale(1)';
    });
});

// ===================================
// Social Links Click Tracking (Optional)
// ===================================
const socialLinks = document.querySelectorAll('.social-links a, .footer-social a');

socialLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        // Prevent default if href is #
        if (link.getAttribute('href') === '#') {
            e.preventDefault();
            showNotification('Social media links are placeholders. Add your actual links!');
        }
    });
});

// ===================================
// Contact Links Enhancement
// ===================================
const phoneLinks = document.querySelectorAll('a[href^="tel:"]');
const emailLinks = document.querySelectorAll('a[href^="mailto:"]');

phoneLinks.forEach(link => {
    link.addEventListener('click', () => {
        console.log('Phone call initiated:', link.getAttribute('href'));
    });
});

emailLinks.forEach(link => {
    link.addEventListener('click', () => {
        console.log('Email client opened:', link.getAttribute('href'));
    });
});

// ===================================
// Review Cards Animation on Hover
// ===================================
const reviewCards = document.querySelectorAll('.review-card');

reviewCards.forEach(card => {
    card.addEventListener('mouseenter', function() {
        const stars = this.querySelector('.review-stars');
        if (stars) {
            stars.querySelectorAll('i').forEach((star, index) => {
                setTimeout(() => {
                    star.style.transform = 'scale(1.2) rotate(15deg)';
                    setTimeout(() => {
                        star.style.transform = 'scale(1) rotate(0deg)';
                    }, 150);
                }, index * 50);
            });
        }
    });
});

// ===================================
// Dynamic Copyright Year
// ===================================
const currentYear = new Date().getFullYear();
const footerBottom = document.querySelector('.footer-bottom p');
if (footerBottom && footerBottom.textContent.includes('2035')) {
    // Keep 2035 as it's part of the branding
    // But you can update if needed
}

// ===================================
// Console Welcome Message
// ===================================
console.log('%c☕ Welcome to 47th Café! ', 'background: #3D2817; color: #FFFBF5; font-size: 20px; padding: 10px; font-weight: bold;');
console.log('%cWebsite crafted with ❤️ and ☕', 'color: #A67B5B; font-size: 14px;');

// ===================================
// Performance Monitoring (Development)
// ===================================
if (window.performance) {
    window.addEventListener('load', () => {
        setTimeout(() => {
            const perfData = window.performance.timing;
            const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
            console.log(`⚡ Page loaded in ${pageLoadTime}ms`);
        }, 0);
    });
}

// ===================================
// Keyboard Navigation Enhancement
// ===================================
document.addEventListener('keydown', (e) => {
    // ESC key closes mobile menu
    if (e.key === 'Escape' && navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
        mobileMenuToggle.classList.remove('active');
        document.body.style.overflow = '';
    }
});

// ===================================
// Form Validation Enhancement
// ===================================
const emailInputs = document.querySelectorAll('input[type="email"]');

emailInputs.forEach(input => {
    input.addEventListener('blur', function() {
        const email = this.value;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (email && !emailRegex.test(email)) {
            this.style.borderColor = '#d32f2f';
            showNotification('Please enter a valid email address');
        } else if (email) {
            this.style.borderColor = '#5D4E37';
        }
    });
    
    input.addEventListener('focus', function() {
        this.style.borderColor = '#A67B5B';
    });
});

// ===================================
// Intersection Observer for Section Animations
// ===================================
const sections_animated = document.querySelectorAll('.welcome, .about, .why-choose, .reviews, .location');

const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '0';
            entry.target.style.transform = 'translateY(40px)';
            
            setTimeout(() => {
                entry.target.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }, 100);
            
            sectionObserver.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.15,
    rootMargin: '0px 0px -100px 0px'
});

sections_animated.forEach(section => {
    sectionObserver.observe(section);
});

// ===================================
// CTA Button Ripple Effect
// ===================================
const ctaButtons = document.querySelectorAll('.btn');

ctaButtons.forEach(button => {
    button.addEventListener('click', function(e) {
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        
        ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.3);
            top: ${y}px;
            left: ${x}px;
            transform: scale(0);
            animation: rippleEffect 0.6s ease-out;
            pointer-events: none;
        `;
        
        // Add ripple animation if not exists
        if (!document.querySelector('#rippleStyles')) {
            const style = document.createElement('style');
            style.id = 'rippleStyles';
            style.textContent = `
                @keyframes rippleEffect {
                    to {
                        transform: scale(2);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        this.style.position = 'relative';
        this.style.overflow = 'hidden';
        this.appendChild(ripple);
        
        setTimeout(() => ripple.remove(), 600);
    });
});

console.log('✅ 47th Café JavaScript loaded successfully!');