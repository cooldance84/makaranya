const PRODUCTS = {
  'rose-raspberry': { name: 'Rózsa–málna', price: 790, image: 'assets/images/rose-raspberry.jpg' },
  'salted-pistachio': { name: 'Sós pisztácia', price: 850, image: 'assets/images/salted-pistachio.jpg' },
  'lemon-meringue': { name: 'Citromhab', price: 750, image: 'assets/images/lemon-meringue.jpg' },
  'dark-chocolate': { name: 'Étcsokoládé', price: 820, image: 'assets/images/dark-chocolate.jpg' }
};

const BOX_SIZES = [6, 12, 18];
const CART_KEY = 'makaranya-cart-v1';
const BOX_SIZE_KEY = 'makaranya-box-size-v1';
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
const cartSummaryNote = document.querySelector('#cart-summary-note');
const cartCapacity = document.querySelector('#cart-capacity');
const bagCount = cartButton.querySelector('span');
const orderForm = document.querySelector('#order-form');
const orderStatus = document.querySelector('#order-status');
const orderSuccess = document.querySelector('#order-success');
const deliverySelect = document.querySelector('#delivery-select');
const addressField = document.querySelector('#address-field');
const boxSlots = document.querySelector('#box-slots');
const progressLabel = document.querySelector('#box-progress-label');
const progressHint = document.querySelector('#box-progress-hint');
const progressBar = document.querySelector('#box-progress-bar');
const builderActionNote = document.querySelector('#builder-action-note');
const builderCartButton = document.querySelector('#builder-cart-button');
const toast = document.querySelector('.toast');
const money = new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 });

let toastTimer;
let cart = loadCart();
let boxSize = loadBoxSize();
fitLegacyCart();

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY) || '{}');
    return Object.fromEntries(Object.entries(saved).filter(([id, quantity]) => PRODUCTS[id] && Number.isInteger(quantity) && quantity > 0));
  } catch {
    return {};
  }
}

function loadBoxSize() {
  const saved = Number(localStorage.getItem(BOX_SIZE_KEY));
  return BOX_SIZES.includes(saved) ? saved : 6;
}

function fitLegacyCart() {
  let remaining = 18;
  cart = Object.fromEntries(Object.entries(cart).map(([id, quantity]) => {
    const kept = Math.min(quantity, remaining);
    remaining -= kept;
    return [id, kept];
  }).filter(([, quantity]) => quantity > 0));
  const count = cartCount();
  if (count > boxSize) boxSize = BOX_SIZES.find(size => size >= count) || 18;
}

function saveState() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  localStorage.setItem(BOX_SIZE_KEY, String(boxSize));
  sessionStorage.removeItem(ORDER_REQUEST_KEY);
  orderSuccess.hidden = true;
}

function cartCount() {
  return Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
}

function cartTotal() {
  return Object.entries(cart).reduce((sum, [id, quantity]) => sum + PRODUCTS[id].price * quantity, 0);
}

function expandedCart() {
  return Object.entries(cart).flatMap(([id, quantity]) => Array(quantity).fill(id));
}

function renderBuilder() {
  const count = cartCount();
  const remaining = boxSize - count;
  document.querySelectorAll('[data-box-size]').forEach(button => {
    const active = Number(button.dataset.boxSize) === boxSize;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  progressLabel.textContent = `${count} / ${boxSize} hely`;
  cartCapacity.textContent = `${count} / ${boxSize} darab`;
  progressHint.textContent = remaining > 0 ? `Még ${remaining} macaront válassz` : 'A doboz megtelt ✓';
  builderActionNote.textContent = remaining > 0 ? `Még ${remaining} darab hiányzik a kosárhoz.` : 'A válogatásod elkészült.';
  builderCartButton.disabled = remaining > 0;
  progressBar.style.width = `${Math.min(100, count / boxSize * 100)}%`;
  const chosen = expandedCart();
  boxSlots.innerHTML = Array.from({ length: boxSize }, (_, index) => {
    const id = chosen[index];
    return id
      ? `<button type="button" class="box-slot filled" data-remove-slot="${id}" style="background-image:url('${PRODUCTS[id].image}')" aria-label="${PRODUCTS[id].name} eltávolítása"><i aria-hidden="true">×</i></button>`
      : '<span class="box-slot" aria-hidden="true"></span>';
  }).join('');
}

function renderCart() {
  const entries = Object.entries(cart);
  const count = cartCount();
  const empty = entries.length === 0;
  const complete = count === boxSize;

  bagCount.textContent = count;
  cartEmpty.hidden = !empty;
  cartItems.hidden = empty;
  cartSummary.hidden = empty;
  orderForm.hidden = empty;

  cartItems.innerHTML = entries.map(([id, quantity]) => {
    const product = PRODUCTS[id];
    return `<div class="cart-line" data-cart-id="${id}">
      <img class="cart-line-photo" src="${product.image}" alt="" width="62" height="62">
      <div class="cart-line-copy"><strong>${product.name}</strong><small>${money.format(product.price)} / db</small>
        <div class="quantity"><button type="button" data-action="minus" aria-label="Egy darab eltávolítása">−</button><span>${quantity}</span><button type="button" data-action="plus" aria-label="Egy darab hozzáadása">+</button></div>
      </div>
      <div class="cart-line-total"><strong>${money.format(product.price * quantity)}</strong><button type="button" data-action="remove">Törlés</button></div>
    </div>`;
  }).join('');

  cartSubtotal.textContent = money.format(cartTotal());
  cartSummaryNote.textContent = complete
    ? 'A doboz kész — add meg az adataidat a rendelés elküldéséhez.'
    : `A rendeléshez még ${boxSize - count} macaront válassz.`;
  const submitButton = orderForm.querySelector('.order-submit');
  submitButton.disabled = !complete;
  submitButton.title = complete ? '' : `A ${boxSize} darabos dobozt teljesen meg kell tölteni.`;
  renderBuilder();
}

function setBoxSize(nextSize) {
  if (!BOX_SIZES.includes(nextSize)) return;
  if (cartCount() > nextSize) {
    showToast(`Előbb csökkentsd a doboz tartalmát ${nextSize} darabra.`);
    return;
  }
  boxSize = nextSize;
  saveState();
  renderCart();
}

function addProduct(id) {
  if (cartCount() >= boxSize) {
    showToast('A doboz megtelt — válassz nagyobb méretet.');
    return;
  }
  cart[id] = (cart[id] || 0) + 1;
  saveState();
  renderCart();
  showToast(cartCount() === boxSize ? 'Kész a dobozod ✓' : 'Hozzáadtuk a dobozodhoz ♧');
}

function setCartOpen(open) {
  document.body.classList.toggle('cart-open', open);
  cartDrawer.classList.toggle('open', open);
  cartOverlay.classList.toggle('open', open);
  cartDrawer.setAttribute('aria-hidden', String(!open));
  cartOverlay.setAttribute('aria-hidden', String(!open));
  if (open) document.querySelector('.cart-close').focus();
}

function showToast(message = 'Hozzáadtuk a dobozodhoz ♧') {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
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

document.querySelectorAll('[data-box-size]').forEach(button => button.addEventListener('click', () => setBoxSize(Number(button.dataset.boxSize))));
document.querySelectorAll('.add-product').forEach(button => button.addEventListener('click', () => addProduct(button.closest('[data-product-id]').dataset.productId)));

document.querySelector('#seasonal-add').addEventListener('click', () => {
  boxSize = 12;
  cart = Object.fromEntries(Object.keys(PRODUCTS).map(id => [id, 3]));
  saveState();
  renderCart();
  showToast('A szezonális válogatás elkészült ✓');
  setCartOpen(true);
});

builderCartButton.addEventListener('click', () => {
  if (cartCount() !== boxSize) return;
  showToast('A dobozod a kosárban van ✓');
  setCartOpen(true);
});

boxSlots.addEventListener('click', event => {
  const slot = event.target.closest('[data-remove-slot]');
  if (!slot) return;
  const id = slot.dataset.removeSlot;
  cart[id] -= 1;
  if (cart[id] <= 0) delete cart[id];
  saveState();
  renderCart();
  showToast(`${PRODUCTS[id].name} eltávolítva`);
});

cartItems.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const id = button.closest('[data-cart-id]').dataset.cartId;
  const action = button.dataset.action;
  if (action === 'plus') {
    addProduct(id);
    return;
  }
  if (action === 'minus') cart[id] -= 1;
  if (action === 'remove' || cart[id] <= 0) delete cart[id];
  saveState();
  renderCart();
});

cartButton.addEventListener('click', () => setCartOpen(true));
document.querySelector('.cart-close').addEventListener('click', () => setCartOpen(false));
cartOverlay.addEventListener('click', () => setCartOpen(false));
document.querySelector('#cart-shop').addEventListener('click', () => {
  setCartOpen(false);
  document.querySelector('#box-builder').scrollIntoView({ behavior: 'smooth' });
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
  if (cartCount() !== boxSize) {
    orderStatus.className = 'order-status error';
    orderStatus.textContent = `A rendeléshez pontosan ${boxSize} macaront válassz.`;
    return;
  }

  const submitButton = orderForm.querySelector('.order-submit');
  const formData = new FormData(orderForm);
  let requestId = sessionStorage.getItem(ORDER_REQUEST_KEY);
  if (!requestId) {
    requestId = crypto.randomUUID();
    sessionStorage.setItem(ORDER_REQUEST_KEY, requestId);
  }
  const payload = {
    requestId,
    boxSize,
    customer: { name: formData.get('name'), email: formData.get('email'), phone: formData.get('phone') },
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
    const response = await fetch('/.netlify/functions/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'A rendelést most nem sikerült elküldeni.');
    cart = {};
    saveState();
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
    submitButton.classList.remove('loading');
    submitButton.disabled = cartCount() !== boxSize;
  }
});

const contactForm = document.querySelector('#contact-form');
contactForm.addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(contactForm);
  const subject = `Makaranya — ${data.get('subject')}`;
  const body = `Név: ${data.get('name')}\nE-mail: ${data.get('email')}\n\n${data.get('message')}`;
  window.location.href = `mailto:tiborcz.kiss@gmail.hu?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});

updateAddressField();
renderCart();
