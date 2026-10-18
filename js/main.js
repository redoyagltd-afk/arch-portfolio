/**
 * ARK STUDIO — Main JS
 * Theme manager (Dark / Light mode), Mobile navigation, Image lightbox
 * Zero dependencies
 */

(function () {
  'use strict';

  /* ==========================================
     Theme Manager (Dark / Light Mode)
     ========================================== */

  const THEME_STORAGE_KEY = 'ark_theme';

  function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function getActiveTheme() {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
    return getSystemTheme();
  }

  function applyTheme(theme, persist = true) {
    document.documentElement.setAttribute('data-theme', theme);
    if (persist) {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
      } catch (e) {
        // Storage might be restricted
      }
    }
    updateThemeToggleLabels(theme);
  }

  function updateThemeToggleLabels(theme) {
    const toggles = document.querySelectorAll('.theme-toggle');
    const nextThemeLabel = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    toggles.forEach(function (toggle) {
      toggle.setAttribute('aria-label', nextThemeLabel);
      toggle.setAttribute('title', nextThemeLabel);
    });
  }

  function initTheme() {
    const initialTheme = getActiveTheme();
    applyTheme(initialTheme, false);

    // Bind all theme toggles (desktop and mobile)
    const toggles = document.querySelectorAll('.theme-toggle');
    toggles.forEach(function (toggle) {
      toggle.addEventListener('click', function () {
        const current = document.documentElement.getAttribute('data-theme') || getActiveTheme();
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next, true);
      });
    });

    // Listen for OS system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', function (e) {
        const saved = localStorage.getItem(THEME_STORAGE_KEY);
        if (!saved) {
          applyTheme(e.matches ? 'dark' : 'light', false);
        }
      });
    }
  }

  // Initialize theme controls
  initTheme();


  /* ==========================================
     Mobile Navigation
     ========================================== */

  const navToggle = document.querySelector('.nav-toggle');
  const siteNav = document.querySelector('.site-nav');

  if (navToggle && siteNav) {
    navToggle.addEventListener('click', function () {
      const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', !isOpen);
      siteNav.classList.toggle('is-open', !isOpen);

      // Prevent body scroll when menu is open
      document.body.style.overflow = isOpen ? '' : 'hidden';
    });

    // Close nav when a link is clicked
    siteNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        navToggle.setAttribute('aria-expanded', 'false');
        siteNav.classList.remove('is-open');
        document.body.style.overflow = '';
      });
    });

    // Close nav on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && siteNav.classList.contains('is-open')) {
        navToggle.setAttribute('aria-expanded', 'false');
        siteNav.classList.remove('is-open');
        document.body.style.overflow = '';
        navToggle.focus();
      }
    });
  }


  /* ==========================================
     Header scroll border
     ========================================== */

  const header = document.querySelector('.site-header');

  if (header) {
    window.addEventListener('scroll', function () {
      header.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
  }


  /* ==========================================
     Image Lightbox
     ========================================== */

  const lightbox = document.querySelector('.lightbox');

  if (lightbox) {
    const lbImg = lightbox.querySelector('img');
    const lbClose = lightbox.querySelector('.lightbox-close');
    const lbPrev = lightbox.querySelector('.lightbox-prev');
    const lbNext = lightbox.querySelector('.lightbox-next');
    const galleryImages = Array.from(document.querySelectorAll('.gallery-grid img'));
    let currentIndex = 0;
    let lastFocused = null;

    function openLightbox(index) {
      currentIndex = index;
      lbImg.src = galleryImages[index].src;
      lbImg.alt = galleryImages[index].alt;
      lightbox.classList.add('is-active');
      document.body.style.overflow = 'hidden';
      lastFocused = document.activeElement;
      lbClose.focus();
    }

    function closeLightbox() {
      lightbox.classList.remove('is-active');
      document.body.style.overflow = '';
      if (lastFocused) lastFocused.focus();
    }

    function showPrev() {
      currentIndex = (currentIndex - 1 + galleryImages.length) % galleryImages.length;
      lbImg.src = galleryImages[currentIndex].src;
      lbImg.alt = galleryImages[currentIndex].alt;
    }

    function showNext() {
      currentIndex = (currentIndex + 1) % galleryImages.length;
      lbImg.src = galleryImages[currentIndex].src;
      lbImg.alt = galleryImages[currentIndex].alt;
    }

    // Click to open
    galleryImages.forEach(function (img, i) {
      const figure = img.closest('figure');
      if (figure) {
        figure.addEventListener('click', function () {
          openLightbox(i);
        });
      }
    });

    // Controls
    lbClose.addEventListener('click', closeLightbox);
    if (lbPrev) lbPrev.addEventListener('click', showPrev);
    if (lbNext) lbNext.addEventListener('click', showNext);

    // Click backdrop to close
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeLightbox();
    });

    // Keyboard
    document.addEventListener('keydown', function (e) {
      if (!lightbox.classList.contains('is-active')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') showPrev();
      if (e.key === 'ArrowRight') showNext();
    });
  }

  /* ==========================================
     Homepage Dynamic Project Grid Hydration
     ========================================== */
  function hydrateProjectGrid() {
    const grid = document.querySelector('.project-grid');
    if (!grid) return;

    function sanitize(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function resolveHomeImg(path) {
      if (!path) return 'images/project2.jpg';
      if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
      return path.replace(/^\.\.\//, '').replace(/^\//, '');
    }

    function renderProjects(projects) {
      if (!Array.isArray(projects) || projects.length === 0) return;
      grid.innerHTML = '';
      projects.forEach(function (p) {
        const slug = p.slug || p.id || 'project';
        const title = p.title || 'Untitled Project';
        const typology = p.typology || 'Architecture';
        const location = p.location || 'Dhaka';
        const year = p.year || new Date().getFullYear();
        const hero = resolveHomeImg(p.heroImage || (p.images && p.images[0] && p.images[0].path));

        const card = document.createElement('a');
        card.href = 'projects/' + slug + '.html';
        // Add fallback event: if static file 404s, redirect to universal viewer view.html
        card.className = 'project-card';
        card.setAttribute('aria-label', 'View project: ' + title);

        card.innerHTML = `
          <div class="project-card-image">
            <img src="${sanitize(hero)}" alt="${sanitize(title)} architecture in ${sanitize(location)}" loading="lazy">
          </div>
          <div class="project-card-info">
            <h3>${sanitize(title)}</h3>
            <p>${sanitize(typology)} • ${sanitize(location)} • ${sanitize(year)}</p>
          </div>
        `;

        grid.appendChild(card);
      });
    }

    // Try canonical data/projects.json first
    fetch('data/projects.json')
      .then(function (res) {
        if (res.ok) return res.json();
        throw new Error('No remote projects.json');
      })
      .then(function (json) {
        if (Array.isArray(json) && json.length > 0) {
          renderProjects(json);
        }
      })
      .catch(function () {
        // Fallback to localStorage draft if available
        try {
          const local = localStorage.getItem('ark_studio_projects_v2');
          if (local) {
            const parsed = JSON.parse(local);
            if (Array.isArray(parsed) && parsed.length > 0) {
              renderProjects(parsed);
            }
          }
        } catch (e) {}
      });
  }

  // Hydrate grid on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrateProjectGrid);
  } else {
    hydrateProjectGrid();
  }
})();

