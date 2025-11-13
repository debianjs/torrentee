document.addEventListener('DOMContentLoaded', function() {
    const typingTitle = document.getElementById('typingTitle');
    if (typingTitle) {
        const text = '¿Para que sirve este Bot?';
        let index = 0;
        function typeWriter() {
            if (index < text.length) {
                typingTitle.textContent += text.charAt(index);
                index++;
                setTimeout(typeWriter, 100);
            } else {
                setTimeout(() => {
                    typingTitle.style.borderRight = 'none';
                }, 500);
            }
        }

        setTimeout(typeWriter, 500);
    }
    
    const observerOptions = {
        threshold: 0.2,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '0';
                entry.target.style.transform = 'translateY(30px)';
                
                setTimeout(() => {
                    entry.target.style.transition = 'all 0.6s ease';
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, 100);
                
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    const developerCards = document.querySelectorAll('.developer-card');
    developerCards.forEach(card => {
        observer.observe(card);
    });

    const socialCards = document.querySelectorAll('.social-card');
    socialCards.forEach(card => {
        observer.observe(card);
    });
    
    const imageContainer = document.querySelector('.image-container');
    if (imageContainer) {
        window.addEventListener('scroll', function() {
            const scrolled = window.pageYOffset;
            const rate = scrolled * 0.3;
            
            if (imageContainer.getBoundingClientRect().top < window.innerHeight) {
                imageContainer.style.transform = `translateY(${rate}px)`;
            }
        });
    }
    
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

    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-3px)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });

    const developerImages = document.querySelectorAll('.developer-image');
    developerImages.forEach(img => {
        img.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.1) rotate(5deg)';
            this.style.transition = 'all 0.4s ease';
        });
        
        img.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1) rotate(0deg)';
        });
    });
});