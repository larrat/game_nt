document.addEventListener('DOMContentLoaded', () => {
  /* =========================================
     TAB LOGIC (Character Creation)
     ========================================= */
  const statTabs = document.querySelectorAll('.stat-tab');
  const tabContents = document.querySelectorAll('.tab-content');

  if (statTabs.length > 0) {
    statTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        // Find which tab was clicked based on its text content
        const tabName = e.target.textContent.toLowerCase().trim();
        
        // Hide all
        tabContents.forEach(t => t.classList.remove('active'));
        statTabs.forEach(t => t.classList.remove('active'));
        
        // Show target
        const targetContent = document.getElementById(`tab-${tabName}`);
        if (targetContent) targetContent.classList.add('active');
        e.target.classList.add('active');
      });
    });
  }

  /* =========================================
     VILLAGE SELECTOR LOGIC
     ========================================= */
  const villageIcons = document.querySelectorAll('.v-icon');
  if (villageIcons.length > 0) {
    villageIcons.forEach(icon => {
      icon.addEventListener('click', (e) => {
        villageIcons.forEach(i => i.classList.remove('active'));
        e.currentTarget.classList.add('active');
      });
    });
  }

  /* =========================================
     MODAL LOGIC (Change Image)
     ========================================= */
  const imgModal = document.getElementById('img-modal');
  const openModalBtn = document.querySelector('button[onclick*="img-modal"]');
  const closeModalBtn = document.querySelector('.modal-close');

  if (imgModal) {
    // Open modal via JS (cleaning up inline onclick if possible)
    if (openModalBtn) {
      openModalBtn.addEventListener('click', (e) => {
        e.preventDefault();
        imgModal.classList.add('active');
      });
      // Remove inline onclick from HTML safely
      openModalBtn.removeAttribute('onclick');
    }

    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', () => {
        imgModal.classList.remove('active');
      });
      closeModalBtn.removeAttribute('onclick');
    }
    
    // Close on overlay click
    imgModal.addEventListener('click', (e) => {
      if (e.target === imgModal) {
        imgModal.classList.remove('active');
      }
    });

    // Image Selection
    const modalImgOpts = document.querySelectorAll('.modal-img-opt');
    const mainCharImg = document.getElementById('main-character-img');
    
    modalImgOpts.forEach(img => {
      img.addEventListener('click', (e) => {
        modalImgOpts.forEach(i => i.classList.remove('selected'));
        e.currentTarget.classList.add('selected');
        
        // Update main image
        if (mainCharImg) {
          mainCharImg.src = e.currentTarget.src;
          mainCharImg.style.filter = e.currentTarget.style.filter; // Copy the filter as well
        }
      });
      // Remove inline onclick
      img.removeAttribute('onclick');
    });
  }
});
