/* ============================================================
   Abhishek Tangade Portfolio — main.js
   Responsive menus, custom cursors, Lenis scrolling, validations.
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Custom GPU-Accelerated Cursor ---------- */
  const dot = document.querySelector('.cursor-dot');
  const ring = document.querySelector('.cursor-ring');
  if (dot && ring && window.matchMedia('(hover: hover)').matches) {
    let mouseX = 0, mouseY = 0;
    let ringX = 0, ringY = 0;
    let firstMove = true;

    window.addEventListener('mousemove', (e) => {
      if (firstMove) {
        dot.style.opacity = '1';
        ring.style.opacity = '1';
        ringX = e.clientX;
        ringY = e.clientY;
        firstMove = false;
      }
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.left = `${mouseX}px`;
      dot.style.top = `${mouseY}px`;
    });

    // Custom animation loop for smooth delayed trailing
    (function tick() {
      ringX += (mouseX - ringX) * 0.15;
      ringY += (mouseY - ringY) * 0.15;
      ring.style.left = `${ringX}px`;
      ring.style.top = `${ringY}px`;
      requestAnimationFrame(tick);
    })();

    // Expand cursor hover interactions
    const hovers = 'a, button, .btn, .social-btn, .theme-toggle, .hamburger, input, textarea, .card';
    document.querySelectorAll(hovers).forEach(el => {
      el.addEventListener('mouseenter', () => ring.classList.add('active'));
      el.addEventListener('mouseleave', () => ring.classList.remove('active'));
    });
  }

  /* ---------- Theme Switcher (Dark Mode Only Forced) ---------- */
  const root = document.documentElement;
  const themeBtns = document.querySelectorAll('.theme-toggle');
  
  root.setAttribute('data-theme', 'dark');
  localStorage.setItem('abhishek-theme', 'dark');
  
  function updateThemeIcons() {
    themeBtns.forEach(btn => {
      btn.innerHTML = '<i class="bi bi-sun"></i>';
    });
  }
  updateThemeIcons();

  themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Bypassed: keep theme dark
      root.setAttribute('data-theme', 'dark');
      localStorage.setItem('abhishek-theme', 'dark');
      updateThemeIcons();
      window.dispatchEvent(new CustomEvent('themechanged', { detail: 'dark' }));
    });
  });

  /* ---------- Floating Navbar Show/Hide/Shrink on Scroll ---------- */
  let lastScroll = window.scrollY;
  const navbar = document.querySelector('.navbar');
  window.addEventListener('scroll', () => {
    const cur = window.scrollY;
    if (navbar) {
      navbar.classList.toggle('shrink', cur > 80);
      navbar.classList.toggle('hide-nav', cur > lastScroll && cur > 200);
      
      if (cur > lastScroll && cur > 200) {
        navbar.classList.add('hide');
      } else {
        navbar.classList.remove('hide');
      }
    }
    lastScroll = cur;
  });

  /* ---------- Hero Cursor Spotlight Tracker ---------- */
  const spotlight = document.getElementById('spotlight');
  const heroSection = document.querySelector('.hero');
  if (spotlight && heroSection) {
    heroSection.addEventListener('pointermove', (e) => {
      spotlight.style.left = e.clientX + 'px';
      spotlight.style.top = e.clientY + 'px';
      spotlight.style.opacity = '1';
    });
    heroSection.addEventListener('pointerleave', () => {
      spotlight.style.opacity = '0';
    });
  }

  /* ---------- Hamburger Menu Overlay Drawer ---------- */
  const hamburger = document.querySelector('.hamburger');
  const mobileDrawer = document.querySelector('.mobile-drawer');
  if (hamburger && mobileDrawer) {
    const toggleMenu = () => {
      const isOpen = mobileDrawer.classList.toggle('open');
      hamburger.classList.toggle('open', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    };

    hamburger.addEventListener('click', toggleMenu);
    
    // Close overlay drawer on clicking navigation links
    mobileDrawer.querySelectorAll('.nav-links-mobile a').forEach(link => {
      link.addEventListener('click', () => {
        mobileDrawer.classList.remove('open');
        hamburger.classList.remove('open');
        document.body.style.overflow = '';
      });
    });

    // Close on escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileDrawer.classList.contains('open')) {
        toggleMenu();
      }
    });

    // Close on background click
    mobileDrawer.addEventListener('click', (e) => {
      if (e.target === mobileDrawer) {
        toggleMenu();
      }
    });
  }

  /* ---------- Nav Active State Link Spy ---------- */
  const currentFileName = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .nav-links-mobile a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentFileName || (currentFileName === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  /* ---------- Global Keyboard Navigation Shortcuts ---------- */
  window.addEventListener('keydown', (e) => {
    const active = document.activeElement;
    if (active && (
      active.tagName === 'INPUT' || 
      active.tagName === 'TEXTAREA' || 
      active.isContentEditable
    )) {
      return;
    }
    if (e.ctrlKey || e.altKey || e.metaKey) {
      return;
    }
    const cmdPalette = document.getElementById('cmdPalette');
    if (cmdPalette && cmdPalette.classList.contains('show')) {
      return;
    }
    const mobileDrawer = document.querySelector('.mobile-drawer');
    if (mobileDrawer && mobileDrawer.classList.contains('open')) {
      return;
    }

    const key = e.key.toLowerCase();
    const shortcuts = {
      'h': 'index.html',
      'a': 'about.html',
      's': 'skills.html',
      'p': 'projects.html',
      'r': 'resume.html',
      'c': 'contact.html'
    };

    if (shortcuts[key]) {
      e.preventDefault();
      if (document.startViewTransition) {
        document.startViewTransition(() => {
          window.location.href = shortcuts[key];
        });
      } else {
        window.location.href = shortcuts[key];
      }
    }
  });

  /* ---------- Lenis Smooth Scroll Initialization ---------- */
  if (typeof Lenis !== 'undefined') {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 2
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Sync Lenis with GSAP ScrollTrigger if GSAP is available
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
      });
      gsap.ticker.lagSmoothing(0);
    }
  }

  /* ---------- Contact Form Real-Time Validation ---------- */
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const msgInput = document.getElementById('message');
    const formStatus = document.getElementById('formStatus');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function validateField(input, condition) {
      const parent = input.parentElement;
      let valSpan = parent.querySelector('.field-validator');
      if (!valSpan) {
        valSpan = document.createElement('span');
        valSpan.className = 'field-validator';
        parent.appendChild(valSpan);
      }

      if (input.value.trim() === '') {
        valSpan.textContent = '';
        valSpan.className = 'field-validator';
        input.style.borderColor = '';
        return false;
      }

      if (condition) {
        valSpan.innerHTML = '<i class="fa-solid fa-check"></i>';
        valSpan.className = 'field-validator valid';
        input.style.borderColor = '#32d74b';
        return true;
      } else {
        valSpan.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        valSpan.className = 'field-validator invalid';
        input.style.borderColor = '#ff453a';
        return false;
      }
    }

    if (nameInput) {
      nameInput.addEventListener('input', () => validateField(nameInput, nameInput.value.trim().length >= 2));
    }
    if (emailInput) {
      emailInput.addEventListener('input', () => validateField(emailInput, emailRegex.test(emailInput.value.trim())));
    }
    if (msgInput) {
      msgInput.addEventListener('input', () => validateField(msgInput, msgInput.value.trim().length >= 10));
    }

    contactForm.addEventListener('submit', (e) => {
      const nameOk = nameInput ? nameInput.value.trim().length >= 2 : false;
      const emailOk = emailInput ? emailRegex.test(emailInput.value.trim()) : false;
      const msgOk = msgInput ? msgInput.value.trim().length >= 10 : false;

      if (!nameOk || !emailOk || !msgOk) {
        e.preventDefault();
        if (formStatus) {
          formStatus.textContent = 'Please correct input fields before submitting.';
          formStatus.className = 'form-status err';
        }
        // Force validate visual indicators
        if (nameInput) validateField(nameInput, nameOk);
        if (emailInput) validateField(emailInput, emailOk);
        if (msgInput) validateField(msgInput, msgOk);
        return;
      }

      if (formStatus) {
        formStatus.textContent = 'Preparing payload…';
        formStatus.className = 'form-status ok';
      }
    });
  }

  /* ---------- Particles GPU Spotlight Follower ---------- */
  const heroSection = document.querySelector('.hero');
  if (heroSection) {
    // Create spotlight element
    const container = document.createElement('div');
    container.className = 'spotlight-container';
    const spotlight = document.createElement('div');
    spotlight.className = 'spotlight';
    container.appendChild(spotlight);
    heroSection.appendChild(container);

    heroSection.addEventListener('mousemove', (e) => {
      const rect = heroSection.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      spotlight.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
    });
  }

  /* ---------- Morphing Background Aurora Gradient ---------- */
  const bgCanvas = document.getElementById('ambient-canvas');
  if (bgCanvas) {
    const bgCtx = bgCanvas.getContext('2d');
    let bw, bh;
    
    function resizeBg() {
      bw = bgCanvas.width = window.innerWidth;
      bh = bgCanvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeBg);
    resizeBg();
    
    let blobs = [
      { x: Math.random() * bw, y: Math.random() * bh, r: Math.max(bw, bh) * 0.45, vx: 0.35, vy: 0.25, c: '255, 77, 0' },
      { x: Math.random() * bw, y: Math.random() * bh, r: Math.max(bw, bh) * 0.55, vx: -0.25, vy: 0.35, c: '30, 41, 59' },
      { x: Math.random() * bw, y: Math.random() * bh, r: Math.max(bw, bh) * 0.35, vx: 0.2, vy: -0.3, c: '15, 23, 42' }
    ];
    
    function drawBg() {
      const theme = document.documentElement.getAttribute('data-theme') || 'dark';
      bgCtx.fillStyle = theme === 'light' ? '#FFFFFF' : '#000000';
      bgCtx.fillRect(0, 0, bw, bh);
      
      blobs.forEach(b => {
        b.x += b.vx;
        b.y += b.vy;
        
        if (b.x < 0 || b.x > bw) b.vx *= -1;
        if (b.y < 0 || b.y > bh) b.vy *= -1;
        
        const grad = bgCtx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
        grad.addColorStop(0, `rgba(${b.c}, 0.09)`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        
        bgCtx.fillStyle = grad;
        bgCtx.beginPath();
        bgCtx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        bgCtx.fill();
      });
      
      requestAnimationFrame(drawBg);
    }
    drawBg();
  }

  /* ---------- Developer Command Palette (Ctrl+K) ---------- */
  const cmdPalette = document.getElementById('cmdPalette');
  if (cmdPalette) {
    const input = cmdPalette.querySelector('.cmd-input');
    const items = cmdPalette.querySelectorAll('.cmd-item');
    let activeIdx = 0;
    
    function togglePalette(show) {
      if (show) {
        cmdPalette.classList.add('show');
        input.focus();
        updateActiveItem();
        document.body.style.overflow = 'hidden';
      } else {
        cmdPalette.classList.remove('show');
        input.value = '';
        filterItems('');
        document.body.style.overflow = '';
      }
    }
    
    // Toggle on Ctrl+K or badge button click
    const triggerBtn = document.getElementById('cmdTriggerBtn');
    if (triggerBtn) {
      triggerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const isOpen = cmdPalette.classList.contains('show');
        togglePalette(!isOpen);
      });
    }

    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const isOpen = cmdPalette.classList.contains('show');
        togglePalette(!isOpen);
      }
      if (e.key === 'Escape' && cmdPalette.classList.contains('show')) {
        togglePalette(false);
      }
    });
    
    cmdPalette.addEventListener('click', (e) => {
      if (e.target === cmdPalette) togglePalette(false);
    });
    
    // Keyboard navigation
    input.addEventListener('keydown', (e) => {
      const visibleItems = Array.from(items).filter(item => item.style.display !== 'none');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        activeIdx = (activeIdx + 1) % visibleItems.length;
        updateActiveItem();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        activeIdx = (activeIdx - 1 + visibleItems.length) % visibleItems.length;
        updateActiveItem();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (visibleItems[activeIdx]) {
          triggerAction(visibleItems[activeIdx]);
        }
      }
    });
    
    input.addEventListener('input', (e) => {
      filterItems(e.target.value.toLowerCase());
      activeIdx = 0;
      updateActiveItem();
    });
    
    items.forEach((item) => {
      item.addEventListener('click', () => {
        triggerAction(item);
      });
      item.addEventListener('mouseenter', () => {
        const visibleItems = Array.from(items).filter(i => i.style.display !== 'none');
        activeIdx = visibleItems.indexOf(item);
        updateActiveItem();
      });
    });
    
    function filterItems(query) {
      items.forEach(item => {
        const label = item.textContent.toLowerCase();
        if (label.includes(query)) {
          item.style.display = 'flex';
        } else {
          item.style.display = 'none';
        }
      });
    }
    
    function updateActiveItem() {
      const visibleItems = Array.from(items).filter(item => item.style.display !== 'none');
      items.forEach(item => item.classList.remove('active'));
      if (visibleItems[activeIdx]) {
        visibleItems[activeIdx].classList.add('active');
        visibleItems[activeIdx].scrollIntoView({ block: 'nearest' });
      }
    }
    
    function triggerAction(item) {
      const action = item.getAttribute('data-action');
      const val = item.getAttribute('data-value');
      
      if (action === 'nav') {
        window.location.href = val;
      } else if (action === 'theme') {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', nextTheme);
        localStorage.setItem('abhishek-theme', nextTheme);
        updateThemeIcons();
        window.dispatchEvent(new CustomEvent('themechanged', { detail: nextTheme }));
      } else if (action === 'accent') {
        document.documentElement.setAttribute('data-accent', val);
        localStorage.setItem('abhishek-accent', val);
      } else if (action === 'download') {
        const a = document.createElement('a');
        a.href = val;
        a.download = 'Abhishek_Tangade_Resume.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      
      togglePalette(false);
    }
  }
  
  // Set saved accent theme on load
  const savedAccent = localStorage.getItem('abhishek-accent');
  if (savedAccent) {
    document.documentElement.setAttribute('data-accent', savedAccent);
  }

  // Footer Year auto-update
  const yearEl = document.querySelector('[data-year]');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Global WebGL Lightning Background ---------- */
  const lightningCanvas = document.getElementById('lightningCanvas');
  if (lightningCanvas && typeof window.Lightning !== 'undefined') {
    if (window.innerWidth >= 768) {
      new window.Lightning(lightningCanvas, {
        xOffset: -0.2,
        speed: 0.65,
        intensity: 0.45,
        size: 1.0
      });
    } else {
      lightningCanvas.remove();
    }
  }

  /* ---------- Nav Hover Prefetching ---------- */
  document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('mouseenter', () => {
      if (document.querySelector(`link[rel="prefetch"][href="${link.href}"]`)) return;
      const l = document.createElement('link');
      l.rel = 'prefetch'; 
      l.href = link.href;
      document.head.appendChild(l);
    });
  });

  /* ---------- Case Study Modal Interactivity ---------- */
  const caseButtons = document.querySelectorAll('[data-case]');
  const caseModal = document.getElementById('caseModal');
  const closeBtn = document.querySelector('.case-modal-close');
  const panels = document.querySelectorAll('.case-panel');

  if (caseModal) {
    caseButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const caseId = btn.getAttribute('data-case');
        
        // Hide all case study content panels
        panels.forEach(p => p.style.display = 'none');
        
        // Show matching case study content panel
        const activePanel = document.querySelector(`[data-case-panel="${caseId}"]`);
        if (activePanel) {
          activePanel.style.display = 'block';
          caseModal.style.display = 'flex';
          document.body.style.overflow = 'hidden'; // prevent page scroll behind modal
        }
      });
    });

    const closeModal = () => {
      caseModal.style.display = 'none';
      document.body.style.overflow = ''; // restore scrolling
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    caseModal.addEventListener('click', (e) => {
      if (e.target === caseModal) closeModal();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && caseModal.style.display === 'flex') {
        closeModal();
      }
    });
  }

});
