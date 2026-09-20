/* =========================================================
   SIVA MART - COMPLETE APP.JS
========================================================= */

const state = {
  products: [],
  category: '',
  search: '',

  cart: JSON.parse(
    localStorage.getItem('siva_mart_cart') || '[]'
  ),

  token: localStorage.getItem('siva_mart_token') || '',

  user: JSON.parse(
    localStorage.getItem('siva_mart_user') || 'null'
  ),

  loginMode: 'login'
};


/* =========================================================
   SHORTCUT
========================================================= */

function $(selector) {
  return document.querySelector(selector);
}


/* =========================================================
   API HELPER
========================================================= */

async function api(url, options = {}) {

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data.message || `Request failed (${response.status})`
    );
  }

  return data;
}


/* =========================================================
   TOAST
========================================================= */

function toast(message) {

  const element = $('#toast');

  if (!element) {
    alert(message);
    return;
  }

  element.textContent = message;
  element.classList.add('show');

  clearTimeout(window.toastTimer);

  window.toastTimer = setTimeout(() => {
    element.classList.remove('show');
  }, 2500);
}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(value) {

  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


/* =========================================================
   MONEY
========================================================= */

function money(value) {

  return `₹${Number(value || 0).toFixed(2)}`;
}


/* =========================================================
   PRODUCT IMAGE
========================================================= */

function productImage(product) {

  return product.image_url ||
    'https://placehold.co/500x400?text=No+Image';
}


/* =========================================================
   PRODUCTS
========================================================= */

async function loadProducts() {

  try {

    const params = new URLSearchParams();

    if (state.search) {
      params.set('search', state.search);
    }

    if (state.category) {
      params.set('category', state.category);
    }

    const query = params.toString();

    const url = query
      ? `/api/products?${query}`
      : '/api/products';

    const data = await api(url);

    state.products = Array.isArray(data) ? data : [];

    renderProducts();

  } catch (error) {

    console.error('PRODUCTS ERROR:', error);

    const products = $('#products');

    if (products) {
      products.innerHTML = `
        <p class="empty">
          Could not load products.
        </p>
      `;
    }

    toast(error.message);
  }
}


/* =========================================================
   RENDER PRODUCTS
========================================================= */

function renderProducts() {

  const productsElement = $('#products');

  if (!productsElement) return;

  if (state.products.length === 0) {

    productsElement.innerHTML = `
      <p class="empty">
        No products found. Try another search.
      </p>
    `;

  } else {

    productsElement.innerHTML =
      state.products.map(product => {

        const stock = Number(product.stock || 0);

        return `
          <article class="product">

            <div class="product-image">
              <img
                src="${escapeHtml(productImage(product))}"
                alt="${escapeHtml(product.name)}"
                onerror="this.src='https://placehold.co/500x400?text=No+Image'"
              >
            </div>

            <small class="product-category">
              ${escapeHtml(product.category || '')}
            </small>

            <h3>
              ${escapeHtml(product.name)}
            </h3>

            <div class="product-info">

              <span class="rating">
                ⭐ 4.5
              </span>

              <span class="stock">
                ${stock} in stock
              </span>

            </div>

            <p class="product-description">
              ${escapeHtml(product.description || '')}
            </p>

            <div class="product-footer">

              <strong class="price">
                ${money(product.price)}
              </strong>

              <button
                type="button"
                class="add"
                data-id="${product.id}"
                ${stock <= 0 ? 'disabled' : ''}
              >
                ${stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
              </button>

            </div>

          </article>
        `;

      }).join('');
  }

  const resultCount = $('#result-count');

  if (resultCount) {

    resultCount.textContent =
      `${state.products.length} products`;
  }
}


/* =========================================================
   CATEGORIES
========================================================= */

async function loadCategories() {

  try {

    const categories = await api('/api/categories');

    const categoriesElement = $('#categories');

    if (!categoriesElement) return;

    categoriesElement.innerHTML = `
      <button
        type="button"
        class="active"
        data-category=""
      >
        All departments
      </button>

      ${categories.map(category => `
        <button
          type="button"
          data-category="${escapeHtml(category.name)}"
        >
          ${escapeHtml(category.name)}
        </button>
      `).join('')}
    `;

  } catch (error) {

    console.error('CATEGORY ERROR:', error);

    toast('Could not load categories.');
  }
}


/* =========================================================
   CART STORAGE
========================================================= */

function saveCart() {

  localStorage.setItem(
    'siva_mart_cart',
    JSON.stringify(state.cart)
  );
}


/* =========================================================
   ADD TO CART
========================================================= */

function addToCart(productId) {

  const product = state.products.find(
    item => Number(item.id) === Number(productId)
  );

  if (!product) {
    toast('Product not found.');
    return;
  }

  const stock = Number(product.stock || 0);

  if (stock <= 0) {
    toast('This product is out of stock.');
    return;
  }

  const existingItem = state.cart.find(
    item => Number(item.productId) === Number(product.id)
  );

  if (existingItem) {

    if (existingItem.quantity >= stock) {
      toast('Maximum available stock reached.');
      return;
    }

    existingItem.quantity += 1;

  } else {

    state.cart.push({
      productId: Number(product.id),
      name: product.name,
      price: Number(product.price),
      image_url: product.image_url || '',
      quantity: 1
    });
  }

  saveCart();
  renderCart();

  toast(`${product.name} added to cart.`);
}


/* =========================================================
   CHANGE CART QUANTITY
========================================================= */

function changeQuantity(productId, change) {

  const item = state.cart.find(
    cartItem =>
      Number(cartItem.productId) === Number(productId)
  );

  if (!item) return;

  item.quantity += change;

  if (item.quantity <= 0) {

    state.cart = state.cart.filter(
      cartItem =>
        Number(cartItem.productId) !== Number(productId)
    );
  }

  saveCart();
  renderCart();
}


/* =========================================================
   REMOVE FROM CART
========================================================= */

function removeFromCart(productId) {

  state.cart = state.cart.filter(
    item =>
      Number(item.productId) !== Number(productId)
  );

  saveCart();
  renderCart();

  toast('Item removed from cart.');
}


/* =========================================================
   RENDER CART
========================================================= */

function renderCart() {
  const cartItems = $('#cart-items');
  const cartTotal = $('#cart-total');
  const cartCount = $('#cart-count');

  if (!cartItems) return;

  if (!Array.isArray(state.cart)) {
    state.cart = [];
  }

  if (state.cart.length === 0) {
    cartItems.innerHTML = `
      <div class="empty-cart">
        <p>Your cart is empty.</p>
      </div>
    `;

    if (cartTotal) {
      cartTotal.textContent = '₹0.00';
    }

    if (cartCount) {
      cartCount.textContent = '0';
    }

    return;
  }

  let grandTotal = 0;
  let totalQuantity = 0;

  cartItems.innerHTML = state.cart.map(item => {
    const price = Number(item.price || 0);
    const quantity = Number(item.quantity || 1);
    const itemTotal = price * quantity;

    grandTotal += itemTotal;
    totalQuantity += quantity;

    return `
      <div class="cart-item">

        <div class="cart-item-details">

          <h3>${escapeHtml(item.name)}</h3>

          <p class="cart-item-price">
            Price: ${money(price)}
          </p>

          <div class="cart-item-bottom">

            <div class="quantity-controls">

              <button
                type="button"
                class="quantity-btn"
                data-cart-action="decrease"
                data-id="${item.productId}"
              >
                −
              </button>

              <span class="quantity">
                ${quantity}
              </span>

              <button
                type="button"
                class="quantity-btn"
                data-cart-action="increase"
                data-id="${item.productId}"
              >
                +
              </button>

            </div>

            <strong class="cart-item-total">
              ${money(itemTotal)}
            </strong>

          </div>

          <button
            type="button"
            class="remove-cart-item"
            data-cart-action="remove"
            data-id="${item.productId}"
          >
            Remove
          </button>

        </div>

      </div>
    `;
  }).join('');

  if (cartTotal) {
    cartTotal.textContent = money(grandTotal);
  }

  if (cartCount) {
    cartCount.textContent = String(totalQuantity);
  }
}


/* =========================================================
   OPEN / CLOSE CART
========================================================= */

function openCart() {

  const panel = $('#cart-panel');

  if (!panel) return;

  panel.classList.add('open');
}


function closeCart() {

  const panel = $('#cart-panel');

  if (!panel) return;

  panel.classList.remove('open');
}


/* =========================================================
   AUTH UI
========================================================= */

function updateAuthUI() {

  const loginButton = $('#login-button');
  const accountButton = $('#account-button');
  const logoutButton = $('#logout-button');

  if (state.user) {

    if (loginButton) {
      loginButton.style.display = 'none';
    }

    if (accountButton) {
      accountButton.style.display = '';
    }

    if (logoutButton) {
      logoutButton.style.display = '';
    }

  } else {

    if (loginButton) {
      loginButton.style.display = '';
    }

    if (accountButton) {
      accountButton.style.display = 'none';
    }

    if (logoutButton) {
      logoutButton.style.display = 'none';
    }
  }
}


/* =========================================================
   OPEN LOGIN
========================================================= */

function openAuthDialog(mode = 'login') {

  state.loginMode = mode;

  const dialog = $('#auth-dialog');
  const title = $('#auth-title');
  const message = $('#auth-message');
  const nameInput = $('#name');
  const toggle = $('#toggle-auth');

  if (!dialog) return;


  if (mode === 'register') {

    if (title) {
      title.textContent = 'Create your Siva Mart account';
    }

    if (message) {
      message.textContent =
        'Create an account to start shopping.';
    }

    if (nameInput) {
      nameInput.style.display = '';
      nameInput.required = true;
    }

    if (toggle) {
      toggle.textContent =
        'Already have an account? Sign in';
    }

  } else {

    if (title) {
      title.textContent = 'Welcome to Siva Mart';
    }

    if (message) {
      message.textContent =
        'Sign in to place your order.';
    }

    if (nameInput) {
      nameInput.style.display = 'none';
      nameInput.required = false;
    }

    if (toggle) {
      toggle.textContent =
        'New here? Create an account';
    }
  }


  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
  } else {
    dialog.setAttribute('open', '');
  }
}


/* =========================================================
   TOGGLE LOGIN / REGISTER
========================================================= */

function toggleAuthMode() {

  if (state.loginMode === 'login') {
    openAuthDialog('register');
  } else {
    openAuthDialog('login');
  }
}


/* =========================================================
   LOGIN / REGISTER
========================================================= */

async function handleAuth(event) {

  event.preventDefault();

  const name = $('#name')?.value.trim() || '';
  const email = $('#email')?.value.trim() || '';
  const password = $('#password')?.value || '';

  try {

    const endpoint =
      state.loginMode === 'register'
        ? '/api/auth/register'
        : '/api/auth/login';


    const body =
      state.loginMode === 'register'
        ? {
            name,
            email,
            password
          }
        : {
            email,
            password
          };


    const data = await api(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });


    state.token = data.token;
    state.user = data.user;


    localStorage.setItem(
      'siva_mart_token',
      state.token
    );

    localStorage.setItem(
      'siva_mart_user',
      JSON.stringify(state.user)
    );


    updateAuthUI();


    const dialog = $('#auth-dialog');

    if (dialog) {
      dialog.close();
    }


    event.target.reset();


    toast(
      state.loginMode === 'register'
        ? 'Account created successfully.'
        : 'Login successful.'
    );

  } catch (error) {

    console.error('AUTH ERROR:', error);

    toast(error.message);
  }
}


/* =========================================================
   ACCOUNT
========================================================= */

function openAccount() {

  if (!state.user) {
    openAuthDialog('login');
    return;
  }

  const dialog = $('#account-dialog');

  if (!dialog) {
    toast(
      `${state.user.name || state.user.full_name} is logged in.`
    );
    return;
  }


  const name = $('#account-name');
  const email = $('#account-email');
  const role = $('#account-role');


  if (name) {
    name.textContent =
      state.user.name ||
      state.user.full_name ||
      '-';
  }

  if (email) {
    email.textContent =
      state.user.email || '-';
  }

  if (role) {
    role.textContent =
      state.user.role || 'buyer';
  }


  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
  } else {
    dialog.setAttribute('open', '');
  }
}


/* =========================================================
   LOGOUT
========================================================= */

function logout() {

  state.token = '';
  state.user = null;

  localStorage.removeItem(
    'siva_mart_token'
  );

  localStorage.removeItem(
    'siva_mart_user'
  );

  updateAuthUI();

  const accountDialog = $('#account-dialog');

  if (accountDialog?.open) {
    accountDialog.close();
  }

  toast('You have been signed out.');
}


/* =========================================================
   CHECKOUT
========================================================= */

async function checkout() {

  if (state.cart.length === 0) {
    toast('Your cart is empty.');
    return;
  }


  if (!state.token || !state.user) {

    toast('Please sign in before checkout.');

    openAuthDialog('login');

    return;
  }


  const items = state.cart.map(item => ({
    productId: Number(item.productId),
    quantity: Number(item.quantity)
  }));


  try {

    const data = await api('/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        items
      })
    });


    /* CLEAR CART AFTER SUCCESS */

    state.cart = [];

    saveCart();
    renderCart();


    closeCart();


    toast(
      `Order ${data.order?.order_number || ''} placed successfully!`
    );


    /* REFRESH PRODUCTS SO STOCK IS UPDATED */

    await loadProducts();

  } catch (error) {

    console.error('CHECKOUT ERROR:', error);

    toast(error.message);
  }
}


/* =========================================================
   SEARCH
========================================================= */

function setupSearch() {

  const form = $('#search-form');

  if (!form) return;

  form.addEventListener('submit', event => {

    event.preventDefault();

    state.search =
      $('#search')?.value.trim() || '';

    loadProducts();
  });
}


/* =========================================================
   CATEGORY CLICK
========================================================= */

function setupCategoryClicks() {

  const categories = $('#categories');

  if (!categories) return;

  categories.addEventListener('click', event => {

    const button =
      event.target.closest('[data-category]');

    if (!button) return;


    categories
      .querySelectorAll('[data-category]')
      .forEach(item => {
        item.classList.remove('active');
      });


    button.classList.add('active');


    state.category =
      button.dataset.category || '';


    loadProducts();
  });
}


/* =========================================================
   CART / PRODUCT CLICK EVENTS
========================================================= */

function setupClickEvents() {

  document.addEventListener('click', event => {


    /* ADD TO CART */

    const addButton =
      event.target.closest('.add[data-id]');

    if (addButton) {

      const productId =
        Number(addButton.dataset.id);

      addToCart(productId);

      return;
    }


    /* CART QUANTITY / REMOVE */

    const cartButton =
      event.target.closest('[data-cart-action]');

    if (cartButton) {

      const productId =
        Number(cartButton.dataset.id);

      const action =
        cartButton.dataset.cartAction;


      if (action === 'increase') {
        changeQuantity(productId, 1);
      }


      if (action === 'decrease') {
        changeQuantity(productId, -1);
      }


      if (action === 'remove') {
        removeFromCart(productId);
      }


      return;
    }


    /* CLOSE DIALOG / DRAWER */

    const closeButton =
      event.target.closest('[data-close]');

    if (closeButton) {

      const targetId =
        closeButton.dataset.close;

      const target =
        document.getElementById(targetId);

      if (target?.open) {
        target.close();
      }

      if (targetId === 'cart-panel') {
        closeCart();
      }

      return;
    }

  });
}


/* =========================================================
   DOM BUTTONS
========================================================= */

function setupButtons() {


  /* LOGIN */

  $('#login-button')?.addEventListener(
    'click',
    () => openAuthDialog('login')
  );


  /* ACCOUNT */

  $('#account-button')?.addEventListener(
    'click',
    openAccount
  );


  /* LOGOUT */

  $('#logout-button')?.addEventListener(
    'click',
    logout
  );


  $('#logout-button-dialog')?.addEventListener(
    'click',
    logout
  );


  /* CART */

  $('#cart-button')?.addEventListener(
    'click',
    openCart
  );


  /* CHECKOUT */

  $('#checkout')?.addEventListener(
    'click',
    checkout
  );


  /* AUTH FORM */

  $('#auth-form')?.addEventListener(
    'submit',
    handleAuth
  );


  /* LOGIN / REGISTER TOGGLE */

  $('#toggle-auth')?.addEventListener(
    'click',
    toggleAuthMode
  );
}


/* =========================================================
   START APPLICATION
========================================================= */

document.addEventListener(
  'DOMContentLoaded',
  async () => {

    console.log('Siva Mart application started.');

    updateAuthUI();

    renderCart();

    setupSearch();

    setupCategoryClicks();

    setupClickEvents();

    setupButtons();


    try {
      await loadCategories();
    } catch (error) {
      console.error(error);
    }


    await loadProducts();

  }
);