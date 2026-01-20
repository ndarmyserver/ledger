// slider.js
export class Slider {
  constructor({ toggleEl, pillEl = toggleEl.querySelector('.toggle-pill'), buttons = Array.from(toggleEl.querySelectorAll('.toggle-option')), hiddenInputEl = null, onActivate }) {
    this.toggleEl = toggleEl;
    this.pillEl = pillEl;
    this.buttons = buttons;
    this.onActivate = onActivate; // callback when a button is activated
    this.hiddenInputEl = hiddenInputEl;
    this.activeIndex = 0;

    // Gesture/animation state
    this.isDragging = false;
    this.hasMoved = false;
    this.startX = 0;
    this.pillStartX = 0;
    this.animationFrame = null;

    // Initialize pill width
    this.updatePillWidth();

    // Attach click listeners
    this.buttons.forEach((btn, idx) => {
      btn.addEventListener("click", () => this.activate(idx, false));
    });

    // Attach touch/drag support
    this.addTouchListeners();

    // Ensure pill resizes on window resize
    window.addEventListener("resize", () => this.updatePillWidth());
  }

  // Update pill width based on number of buttons
  updatePillWidth() {
    const width = this.toggleEl.offsetWidth / this.buttons.length;
    this.pillEl.style.width = `${width - 8}px`; // matches your existing spacing
  }

  // Activate a button by index
  activate(index, useSpring = true) {
    index = Math.max(0, Math.min(index, this.buttons.length - 1));
    this.activeIndex = index;

    const optionWidth = this.toggleEl.offsetWidth / this.buttons.length;
    const targetX = index * optionWidth;

    // Remove active from all buttons
    this.buttons.forEach(b => b.classList.remove("active"));
    this.buttons[index].classList.add("active");

    // Move pill
    if (useSpring) {
      this.animateSpring(parseFloat(this.getCurrentPillX()) || 0, targetX);
    } else {
      this.pillEl.style.transition = "transform 0.25s ease";
      this.pillEl.style.transform = `translateX(${targetX}px)`;
    }

    // **Update hidden input value**
    if (this.hiddenInputEl) {
      const value = this.buttons[index].dataset.value || this.buttons[index].textContent;
      this.hiddenInputEl.value = value;
    }

    // Call callback for mode/category specific logic
    if (this.onActivate) this.onActivate(index, this.buttons[index].dataset.value);
  }

  getCurrentPillX() {
    const style = window.getComputedStyle(this.pillEl);
    const matrix = new WebKitCSSMatrix(style.transform);
    return matrix.m41;
  }

  animateSpring(from, to, duration = 300) {
    const startTime = performance.now();

    const animate = (time) => {
      const t = (time - startTime) / duration;
      const eased = t < 1 ? 1 - Math.pow(1 - t, 3) : 1; // cubic ease-out
      const value = from + (to - from) * eased;
      this.pillEl.style.transform = `translateX(${value}px)`;

      if (t < 1) {
        this.animationFrame = requestAnimationFrame(animate);
      } else {
        this.pillEl.style.transform = `translateX(${to}px)`;
        cancelAnimationFrame(this.animationFrame);
      }
    };

    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    this.animationFrame = requestAnimationFrame(animate);
  }

  addTouchListeners() {
    const TAP_THRESHHOLD = 6; // pixels
    this.toggleEl.addEventListener("touchstart", e => {
      this.isDragging = true;
      this.hasMoved = false;
      this.startX = e.touches[0].clientX;
      
      if (this.animationFrame) cancelAnimationFrame(this.animationFrame);

      this.pillStartX = this.getCurrentPillX();
      this.pillEl.style.transition = "none";
    });

    this.toggleEl.addEventListener("touchmove", e => {
      if (!this.isDragging) return;

      const currentX = e.touches[0].clientX;
      const deltaX = currentX - this.startX;
      
      if (Math.abs(deltaX) > TAP_THRESHHOLD) {
        this.hasMoved = true;
      }

      if (!this.hasMoved) return;
      
      const optionWidth = this.toggleEl.offsetWidth / this.buttons.length;
      const maxX = optionWidth * (this.buttons.length - 1);
      const newX = Math.max(0, Math.min(this.pillStartX + deltaX, maxX));

      this.pillEl.style.transform = `translateX(${newX}px)`;
      e.preventDefault();
    }, { passive: false });

    this.toggleEl.addEventListener("touchend", () => {
      if (!this.isDragging) return;
      this.isDragging = false;

      if (!this.hasMoved) {
        // Treat as a tap
        const touchX = e.changedTrouches[0].clientX;
        const rect = this.toggleEl.getBoundingClientRect();
        const optionWidth = rect.width / this.buttons.length;
        const index = Math.floor((touchX - rect.left) / optionWidth);
        this.activate(index);
        return
      }

      // Otherwise, snap after drag
      const optionWidth = this.toggleEl.offsetWidth / this.buttons.length;
      const pillLeft = this.pillEl.getBoundingClientRect().left;
      const toggleLeft = this.toggleEl.getBoundingClientRect().left;
      const relativeX = pillLeft - toggleLeft + this.pillEl.offsetWidth / 2;
      const closestIndex = Math.floor(relativeX / optionWidth);
      this.activate(closestIndex);
    });
  }

  // Clears dynamic classes from buttons (like income/expense), but keeps 'toggle-option'
  clearClasses() {
    this.buttons.forEach(btn => {
      btn.classList.remove('income', 'expense'); // remove only what we dynamically add
    });
  }

  // Update button text/labels dynamically
  setLabels(labels) {
    labels.forEach((text, idx) => {
      this.buttons[idx].textContent = text;
    });
  }

  // Optionally update dataset values if needed
  setValues(values) {
    values.forEach((val, idx) => {
      this.buttons[idx].dataset.value = val;
    });
  }
}