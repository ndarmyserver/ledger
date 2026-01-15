// ----- Firebase Logic -----

// Your Firebase config from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyBW_x-6QP2Iz0VJfWdKWo0wBIi83KhM9sI",
  authDomain: "givingtransactions.firebaseapp.com",
  projectId: "givingtransactions",
  storageBucket: "givingtransactions.firebasestorage.app",
  messagingSenderId: "459666239552",
  appId: "1:459666239552:web:6d4699ddeec607baac2fa5"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Auth reference
const auth = firebase.auth();

// Modal elements
const loginModal = document.getElementById("loginModal");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");

loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  loginError.classList.add("hidden");

  if (!email || !password) {
    loginError.textContent = "Email and password are required.";
    loginError.classList.remove("hidden");
    return;
  }

  try {
    // Try signing in
    const userCredential = await auth.signInWithEmailAndPassword(email, password);

    // Show card & hide login modal
    loginModal.classList.remove("show");       // fade out login modal
    document.querySelector(".card").classList.add("show"); // fade in card
    logoutBtn.classList.remove("hidden");      // show logout

  } catch (err) {
    // Only show the error, do NOT register a new user
    loginError.textContent = err.message;
    loginError.classList.remove("hidden");
  }
});

// Check login state on page load
auth.onAuthStateChanged(async user => {
  if (user) {
    loginModal.classList.remove("show");
    document.querySelector(".card").classList.add("show");
    logoutBtn.classList.remove("hidden");

    populateDefaultVendors();

    try {
      await loadVendors();
    } catch (err) {
      console.error("Cannont load vendors.json: ", err);
    }

  } else {
    document.querySelector(".card").classList.remove("show");
    loginModal.classList.add("show");
    logoutBtn.classList.add("hidden");
  }
});


// ----- Firebase Remote Config -----
// Initialize Remote Config
const remoteConfig = firebase.remoteConfig();
remoteConfig.settings = {
  minimumFetchIntervalMillis: 3600000 // 1 hour cache
};

// Default value (in case fetch fails)
remoteConfig.defaultConfig = {
  SCRIPT_URL: ""
};

// Store URL in a global variable once fetched
let scriptUrl = null;

// Fetch once and cache
async function fetchScriptUrlOnce() {
  if (scriptUrl) return scriptUrl; // already fetched, return cached value

  try {
    await remoteConfig.fetchAndActivate(); // fetch from Firebase
    const url = remoteConfig.getValue('SCRIPT_URL').asString();
    if (!url) throw new Error("SCRIPT_URL not set");

    scriptUrl = url; // cache it
    return url;
  } catch (err) {
    console.error("Failed to fetch SCRIPT_URL:", err);
    alert("Cannot submit right now.");
    throw err; // rethrow so calling code knows fetch failed
  }
}

// ----- Transaction form logic -----
const form = document.getElementById("transactionForm");
const thankYou = document.getElementById("thankYou");
const addAnother = document.getElementById("addAnother");
const submitBtn = document.getElementById("submitBtn");
const btnText = submitBtn.querySelector(".btn-text");
const spinner = submitBtn.querySelector(".spinner");
const logoutBtn = document.getElementById("logoutBtn");


const vendorSelect = document.getElementById("vendorSelect");
const otherVendorLabel = document.getElementById("otherVendorLabel");
const otherVendorInput = document.getElementById("otherVendorInput");
const DEFAULT_VENDORS = ["Select Vendor", "Amazon", "Cash", "Chick-fil-a", "Dollar General", "Dollar Tree", "Hobby Lobby", "Mardel", "Sam’s Club", "Sonic", "Square Cash", "Starbucks", "Target", "Venmo", "Walmart", "Other"];

const dateInput = document.querySelector('input[name="date"]');
// Set date picker to default to today
function setToday() {
  const today = new Date().toISOString().split("T")[0];
  dateInput.value = today;
}

setToday();

// Poplulate dropdown with defaults first
function populateDefaultVendors() {
  const sortedDefaults = sortVendorLabels(DEFAULT_VENDORS);
  renderVendors(sortedDefaults, vendorSelect);
}

// Get vendors from local vendors.json and add in new ones to dropdown
async function loadVendors() {
  try {
    // Fetch the vendors.json file (served from your repo/site)
    const response = await fetch("./vendors.json");
    if (!response.ok) throw new Error("Failed to fetch vendors.json");

    const data = await response.json(); // now data is an array like ["Taco Bell"]

    // Combine sheet vendors with your default vendors
    const combinedLabels = [...DEFAULT_VENDORS, ...data];

    // Remove duplicates (case-insensitive)
    const uniqueLabels = Array.from(
      new Set(combinedLabels.map(l => l.toLowerCase()))
    ).map(lc => combinedLabels.find(label => label.toLowerCase() === lc));

    const sortedLabels = sortVendorLabels(uniqueLabels);
    renderVendors(sortedLabels, vendorSelect);

  } catch (err) {
    console.error("Failed to load vendors.json:", err);
  }
}

// Show / hide "Other vendor"
vendorSelect.addEventListener("change", () => {
  if (vendorSelect.value === "Other") {
    otherVendorLabel.classList.remove("hidden");
    otherVendorInput.required = true;
  } else {
    otherVendorLabel.classList.add("hidden");
    otherVendorInput.required = false;
  }
});

// Add new vendor that the user adds to the list immediately
function addVendorToDropdown(newVendor) {
  newVendor = newVendor.trim();
  if (!newVendor) return;

  // Combine with current vendors from DOM
  const currentLabels = Array.from(vendorSelect.options).map(o => o.textContent);

  if (currentLabels.some(l => l.toLowerCase() === newVendor.toLowerCase())) return;

  const combined = [...currentLabels, newVendor];
  const sorted = sortVendorLabels(combined);
  renderVendors(sorted, vendorSelect);
}

// Sort Vendors
function sortVendorLabels(labels) {
  const top = labels.filter(l => l === "Select Vendor");
  const bottom = labels.filter(l => l === "Other");
  const middle = labels.filter(l => l !== "Select Vendor" && l !== "Other");

  middle.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

  return [...top, ...middle, ...bottom];
}

// Rendor Vendor list
function renderVendors(labels, selectEl) {
  selectEl.innerHTML = ""; // clear old options

  const fragment = document.createDocumentFragment();

  labels.forEach(label => {
    const option = document.createElement("option");

    // Compute value dynamically
    option.value = label === "Select Vendor" ? "" : label;
    option.textContent = label;

    fragment.appendChild(option);
  });

  selectEl.appendChild(fragment);
}

function resetVendorUI() {
  vendorSelect.value = "";
  otherVendorLabel.classList.add("hidden");
  otherVendorInput.required = false;
  otherVendorInput.value = "";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!form.checkValidity()) {
    form.reportValidity(); // native browser messages
    return;
  }

  setLoading(true);

  try {
    const formData = new FormData(form);

    let vendor = formData.get("vendor");
    if (vendor === "Other") {
      vendor = otherVendorInput.value;
    }

    let description = formData.get("description");
    // --- Sanitize user inputs ---
    vendor = vendor.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    description = description.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to submit a transaction.");
      return;
    }

    const payload = {
      date: formData.get("date"),
      uid: user.uid,
      category: formData.get("category"),
      vendor,
      description,
      amount: parseFloat(formData.get("amount")).toFixed(2)
    };

    // If user entered a new vendor, add it immediately
    addVendorToDropdown(vendor);

    // Ensure scriptUrl is available before posting
    await fetchScriptUrlOnce();

    await fetch(scriptUrl, {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify(payload)
    });

    form.reset();
    setToday();
    resetVendorUI();
    form.classList.add("hidden");
    thankYou.classList.remove("hidden");
  } catch (err) {
    alert("Something went wrong. Check the console.");
    console.error(err);
  } finally {
    setLoading(false);
  }
});

function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  btnText.classList.toggle("hidden", isLoading);
  spinner.classList.toggle("hidden", !isLoading);
}

addAnother.addEventListener("click", () => {
  thankYou.classList.add("hidden");
  form.classList.remove("hidden");
  form.reset();
  setToday();
  resetVendorUI();

  // Reset category 
  activateButton(0, false); // 0 = first button, false = instant transition
});

// Category toggle
const buttons = document.querySelectorAll(".toggle-option");
const pill = document.querySelector(".toggle-pill");
const hiddenInput = document.getElementById("categoryInput");
const toggle = document.querySelector(".category-toggle");

let isDragging = false;
let startX = 0;
let pillStartX = 0;
let animationFrame = null;

// Utility: clamp a number
const clamp = (num, min, max) => Math.max(min, Math.min(num, max));

// Utility: animate with spring-like easing
function animateSpring(from, to, duration = 300) {
  const startTime = performance.now();

  function animate(time) {
    const t = (time - startTime) / duration;
    const eased = t < 1 ? 1 - Math.pow(1 - t, 3) : 1; // ease-out cubic
    const value = from + (to - from) * eased;
    pill.style.transform = `translateX(${value}px)`;

    if (t < 1) {
      animationFrame = requestAnimationFrame(animate);
    } else {
      pill.style.transform = `translateX(${to}px)`;
      cancelAnimationFrame(animationFrame);
    }
  }

  animationFrame = requestAnimationFrame(animate);
}

// Activate a button by index (snap pill)
function activateButton(index, useSpring = true) {
  const optionWidth = toggle.offsetWidth / buttons.length;
  const targetX = index * optionWidth;
  buttons.forEach(b => b.classList.remove("active"));
  buttons[index].classList.add("active");
  hiddenInput.value = buttons[index].dataset.value;

  if (useSpring) {
    // spring animation for touch / iOS drag
    animateSpring(parseFloat(pill.style.transform.replace("translateX(", "") || 0), targetX);
  } else {
    // instant CSS transition for desktop click
    pill.style.transition = "transform 0.25s ease";
    pill.style.transform = `translateX(${targetX}px)`;
  }
}

// Initialize active button
const initialIndex = [...buttons].findIndex(b => b.classList.contains("active"));
activateButton(initialIndex);

// Click support
buttons.forEach((button, idx) => {
  button.addEventListener("click", () => activateButton(idx, false));
});

// Touch/drag support
toggle.addEventListener("touchstart", e => {
  isDragging = true;
  startX = e.touches[0].clientX;

  // cancel any ongoing animation
  if (animationFrame) cancelAnimationFrame(animationFrame);

  // get current pill X in pixels
  const style = window.getComputedStyle(pill);
  const matrix = new WebKitCSSMatrix(style.transform);
  pillStartX = matrix.m41;

  pill.style.transition = "none"; // disable snap transition while dragging
});

toggle.addEventListener("touchmove", e => {
  if (!isDragging) return;
  const currentX = e.touches[0].clientX;
  const deltaX = currentX - startX;
  const optionWidth = toggle.offsetWidth / buttons.length;
  const maxX = optionWidth * (buttons.length - 1); // exact right-most position
  const newX = clamp(pillStartX + deltaX, 0, maxX);
  pill.style.transform = `translateX(${newX}px)`;
  e.preventDefault();
}, { passive: false });

toggle.addEventListener("touchend", () => {
  if (!isDragging) return;
  isDragging = false;

  const optionWidth = toggle.offsetWidth / buttons.length;

  // If user barely moved finger (<5px), treat it as a tap - do nothing here
  if (Math.abs(pillStartX - parseFloat(pill.style.transform.replace("translateX(", "") || 0)) < 5) {
    return;
  }

  const pillLeft = pill.getBoundingClientRect().left;
  const toggleLeft = toggle.getBoundingClientRect().left;
  const relativeX = pillLeft - toggleLeft + pill.offsetWidth / 2;
  const closestIndex = Math.floor(relativeX / optionWidth);

  activateButton(closestIndex);
});

// Log out user
logoutBtn.addEventListener("click", async () => {
  try {
    await auth.signOut();

    // Reset transaction form
    form.reset();
    setToday();
    activateButton(0, false);
    otherVendorLabel.classList.add("hidden");
    otherVendorInput.required = false;

    // Reset login form
    emailInput.value = "";
    passwordInput.value = "";
    loginError.classList.add("hidden");

    // Fade handled by onAuthStateChanged
  } catch (err) {
    console.error("Logout failed:", err);
  }
});