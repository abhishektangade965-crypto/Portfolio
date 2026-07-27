/* ============================================================
   Abhishek Tangade Portfolio — animations.js
   GSAP Timelines, ScrollTriggers, Magnetic Pull, 3D Device Tilt.
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  // Safety check to verify if GSAP is loaded
  if (typeof gsap === 'undefined') return;

  // Register ScrollTrigger plugin
  if (typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
  }

  /* ---------- Page Load Hero Entrance Timeline ---------- */
  const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  // Stagger logo & nav actions
  if (document.querySelector('.navbar')) {
    heroTl.fromTo('.navbar', 
      { y: -50, opacity: 0 }, 
      { y: 0, opacity: 1, duration: 1, delay: 0.4 }
    );
  }

  // Hero title and staggers are rendered flat with no transition animations as per user request

  /* ---------- Magnetic Hover on Interactive Elements ---------- */
  const magneticItems = document.querySelectorAll('.social-btn, .btn, .theme-toggle, .hamburger');
  if (window.matchMedia('(hover: hover)').matches) {
    magneticItems.forEach(item => {
      item.classList.add('magnetic-item');
      item.addEventListener('mousemove', (e) => {
        const rect = item.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        
        gsap.to(item, {
          x: x * 0.35,
          y: y * 0.35,
          scale: 1.03,
          duration: 0.3,
          ease: 'power2.out'
        });
      });

      item.addEventListener('mouseleave', () => {
        gsap.to(item, {
          x: 0,
          y: 0,
          scale: 1,
          duration: 0.6,
          ease: 'elastic.out(1.1, 0.4)'
        });
      });
    });
  }

  /* ---------- 3D Mouse Perspective Tilt on Mockups ---------- */
  const devices = document.querySelectorAll('.device-mockup');
  if (window.matchMedia('(hover: hover)').matches) {
    devices.forEach(dev => {
      dev.parentElement.classList.add('tilt-card-parent');
      dev.classList.add('tilt-card-child');
      
      dev.addEventListener('mousemove', (e) => {
        const rect = dev.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        const tiltX = (y / rect.height) * -12; // tilt angle limit
        const tiltY = (x / rect.width) * 12;

        gsap.to(dev, {
          rotateX: tiltX,
          rotateY: tiltY,
          transformPerspective: 1000,
          scale: 1.02,
          duration: 0.2,
          ease: 'power1.out'
        });
      });

      dev.addEventListener('mouseleave', () => {
        gsap.to(dev, {
          rotateX: 0,
          rotateY: 0,
          scale: 1,
          duration: 0.5,
          ease: 'power2.out'
        });
      });
    });
  }

  /* ---------- Section Reveal Animations on Scroll ---------- */
  if (typeof ScrollTrigger !== 'undefined') {
    // Fade reveal titles, subtitles, and general container elements
    const fadeUps = Array.from(document.querySelectorAll('.section-title, .section-sub, .card, .timeline-item, .project-bento, .contact-wrapper'))
      .filter(el => !el.closest('#main'));
    fadeUps.forEach(el => {
      gsap.fromTo(el, 
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            toggleActions: 'play none none none'
          }
        }
      );
    });

    // Animate stats counter fields with suffix preservation (e.g. 8, 30+, 10K+, 45%)
    const countStats = document.querySelectorAll('[data-count]');
    countStats.forEach(stat => {
      const target = parseInt(stat.getAttribute('data-count'), 10);
      const suffix = stat.getAttribute('data-suffix') || '';
      
      let countObj = { val: 0 };
      gsap.to(countObj, {
        val: target,
        duration: 1.5,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: stat,
          start: 'top 90%',
          once: true
        },
        onUpdate: () => {
          stat.textContent = Math.floor(countObj.val);
        }
      });
    });

    // Draw vertical timeline line path on scroll
    const timelineLine = document.querySelector('.timeline-line');
    if (timelineLine) {
      gsap.fromTo(timelineLine,
        { scaleY: 0, transformOrigin: 'top' },
        {
          scaleY: 1,
          scrollTrigger: {
            trigger: '.timeline-container',
            start: 'top 80%',
            end: 'bottom 70%',
            scrub: true
          }
        }
      );
    }

    // Parallax scrolling effect on hero & page headers
    if (document.querySelector('.hero')) {
      gsap.to('.hero', {
        y: 60,
        scrollTrigger: {
          trigger: '.hero',
          start: 'top top',
          end: 'bottom center',
          scrub: 1
        }
      });
    }
    document.querySelectorAll('.page-header').forEach(header => {
      const h1 = header.querySelector('h1');
      if (h1) {
        gsap.to(h1, {
          y: 40,
          scrollTrigger: {
            trigger: header,
            start: 'top top',
            end: 'bottom center',
            scrub: 1
          }
        });
      }
    });
  }

  /* ---------- Project Demo Modal Overlays Logic ---------- */
  document.querySelectorAll('.project-bento').forEach(card => {
    card.addEventListener('click', (e) => {
      if (!e.target.closest('.overlay-close') && !e.target.closest('a')) {
        const overlay = card.querySelector('.project-overlay');
        if (overlay) {
          overlay.classList.add('active');
          document.body.style.overflow = 'hidden';
        }
      }
    });

    const closeBtn = card.querySelector('.overlay-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const overlay = card.querySelector('.project-overlay');
        if (overlay) {
          overlay.classList.remove('active');
          document.body.style.overflow = 'auto';
        }
      });
    }

    const overlay = card.querySelector('.project-overlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('active');
          document.body.style.overflow = 'auto';
        }
      });
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.project-overlay.active').forEach(overlay => {
        overlay.classList.remove('active');
        document.body.style.overflow = 'auto';
      });
    }
  });

});

