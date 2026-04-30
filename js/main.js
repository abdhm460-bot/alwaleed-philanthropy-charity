/* ================================
   MAIN WEBSITE JAVASCRIPT
   ================================ */

// Language Management
let currentLanguage = 'ar';

document.addEventListener('DOMContentLoaded', function() {
    setupLanguageSwitchers();
    setupNavigation();
    startCounters();
    setupContactForm();
});

// Language Switcher Setup
function setupLanguageSwitchers() {
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const lang = this.getAttribute('data-lang');
            switchLanguage(lang);
        });
    });
}

// Switch Language
function switchLanguage(lang) {
    currentLanguage = lang;
    
    // Update all elements with data-en and data-ar
    document.querySelectorAll('[data-en][data-ar]').forEach(el => {
        const text = lang === 'en' ? el.getAttribute('data-en') : el.getAttribute('data-ar');
        el.textContent = text;
    });
    
    // Update HTML lang attribute and direction
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
    
    // Update active language button
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-lang') === lang) {
            btn.classList.add('active');
        }
    });
}

// Navigation Setup
function setupNavigation() {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');

    if (hamburger) {
        hamburger.addEventListener('click', function() {
            navMenu.classList.toggle('active');
        });
    }

    // Close menu when clicking a link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function() {
            navMenu.classList.remove('active');
            
            // Update active state
            document.querySelectorAll('.nav-link').forEach(l => {
                l.classList.remove('active');
            });
            this.classList.add('active');
        });
    });

    // Update active link on scroll
    window.addEventListener('scroll', updateActiveLink);
}

function updateActiveLink() {
    const sections = document.querySelectorAll('section');
    let current = '';

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        
        if (pageYOffset >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });

    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href').includes(current)) {
            link.classList.add('active');
        }
    });
}

// Counter Animation
function startCounters() {
    const counters = document.querySelectorAll('[data-target]');
    const speed = 200;

    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counter = entry.target;
                const target = +counter.getAttribute('data-target');
                
                const increment = target / speed;
                let current = 0;

                const updateCount = () => {
                    current += increment;
                    if (current < target) {
                        counter.textContent = Math.ceil(current);
                        setTimeout(updateCount, 10);
                    } else {
                        counter.textContent = target;
                    }
                };

                updateCount();
                counterObserver.unobserve(counter);
            }
        });
    });

    counters.forEach(counter => {
        counterObserver.observe(counter);
    });
}

// Contact Form Setup
function setupContactForm() {
    const form = document.getElementById('contactForm');
    
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const name = this.querySelector('input[type="text"]').value;
            const email = this.querySelector('input[type="email"]').value;
            const message = this.querySelector('textarea').value;
            
            const whatsappMessage = encodeURIComponent(
                `مرحباً، أنا ${name}\n\nالبريد الإلكتروني: ${email}\n\nالرسالة: ${message}`
            );
            
            window.open(`https://wa.me/966545239928?text=${whatsappMessage}`, '_blank');
            form.reset();
        });
    }
}

// Smooth scroll behavior
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});
