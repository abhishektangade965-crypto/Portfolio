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
  }  /* ---------- Scroll Progress Bar Tracking ---------- */
  window.addEventListener('scroll', () => {
    const progress = document.getElementById('scrollProgress');
    if (progress) {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const percentage = totalHeight > 0 ? (window.scrollY / totalHeight) * 100 : 0;
      progress.style.width = `${percentage}%`;
    }
  });

  /* ---------- Page Load Hero Master Entrance Timeline ---------- */
  const heroTl = gsap.timeline({ defaults: { ease: 'power4.out' } });

  // 1. Aurora fade-in
  if (document.querySelector('.hero-aurora')) {
    heroTl.fromTo('.hero-aurora', 
      { scale: 0.8, opacity: 0 }, 
      { scale: 1, opacity: 1, duration: 1.8, ease: 'power2.out' }
    );
  }

  // 2. Navbar slide down
  if (document.querySelector('.navbar')) {
    heroTl.fromTo('.navbar', 
      { y: -80, opacity: 0 }, 
      { y: 0, opacity: 1, duration: 1.2 },
      '-=1.4'
    );
  }

  // 3. Status kicker badge reveal
  if (document.querySelector('.hero-kicker')) {
    heroTl.fromTo('.hero-kicker', 
      { y: 30, opacity: 0 }, 
      { y: 0, opacity: 1, duration: 0.9 },
      '-=1.0'
    );
  }

  // 4. Hero title word-by-word stagger using Split-Type
  const splitTitle = document.querySelector('.hero-title');
  if (splitTitle && typeof SplitType !== 'undefined') {
    const text = new SplitType(splitTitle, { types: 'words' });
    // Set overflow hidden on parents to hide words sliding up
    gsap.set(text.words, { overflow: 'hidden' });
    heroTl.fromTo(text.words,
      { y: 60, opacity: 0 },
      { y: 0, opacity: 1, duration: 1.0, stagger: 0.08, ease: 'power4.out' },
      '-=0.8'
    );
  } else if (splitTitle) {
    heroTl.fromTo(splitTitle,
      { y: 40, opacity: 0 },
      { y: 0, opacity: 1, duration: 1.0 },
      '-=0.8'
    );
  }

  // 5. Role description line reveal
  if (document.querySelector('.role-line')) {
    heroTl.fromTo('.role-line',
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8 },
      '-=0.7'
    );
  }

  // 6. Description paragraph fade-up
  if (document.querySelector('.hero-text')) {
    heroTl.fromTo('.hero-text',
      { y: 20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.9 },
      '-=0.7'
    );
  }

  // 7. CTA buttons slide-up
  if (document.querySelector('.hero-cta')) {
    heroTl.fromTo('.hero-cta .btn',
      { y: 25, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.9, stagger: 0.1 },
      '-=0.8'
    );
  }

  // 8. Metrics counter animations (sequential count up)
  const metrics = document.querySelectorAll('.metric-val');
  if (metrics.length) {
    metrics.forEach((m, idx) => {
      const target = parseInt(m.getAttribute('data-target'), 10);
      let countVal = { val: 0 };
      heroTl.to(countVal, {
        val: target,
        duration: 1.4,
        ease: 'power3.out',
        onUpdate: () => {
          m.textContent = Math.floor(countVal.val);
        }
      }, `-=${idx === 0 ? 0.7 : 1.2}`);
    });
  }

  // 9. Trust badges stagger reveal
  if (document.querySelector('.hero-trust-badges')) {
    heroTl.fromTo('.hero-trust-badges', { opacity: 0 }, { opacity: 1, duration: 0.6 }, '-=0.9');
    heroTl.fromTo('.trust-badge',
      { y: 15, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.7, stagger: 0.08 },
      '-=0.7'
    );
  }

  // 10. Scroll indicator fade-in
  if (document.querySelector('.scroll-indicator')) {
    heroTl.fromTo('.scroll-indicator', 
      { opacity: 0, y: 10 }, 
      { opacity: 1, y: 0, duration: 0.8 },
      '-=0.5'
    );
  }

  /* ---------- Magnetic Hover Action on Interactive Controls ---------- */
  if (window.matchMedia('(hover: hover)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const magneticElements = document.querySelectorAll('.social-btn, .btn, .theme-toggle, .hamburger, .cmd-trigger-badge, .trust-badge');
    magneticElements.forEach(el => {
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        
        // pull factor based on element class
        const pull = el.classList.contains('btn') ? 0.35 : 0.45;
        gsap.to(el, {
          x: x * pull,
          y: y * pull,
          scale: 1.04,
          duration: 0.3,
          ease: 'power2.out'
        });
      });

      el.addEventListener('mouseleave', () => {
        gsap.to(el, {
          x: 0,
          y: 0,
          scale: 1,
          duration: 0.6,
          ease: 'elastic.out(1.1, 0.4)'
        });
      });
    });
  }

  /* ---------- 3D Mouse Parallax Tilt (rAF + Lerp) on Centerpiece ---------- */
  const canvasWrapper = document.querySelector('.canvas-hero-wrapper');
  if (canvasWrapper && window.matchMedia('(hover: hover)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let mouseX = 0, mouseY = 0;
    let currentX = 0, currentY = 0;
    let isMouseActive = false;

    window.addEventListener('mousemove', (e) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      mouseX = (e.clientX - centerX) / centerX; // normalized -1 to 1
      mouseY = (e.clientY - centerY) / centerY;
      isMouseActive = true;
    });

    window.addEventListener('mouseleave', () => {
      mouseX = 0;
      mouseY = 0;
      isMouseActive = false;
    });

    // Lerp-smoothed loop
    (function renderTilt() {
      if (document.visibilityState !== 'hidden') {
        currentX += (mouseX - currentX) * 0.08;
        currentY += (mouseY - currentY) * 0.08;

        const maxRotate = 8.0; // limit degrees
        const rotX = -currentY * maxRotate;
        const rotY = currentX * maxRotate;

        // Apply GPU-accelerated translate3d transforms
        canvasWrapper.style.transform = `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) translate3d(${currentX * 10}px, ${currentY * 10}px, 0)`;
      }
      requestAnimationFrame(renderTilt);
    })();
  }

  /* ---------- ScrollTrigger Hero pin and Spatial Zoom Timeline ---------- */
  if (typeof ScrollTrigger !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const heroPin = document.querySelector('.hero');
    if (heroPin) {
      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: heroPin,
          start: 'top top',
          end: '+=130%',
          scrub: true,
          pin: true,
          anticipatePin: 1
        }
      });

      // Scale title slightly down
      scrollTl.to('.hero-title', { scale: 0.88, opacity: 0.6, y: -20, ease: 'none' }, 0);
      
      // Spatial zoom network centerpiece toward camera
      if (canvasWrapper) {
        scrollTl.to(canvasWrapper, { scale: 1.15, z: 50, y: -10, opacity: 0.85, ease: 'none' }, 0);
      }

      // Shift background aurora position
      if (document.querySelector('.hero-aurora')) {
        scrollTl.to('.hero-aurora', { y: 200, scale: 1.25, opacity: 0.3, ease: 'none' }, 0);
      }

      // Fade out indicators
      scrollTl.to('#heroScrollIndicator', { opacity: 0, ease: 'none' }, 0);

      // Fade out console and text block
      scrollTl.to('.hero-console-log', { opacity: 0, scale: 0.95, ease: 'none' }, 0.1);
      scrollTl.to('.hero-text-block', { opacity: 0, y: -30, ease: 'none' }, 0.2);

      // Smooth section fade to About section
      scrollTl.to(heroPin, { opacity: 0, ease: 'none' }, 0.8);
    }
  }

  /* ---------- 3D Mouse Perspective Tilt on Mockups ---------- */
  const devices = document.querySelectorAll('.device-mockup');
  if (window.matchMedia('(hover: hover)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
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
    const fadeUps = document.querySelectorAll('.section-title, .section-sub, .card, .timeline-item, .project-bento, .contact-wrapper');
    fadeUps.forEach(el => {
      gsap.fromTo(el, 
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            toggleActions: 'play none none none'
          }
        }
      );
    });

    // Animate stats counter fields on ScrollTrigger
    const countStats = document.querySelectorAll('[data-count]');
    countStats.forEach(stat => {
      const target = parseInt(stat.getAttribute('data-count'), 10);
      const isPercent = stat.classList.contains('num') && stat.getAttribute('data-suffix') === '%';
      
      let countObj = { val: 0 };
      gsap.to(countObj, {
        val: target,
        duration: 1.5,
        scrollTrigger: {
          trigger: stat,
          start: 'top 90%'
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
  }

  /* ---------- Interactive Backend Architecture Data Stream Graph ---------- */
  const heroCanvas = document.getElementById('heroNetworkCanvas');
  const consoleLog = document.querySelector('.hero-console-log');
  
  if (heroCanvas) {
    const ctx = heroCanvas.getContext('2d');
    let hw, hh;
    
    function resizeHeroCanvas() {
      if (heroCanvas.offsetWidth === 0) return;
      hw = heroCanvas.width = heroCanvas.offsetWidth;
      hh = heroCanvas.height = heroCanvas.offsetHeight;
    }
    resizeHeroCanvas();
    window.addEventListener('resize', resizeHeroCanvas);
    
    // Services node coordinates
    let nodes = [
      { name: 'Gateway', x: 0.15, y: 0.5, label: 'API GATEWAY', status: 'ONLINE', r: 12, targetR: 12, col: '#ff4d00' },
      { name: 'Auth', x: 0.35, y: 0.25, label: 'SPRING SECURITY 6', status: 'JWT VALID', r: 10, targetR: 10, col: '#ff4d00' },
      { name: 'Core', x: 0.5, y: 0.5, label: 'SPRING BOOT APP', status: 'RUNNING', r: 16, targetR: 16, col: '#ff4d00' },
      { name: 'Kafka', x: 0.75, y: 0.25, label: 'KAFKA TOPIC', status: 'CONSUMING', r: 12, targetR: 12, col: '#ff4d00' },
      { name: 'Redis', x: 0.7, y: 0.75, label: 'REDIS CACHE', status: 'INDEXED', r: 10, targetR: 10, col: '#ff4d00' },
      { name: 'Database', x: 0.9, y: 0.5, label: 'MYSQL LEDGER', status: 'SYNCED', r: 14, targetR: 14, col: '#ff4d00' }
    ];
    
    let connections = [
      { from: 'Gateway', to: 'Auth' },
      { from: 'Gateway', to: 'Core' },
      { from: 'Auth', to: 'Core' },
      { from: 'Core', to: 'Kafka' },
      { from: 'Core', to: 'Redis' },
      { from: 'Core', to: 'Database' }
    ];
    
    let packets = [];
    
    const logs = [
      'Route matching: GET /api/v1/orders',
      'Authorize credentials: JWT token parsed',
      'Context: Security context populated',
      'Core: Dispatching order transaction saga',
      'Kafka: Published event ORDER_PLACED to partitions',
      'Redis: Checking lookup catalog cache',
      'Redis: Cache hit ORDER_CATALOG_101',
      'Database: Persisting financial ledger block',
      'Database: Balance update commit OK'
    ];
    
    function logMessage(msg) {
      if (consoleLog) {
        const line = document.createElement('div');
        line.className = 'console-line';
        line.textContent = `> [${new Date().toLocaleTimeString()}] ${msg}`;
        consoleLog.appendChild(line);
        consoleLog.scrollTop = consoleLog.scrollHeight;
        if (consoleLog.children.length > 5) {
          consoleLog.removeChild(consoleLog.firstChild);
        }
      }
    }
    
    // Automated periodic packets
    setInterval(() => {
      if (heroCanvas.offsetWidth === 0) return;
      packets.push({
        x: nodes[0].x * hw,
        y: nodes[0].y * hh,
        t: 0,
        speed: 0.015,
        from: nodes[0],
        to: nodes[2],
        trail: []
      });
      logMessage(logs[Math.floor(Math.random() * 3)]);
    }, 3200);
    
    function drawHeroNetwork() {
      if (heroCanvas.offsetWidth === 0) return;
      ctx.clearRect(0, 0, hw, hh);
      
      const theme = document.documentElement.getAttribute('data-theme') || 'dark';
      const lineColor = theme === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';
      const nodeFill = theme === 'light' ? '#ffffff' : '#121212';
      const textColor = theme === 'light' ? '#000000' : '#ffffff';
      const textMuted = theme === 'light' ? '#6b6b6b' : '#a8a8a7';
      
      // connections
      connections.forEach(conn => {
        const nodeA = nodes.find(n => n.name === conn.from);
        const nodeB = nodes.find(n => n.name === conn.to);
        if (nodeA && nodeB) {
          ctx.beginPath();
          ctx.moveTo(nodeA.x * hw, nodeA.y * hh);
          ctx.lineTo(nodeB.x * hw, nodeB.y * hh);
          ctx.strokeStyle = lineColor;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
      
      // nodes
      nodes.forEach(n => {
        const ax = n.x * hw;
        const ay = n.y * hh;
        
        n.r = n.r + (n.targetR - n.r) * 0.15;
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(ax, ay, n.r, 0, Math.PI * 2);
        ctx.fillStyle = nodeFill;
        ctx.strokeStyle = n.col;
        ctx.lineWidth = n.r > n.targetR ? 3 : 2;
        ctx.shadowBlur = n.r > n.targetR ? 12 : 4;
        ctx.shadowColor = n.col;
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        
        ctx.fillStyle = textColor;
        ctx.font = '700 9px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.fillText(n.label, ax, ay - n.r - 10);
        
        ctx.fillStyle = textMuted;
        ctx.font = '500 8px Inter';
        ctx.fillText(n.status, ax, ay + n.r + 14);
      });
      
      // packets
      for (let i = packets.length - 1; i >= 0; i--) {
        const p = packets[i];
        p.t += p.speed;
        
        const startX = p.from.x * hw;
        const startY = p.from.y * hh;
        const endX = p.to.x * hw;
        const endY = p.to.y * hh;
        
        p.x = startX + (endX - startX) * p.t;
        p.y = startY + (endY - startY) * p.t;
        
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 8) p.trail.shift();
        
        ctx.beginPath();
        p.trail.forEach((pt) => {
          ctx.lineTo(pt.x, pt.y);
        });
        ctx.strokeStyle = 'rgba(255, 77, 0, 0.35)';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ff4d00';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ff4d00';
        ctx.fill();
        
        if (p.t >= 1) {
          if (p.to.name === 'Core') {
            const destinations = ['Kafka', 'Redis', 'Database'];
            destinations.forEach(destName => {
              const targetNode = nodes.find(n => n.name === destName);
              packets.push({
                x: endX, y: endY, t: 0, speed: 0.02, from: p.to, to: targetNode, trail: []
              });
            });
            logMessage(logs[Math.floor(Math.random() * 6) + 3]);
          } else {
            p.to.r = p.to.targetR * 1.4;
          }
          packets.splice(i, 1);
        }
      }
      
      requestAnimationFrame(drawHeroNetwork);
    }
    
    // Wait slightly to guarantee element sizes are resolved on load
    setTimeout(() => {
      resizeHeroCanvas();
      drawHeroNetwork();
    }, 100);
    
    // Interactive mouse clicks
    heroCanvas.addEventListener('click', (e) => {
      const rect = heroCanvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      
      nodes.forEach(n => {
        const ax = n.x * hw;
        const ay = n.y * hh;
        const dist = Math.hypot(clickX - ax, clickY - ay);
        if (dist < n.r * 2) {
          n.r = n.targetR * 1.6;
          logMessage(`Manual audit trace triggered: ${n.name}`);
          
          connections.forEach(conn => {
            if (conn.from === n.name) {
              const target = nodes.find(t => t.name === conn.to);
              packets.push({
                x: ax, y: ay, t: 0, speed: 0.025, from: n, to: target, trail: []
              });
            }
          });
        }
      });
    });
  }

});
