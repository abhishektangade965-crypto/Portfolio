/**
 * Event-Driven Microservices Architecture Interactive Engine
 * Handles GSAP Timelines, MotionPath SVG Packets, Counter Increments, Mouse Parallax & Hover Lighting
 */
document.addEventListener('DOMContentLoaded', () => {
  const archSection = document.getElementById('architecture-section');
  if (!archSection) return;

  // Registered GSAP plugins check
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
  }

  // 1. Counter Animation Helper
  function animateCounters() {
    const counterElements = document.querySelectorAll('.arch-metric-val[data-target]');
    counterElements.forEach(el => {
      const target = parseFloat(el.getAttribute('data-target'));
      const suffix = el.getAttribute('data-suffix') || '';
      const decimals = el.getAttribute('data-decimals') ? parseInt(el.getAttribute('data-decimals')) : 0;
      
      const obj = { val: 0 };
      gsap.to(obj, {
        val: target,
        duration: 1.8,
        ease: 'power2.out',
        onUpdate: () => {
          if (decimals > 0) {
            el.textContent = obj.val.toFixed(decimals) + suffix;
          } else {
            el.textContent = Math.floor(obj.val) + suffix;
          }
        }
      });
    });
  }

  // 2. Continuous Data Packet Loop Animation
  let packetAnimationTimeline;
  function initPacketFlows() {
    const packets = [
      { id: '#packet-gw-order', path: '#path-gw-order', duration: 1.6, delay: 0 },
      { id: '#packet-order-kafka', path: '#path-order-kafka', duration: 1.6, delay: 0.4 },
      { id: '#packet-kafka-payment', path: '#path-kafka-payment', duration: 2.0, delay: 0.8 },
      { id: '#packet-kafka-delivery', path: '#path-kafka-delivery', duration: 2.0, delay: 1.0 },
      { id: '#packet-kafka-notification', path: '#path-kafka-notification', duration: 1.8, delay: 1.2 },
      { id: '#packet-notif-mysql', path: '#path-notif-mysql', duration: 1.6, delay: 1.4 },
      { id: '#packet-mysql-redis', path: '#path-mysql-redis', duration: 1.8, delay: 1.6, yoyo: true }
    ];

    packetAnimationTimeline = gsap.timeline({ repeat: -1 });

    packets.forEach(p => {
      const circle = document.querySelector(p.id);
      const path = document.querySelector(p.path);
      if (circle && path) {
        gsap.to(circle, {
          duration: p.duration,
          repeat: -1,
          ease: 'linear',
          delay: p.delay,
          motionPath: {
            path: path,
            align: path,
            alignOrigin: [0.5, 0.5],
            autoRotate: false
          }
        });
      }
    });
  }

  // 3. Sequential Data Flow Step Highlighter (Auto-loop every 6s)
  let currentStep = 0;
  const flowSteps = document.querySelectorAll('.data-flow-step');
  if (flowSteps.length > 0) {
    setInterval(() => {
      flowSteps.forEach(s => s.classList.remove('active-step'));
      flowSteps[currentStep].classList.add('active-step');
      currentStep = (currentStep + 1) % flowSteps.length;
    }, 2800);
  }

  // 4. Main Timeline Triggered via ScrollTrigger (20% Viewport)
  if (typeof gsap !== 'undefined') {
    const mainTl = gsap.timeline({
      scrollTrigger: {
        trigger: '#architecture-section',
        start: 'top 80%',
        onEnter: () => {
          animateCounters();
          initPacketFlows();
        },
        onLeave: () => {
          if (packetAnimationTimeline) packetAnimationTimeline.pause();
        },
        onEnterBack: () => {
          if (packetAnimationTimeline) packetAnimationTimeline.resume();
        },
        onLeaveBack: () => {
          if (packetAnimationTimeline) packetAnimationTimeline.pause();
        }
      }
    });

    // 0.0s Grid Fade-in
    mainTl.fromTo('#arch-canvas-container', 
      { opacity: 0, scale: 1.02 },
      { opacity: 1, scale: 1, duration: 0.8, ease: 'power2.out' }, 0.0
    );

    // 0.3s Metric Cards Stagger
    mainTl.fromTo('.arch-metric-card',
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, stagger: 0.08, ease: 'back.out(1.4)' }, 0.3
    );

    // 0.8s API Gateway (Slide from left + pulse)
    mainTl.fromTo('#arch-node-gateway',
      { x: -50, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.6, ease: 'power2.out' }, 0.8
    );

    // 1.1s Order Service (Slide + 8 deg icon rotate)
    mainTl.fromTo('#arch-node-order',
      { x: -50, opacity: 0 },
      { x: 0, opacity: 1, duration: 0.6, ease: 'power2.out' }, 1.1
    );
    mainTl.fromTo('#arch-node-order .arch-node-icon',
      { rotate: -20 },
      { rotate: 0, duration: 0.6, ease: 'elastic.out(1, 0.5)' }, 1.1
    );

    // 1.5s Kafka Cluster Pop-in
    mainTl.fromTo('#arch-node-kafka',
      { scale: 0.7, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.7, ease: 'back.out(1.7)' }, 1.5
    );
    mainTl.fromTo('.kafka-topic-item',
      { opacity: 0, x: -10 },
      { opacity: 1, x: 0, duration: 0.4, stagger: 0.06, ease: 'power2.out' }, 1.8
    );

    // 2.0s SVG Connection Line Drawing
    mainTl.fromTo('.arch-flow-path',
      { strokeDashoffset: 1000 },
      { strokeDashoffset: 0, duration: 1.2, ease: 'power2.inOut' }, 2.0
    );

    // 2.2s - 2.6s Downstream Services Reveal
    mainTl.fromTo('#arch-node-payment', { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.5 }, 2.2);
    mainTl.fromTo('#arch-node-delivery', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 }, 2.4);
    mainTl.fromTo('#arch-node-notification', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5 }, 2.6);

    // 2.9s - 3.1s Data Stores
    mainTl.fromTo('#arch-node-mysql', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.6, ease: 'back.out(1.5)' }, 2.9);
    mainTl.fromTo('#arch-node-redis', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.6, ease: 'back.out(1.5)' }, 3.1);

    // 3.3s Flow Panel
    mainTl.fromTo('#arch-panel-flow', { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 0.5 }, 3.3);
    mainTl.fromTo('#arch-panel-legend', { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.5 }, 3.3);
  }

  // 5. Mouse Parallax & 3D Card Tilt Physics
  const canvasContainer = document.getElementById('arch-canvas-container');
  if (canvasContainer) {
    canvasContainer.addEventListener('mousemove', (e) => {
      const rect = canvasContainer.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      gsap.to('.arch-interactive-node', {
        x: x * 0.015,
        y: y * 0.015,
        duration: 0.4,
        ease: 'power1.out'
      });

      // Cursor Spotlight Effect
      canvasContainer.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
      canvasContainer.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
    });

    canvasContainer.addEventListener('mouseleave', () => {
      gsap.to('.arch-interactive-node', { x: 0, y: 0, duration: 0.6, ease: 'power2.out' });
    });
  }

  // 6. Interactive Node Hover Isolation (Highlight Path & Dim Unrelated Nodes)
  const allNodes = document.querySelectorAll('.arch-interactive-node');
  const allPaths = document.querySelectorAll('.arch-flow-path');

  allNodes.forEach(node => {
    node.addEventListener('mouseenter', () => {
      const nodeId = node.getAttribute('id');
      allNodes.forEach(n => {
        if (n !== node) n.style.opacity = '0.35';
      });

      // Highlight connections tied to this node
      allPaths.forEach(path => {
        const connects = path.getAttribute('data-connects') || '';
        if (connects.includes(nodeId)) {
          path.style.strokeWidth = '4px';
          path.style.filter = 'drop-shadow(0 0 10px var(--accent))';
        } else {
          path.style.opacity = '0.25';
        }
      });
    });

    node.addEventListener('mouseleave', () => {
      allNodes.forEach(n => n.style.opacity = '1');
      allPaths.forEach(path => {
        path.style.strokeWidth = '2px';
        path.style.filter = 'none';
        path.style.opacity = '1';
      });
    });
  });
});
