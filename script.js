const PRODUCTS = {
  'rose-raspberry': { name: 'Rózsa–málna', price: 790 },
  'salted-pistachio': { name: 'Sós pisztácia', price: 850 },
  'lemon-meringue': { name: 'Citromhab', price: 750 },
  'dark-chocolate': { name: 'Étcsokoládé', price: 820 }
};

const CART_KEY = 'makaranya-cart-v1';
const ORDER_REQUEST_KEY = 'makaranya-order-request-v1';
const header = document.querySelector('.site-header');
const menuButton = document.querySelector('.menu-toggle');
const cartButton = document.querySelector('#cart-open');
const cartDrawer = document.querySelector('#cart-drawer');
const cartOverlay = document.querySelector('#cart-overlay');
const cartItems = document.querySelector('#cart-items');
const cartEmpty = document.querySelector('#cart-empty');
const cartSummary = document.querySelector('#cart-summary');
const cartSubtotal = document.querySelector('#cart-subtotal');
const bagCount = cartButton.querySelector('span');
const orderForm = document.querySelector('#order-form');
const orderStatus = document.querySelector('#order-status');
const orderSuccess = document.querySelector('#order-success');
const deliverySelect = document.querySelector('#delivery-select');
const addressField = document.querySelector('#address-field');
const toast = document.querySelector('.toast');
const money = new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 });

let toastTimer;
let cart = loadCart();

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY) || '{}');
    return Object.fromEntries(Object.entries(saved).filter(([id, quantity]) => PRODUCTS[id] && Number.isInteger(quantity) && quantity > 0));
  } catch {
    return {};
  }
}

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  sessionStorage.removeItem(ORDER_REQUEST_KEY);
  orderSuccess.hidden = true;
}

function cartCount() {
  return Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
}

function cartTotal() {
  return Object.entries(cart).reduce((sum, [id, quantity]) => sum + PRODUCTS[id].price * quantity, 0);
}

function renderCart() {
  const entries = Object.entries(cart);
  const empty = entries.length === 0;

  bagCount.textContent = cartCount();
  cartEmpty.hidden = !empty;
  cartItems.hidden = empty;
  cartSummary.hidden = empty;
  orderForm.hidden = empty;

  cartItems.innerHTML = entries.map(([id, quantity]) => {
    const product = PRODUCTS[id];
    return `<div class="cart-line" data-cart-id="${id}">
      <div class="cart-line-art ${id}"><i></i></div>
      <div class="cart-line-copy"><strong>${product.name}</strong><small>${money.format(product.price)} / db</small>
        <div class="quantity"><button type="button" data-action="minus" aria-label="Egy darab eltávolítása">−</button><span>${quantity}</span><button type="button" data-action="plus" aria-label="Egy darab hozzáadása">+</button></div>
      </div>
      <div class="cart-line-total"><strong>${money.format(product.price * quantity)}</strong><button type="button" data-action="remove">Törlés</button></div>
    </div>`;
  }).join('');

  cartSubtotal.textContent = money.format(cartTotal());
}

function setCartOpen(open) {
  document.body.classList.toggle('cart-open', open);
  cartDrawer.classList.toggle('open', open);
  cartOverlay.classList.toggle('open', open);
  cartDrawer.setAttribute('aria-hidden', String(!open));
  cartOverlay.setAttribute('aria-hidden', String(!open));
  if (open) document.querySelector('.cart-close').focus();
}

function showToast(message = 'Hozzáadtuk a dobozodhoz ♡') {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
}

menuButton.addEventListener('click', () => {
  const open = header.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
});

document.querySelectorAll('nav a').forEach(link => link.addEventListener('click', () => {
  header.classList.remove('open');
  menuButton.setAttribute('aria-expanded', 'false');
}));

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(item => observer.observe(item));

document.querySelectorAll('.add-product').forEach(button => button.addEventListener('click', () => {
  const id = button.closest('[data-product-id]').dataset.productId;
  cart[id] = (cart[id] || 0) + 1;
  saveCart();
  renderCart();
  showToast();
}));

cartItems.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const id = button.closest('[data-cart-id]').dataset.cartId;
  const action = button.dataset.action;
  if (action === 'plus') cart[id] += 1;
  if (action === 'minus') cart[id] -= 1;
  if (action === 'remove' || cart[id] <= 0) delete cart[id];
  saveCart();
  renderCart();
});

cartButton.addEventListener('click', () => setCartOpen(true));
document.querySelector('.cart-close').addEventListener('click', () => setCartOpen(false));
cartOverlay.addEventListener('click', () => setCartOpen(false));
document.querySelector('#cart-shop').addEventListener('click', () => {
  setCartOpen(false);
  document.querySelector('#flavours').scrollIntoView({ behavior: 'smooth' });
});
document.querySelector('#success-close').addEventListener('click', () => {
  orderSuccess.hidden = true;
  renderCart();
  setCartOpen(false);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && cartDrawer.classList.contains('open')) setCartOpen(false);
});

function updateAddressField() {
  const delivery = deliverySelect.value === 'delivery';
  addressField.classList.toggle('visible', delivery);
  addressField.querySelector('input').required = delivery;
}
deliverySelect.addEventListener('change', updateAddressField);

orderForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!cartCount()) return;

  const submitButton = orderForm.querySelector('.order-submit');
  const formData = new FormData(orderForm);
  let requestId = sessionStorage.getItem(ORDER_REQUEST_KEY);
  if (!requestId) {
    requestId = crypto.randomUUID();
    sessionStorage.setItem(ORDER_REQUEST_KEY, requestId);
  }
  const payload = {
    requestId,
    customer: {
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone')
    },
    delivery: formData.get('delivery'),
    address: formData.get('address'),
    note: formData.get('note'),
    website: formData.get('website'),
    items: Object.entries(cart).map(([id, quantity]) => ({ id, quantity }))
  };

  submitButton.disabled = true;
  submitButton.classList.add('loading');
  orderStatus.className = 'order-status';
  orderStatus.textContent = 'A rendelés küldése folyamatban…';

  try {
    const response = await fetch('/.netlify/functions/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'A rendelést most nem sikerült elküldeni.');

    cart = {};
    saveCart();
    renderCart();
    orderForm.reset();
    updateAddressField();
    orderForm.hidden = true;
    cartEmpty.hidden = true;
    orderSuccess.hidden = false;
  } catch (error) {
    orderStatus.classList.add('error');
    orderStatus.textContent = error.message;
  } finally {
    submitButton.disabled = false;
    submitButton.classList.remove('loading');
  }
});

const contactForm = document.querySelector('#contact-form');
contactForm.addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(contactForm);
  const subject = `Makaranya — ${data.get('subject')}`;
  const body = `Név: ${data.get('name')}\nE-mail: ${data.get('email')}\n\n${data.get('message')}`;
  window.location.href = `mailto:hello@makaranya.hu?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});

updateAddressField();
renderCart();
