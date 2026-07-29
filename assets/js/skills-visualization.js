document.addEventListener('DOMContentLoaded', () => {
  const cards = document.querySelectorAll('.bento-card-skill');
  if (!cards.length) return;

  /* 1. Remove AOS & Use GSAP ScrollTrigger for entrance reveals */
  cards.forEach((card, i) => {
    gsap.from(card, {
      scrollTrigger: {
        trigger: card,
        start: 'top 90%',
        once: true
      },
      opacity: 0,
      y: 40,
      duration: 0.55,
      delay: (i % 3) * 0.08,
      ease: 'power2.out'
    });
  });

  /* 2. Progress Bar Fill + Text Percentage Count-up on Scroll */
  cards.forEach(card => {
    const bar = card.querySelector('.bento-skill-progress-fill');
    const pctText = card.querySelector('.bento-skill-percentage');
    if (bar && pctText) {
      const targetPct = parseInt(bar.getAttribute('data-percent'), 10);
      
      gsap.to(bar, {
        scrollTrigger: {
          trigger: card,
          start: 'top 85%',
          once: true
        },
        width: targetPct + '%',
        duration: 1.2,
        ease: 'power3.out'
      });

      let countObj = { val: 0 };
      gsap.to(countObj, {
        scrollTrigger: {
          trigger: card,
          start: 'top 85%',
          once: true
        },
        val: targetPct,
        duration: 1.2,
        ease: 'power3.out',
        onUpdate: () => {
          pctText.textContent = Math.round(countObj.val) + '%';
        }
      });
    }
  });

  /* 3. Mouse Hover 3D Icon rotation & card scale lifts */
  cards.forEach(card => {
    const img3d = card.querySelector('.bento-skill-3d');
    
    card.addEventListener('mouseenter', () => {
      if (img3d) {
        gsap.to(img3d, {
          rotation: 12,
          scale: 1.12,
          duration: 0.4,
          ease: 'power2.out'
        });
      }
    });

    card.addEventListener('mouseleave', () => {
      if (img3d) {
        gsap.to(img3d, {
          rotation: 0,
          scale: 1,
          duration: 0.45,
          ease: 'power2.out'
        });
      }
    });

    // Keyboard Tab Enter keys interaction triggers
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        card.click();
        gsap.to(card, {
          scale: 0.97,
          duration: 0.1,
          onComplete: () => gsap.to(card, { scale: 1, duration: 0.2 })
        });
      }
    });
  });

  /* 4. Interactive Category Filters (Grouping UI) */
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filterCat = btn.getAttribute('data-category');
      
      cards.forEach(card => {
        const badge = card.querySelector('.badge-cat');
        const cardCat = badge ? badge.textContent.trim() : '';
        
        let isMatch = false;
        if (filterCat === 'all') {
          isMatch = true;
        } else if (filterCat === 'Messaging') {
          isMatch = (cardCat === 'Messaging' || cardCat === 'Caching');
        } else if (filterCat === 'Database') {
          isMatch = (cardCat === 'Database' || cardCat === 'Data');
        } else if (filterCat === 'DevOps') {
          isMatch = (cardCat === 'DevOps' || cardCat === 'Tools');
        } else {
          isMatch = (cardCat === filterCat);
        }

        if (isMatch) {
          card.style.display = 'flex';
          gsap.to(card, {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 0.35,
            ease: 'power2.out'
          });
        } else {
          gsap.to(card, {
            opacity: 0,
            scale: 0.95,
            y: 10,
            duration: 0.25,
            ease: 'power2.in',
            onComplete: () => {
              card.style.display = 'none';
            }
          });
        }
      });

      setTimeout(() => {
        if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
      }, 300);
    });
  });

  /* 5. Connected Space Mapping Relationship Highlighting (Option A) */
  const relations = {
    'Java 21': ['Spring Boot', 'Spring Security 6', 'Spring Data JPA', 'Hibernate', 'PL/SQL', 'SQL'],
    'Spring Boot': ['Microservices', 'Spring Security 6', 'Spring Data JPA', 'Hibernate', 'Apache Tomcat'],
    'Spring Security 6': ['Java 21', 'Spring Boot', 'JWT'],
    'Spring Data JPA': ['Java 21', 'Spring Boot', 'Hibernate', 'MySQL', 'Oracle SQL'],
    'Hibernate': ['Spring Data JPA', 'MySQL', 'Oracle SQL'],
    'Microservices': ['Spring Boot', 'Kafka', 'Redis (Basic)'],
    'Kafka': ['Spring Boot', 'Microservices'],
    'Redis (Basic)': ['Spring Boot', 'Microservices'],
    'MySQL': ['Oracle SQL', 'SQL', 'Hibernate', 'Spring Data JPA'],
    'Oracle SQL': ['MySQL', 'SQL', 'PL/SQL', 'Hibernate'],
    'PL/SQL': ['Oracle SQL', 'SQL', 'Java 21'],
    'JWT': ['Spring Security 6', 'Spring Boot'],
    'SQL': ['MySQL', 'Oracle SQL', 'PL/SQL', 'Java 21']
  };

  cards.forEach(card => {
    card.addEventListener('click', (e) => {
      // Don't trigger relation mapping focus if user clicked inside input or button fields
      if (e.target.closest('.filter-btn')) return;

      const titleEl = card.querySelector('.bento-skill-title');
      if (!titleEl) return;
      const skillName = titleEl.textContent.trim();
      const listRelated = relations[skillName] || [];

      const wasFocused = card.classList.contains('relation-focused');

      // Clear all active highlighted states
      cards.forEach(c => {
        c.classList.remove('relation-focused');
        gsap.to(c, { opacity: 1, duration: 0.3 });
      });

      if (!wasFocused && listRelated.length > 0) {
        card.classList.add('relation-focused');
        cards.forEach(c => {
          const cTitle = c.querySelector('.bento-skill-title');
          const name = cTitle ? cTitle.textContent.trim() : '';
          const isRelatedMatch = (name === skillName || listRelated.includes(name));
          
          gsap.to(c, {
            opacity: isRelatedMatch ? 1 : 0.2,
            duration: 0.3
          });
        });
      }
    });
  });

});
