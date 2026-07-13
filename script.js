const PRODUCTS_URL = 'products.json';
const INLINE_PRODUCTS = [
  {"id":"iphone-12","name":"iPhone 12","price":230,"desc":"6.1-inch display, A14 Bionic","image":"images/iphone-12.png"},
  {"id":"iphone-12-pro","name":"iPhone 12 Pro","price":270,"desc":"6.1-inch display, A14 Bionic, Pro camera","image":"images/12 pro.png"},
  {"id":"iphone-12-pro-max","name":"iPhone 12 Pro Max","price":350,"desc":"6.7-inch display, A14 Bionic, Pro Max camera","image":"images/12 promax.png"},
  {"id":"iphone-13","name":"iPhone 13","price":330,"desc":"6.1-inch display, A15 Bionic","image":"images/13.png"},
  {"id":"iphone-13-pro","name":"iPhone 13 Pro","price":360,"desc":"6.1-inch display, A15 Bionic, Pro camera","image":"images/13 pro.png"},
  {"id":"iphone-13-pro","name":"iPhone 13 Pro","price":360,"desc":"6.1-inch display, A15 Bionic, Pro camera","image":"images/13 pro.png"},
  {"id":"iphone-13-pro-max","name":"iPhone 13 Pro Max","price":400,"desc":"6.7-inch display, A15 Bionic, Pro Max camera","image":"images/13 promax.png"},
  {"id":"iphone-14","name":"iPhone 14","price":380,"desc":"6.1-inch display, A16 Bionic","image":"images/14.png"},
  {"id":"iphone-14-plus","name":"iPhone 14 Plus","price":420,"desc":"6.7-inch display, A16 Bionic","image":"images/14 plus.png"},
  {"id":"iphone-14-pro","name":"iPhone 14 Pro","price":460,"desc":"6.1-inch display, A16 Bionic, Pro camera","image":"images/14 pro.png"},
  {"id":"iphone-14-pro-max","name":"iPhone 14 Pro Max","price":520,"desc":"6.7-inch display, A16 Bionic, Pro Max camera","image":"images/14 promax.png"},
  {"id":"iphone-15","name":"iPhone 15","price":450,"desc":"6.1-inch display, A17 Bionic","image":"images/15.png"},
  {"id":"iphone-15-plus","name":"iPhone 15 Plus","price":530,"desc":"6.7-inch display, A17 Bionic","image":"images/15 plus.png"},
  {"id":"iphone-15-pro","name":"iPhone 15 Pro","price":580,"desc":"6.1-inch display, A17 Bionic, Pro camera","image":"images/15 pro.png"},
  {"id":"iphone-15-pro-max","name":"iPhone 15 Pro Max","price":680,"desc":"6.7-inch display, A17 Bionic, Pro Max camera","image":"images/15 promax.png"},
  {"id":"iphone-16","name":"iPhone 16","price":660,"desc":"6.1-inch display, A18 Bionic","image":"images/16.png"},
  {"id":"iphone-16-plus","name":"iPhone 16 Plus","price":1099,"desc":"6.7-inch display, A18 Bionic","image":"images/16 plus.png"},
  {"id":"iphone-16-pro","name":"iPhone 16 Pro","price":1199,"desc":"6.1-inch display, A18 Bionic, Pro camera","image":"images/16 pro.png"},
  {"id":"iphone-16-pro-max","name":"iPhone 16 Pro Max","price":1130,"desc":"6.9-inch display, A18 Bionic, Pro Max camera","image":"images/16 promax.png"},
  {"id":"iphone-17","name":"iPhone 17","price":1099,"desc":"6.1-inch display, A19 Bionic","image":"images/17.png"},
  {"id":"iphone-17-plus","name":"iPhone 17 Plus","price":1199,"desc":"6.7-inch display, A19 Bionic","image":"images/17.png"},
  {"id":"iphone-17-pro","name":"iPhone 17 Pro","price":1299,"desc":"6.1-inch display, A19 Bionic, Pro camera","image":"images/17.png"},
  {"id":"iphone-17-pro-max","name":"iPhone 17 Pro Max","price":1299,"desc":"6.9-inch display, A19 Bionic, Pro Max","image":"images/17.png"},
  {"id":"camera-lens-kit","name":"Pro Camera Lens Kit","price":89,"desc":"Attachable wide-angle and macro lenses for sharper photos.","image":"images/camera lenses.jpeg"},
  {"id":"silicone-cover","name":"Silicone Protection Cover","price":29,"desc":"Soft-touch silicone case with raised edges for everyday protection.","image":"images/silicon covers.jpeg"},
  {"id":"screen-protector","name":"Tempered Glass Protector","price":19,"desc":"Crystal-clear glass screen protector for scratch resistance.","image":"images/backglasses.jpeg"}
];
let products = [];
const root = document.documentElement;
let cart = JSON.parse(localStorage.getItem('cart')||'{}');
let bgIndex = 0;

function fmt(n){return n.toFixed(2)}

async function load() {
  try {
    const res = await fetch(PRODUCTS_URL);
    if (!res.ok) throw new Error('Fetch failed');
    products = await res.json();
  } catch (err) {
    products = INLINE_PRODUCTS;
  }
  if (document.body.classList.contains('home')) {
    const featured = getHomeFeaturedProducts();
    renderProducts(featured);
    setHeroProduct(featured[0] || products[0] || INLINE_PRODUCTS[0]);
    setHeroBackgroundRotation(featured);
  } else {
    renderProducts();
    setHeroProduct(products[0] || INLINE_PRODUCTS[0]);
  }
  updateCartUI();
  setPageBackgroundRotation();
}

function getHomeFeaturedProducts(){
  const curatedIds = ['iphone-13','iphone-15-pro','iphone-16-pro'];
  const curated = curatedIds.map(id => products.find(p => p.id === id)).filter(Boolean);
  if (curated.length >= 4) return curated;
  const others = products.filter(p => !curated.includes(p));
  return [...curated, ...others].slice(0, 4);
}

function setHeroProduct(product){
  if (!product) return;
  const imageUrl = product.image || '';
  root.style.setProperty('--hero-screen-image', `url('${imageUrl}')`);
  root.style.setProperty('--hero-hero-image', `url('${imageUrl}')`);
  const label = document.querySelector('.hero-model');
  if(label) label.textContent = product.name;
}

function setPageBackgroundRotation(){
  const gallery = getBackgroundGallery();
  if (!gallery.length) return;
  function setBg(){
    const item = gallery[bgIndex % gallery.length];
    root.style.setProperty('--page-bg-image', `url('${item.image}')`);
    bgIndex += 1;
  }
  setBg();
  setInterval(setBg, 9000);
}

function setHeroBackgroundRotation(featured){
  let heroIndex = 0;
  if (!featured || !featured.length) return;
  const heroRoot = document.documentElement;
  function animateHero(){
    const item = featured[heroIndex % featured.length];
    heroRoot.style.setProperty('--hero-media-image', `url('${item.image}')`);
    heroRoot.style.setProperty('--hero-screen-image', `url('${item.image}')`);
    heroRoot.style.setProperty('--hero-hero-image', `url('${item.image}')`);
    const label = document.querySelector('.hero-model');
    if (label) label.textContent = item.name;
    heroIndex += 1;
  }
  animateHero();
  setInterval(animateHero, 7000);
}

function getBackgroundGallery(){
  return products.length ? products : INLINE_PRODUCTS;
}

function renderProducts(limit){
  const container = document.getElementById('products');
  container.innerHTML = '';
  const featured = Array.isArray(limit)
    ? limit
    : (typeof limit === 'number' ? products.slice(0, limit) : products);
  if (document.body.classList.contains('home')) {
    const bgImage = featured[0] ? featured[0].image : '';
    root.style.setProperty('--hero-media-image', `url('${bgImage}')`);
  }
  featured.forEach(p=>{
    const el = document.createElement('article');
    el.className='product';
    // build color swatches if available
    let colorsHtml = '';
    if (p.colors && Array.isArray(p.colors) && p.colors.length){
      colorsHtml = `<div class="colors">` + p.colors.map(c=>`<button class="color-swatch" data-color="${c.name}" title="${c.name}" style="background:${c.hex}"></button>`).join('') + `</div>`;
    }

    el.innerHTML = `
      <div class="product-bg">
        <img class="product-img" src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.onerror=null;this.src='images/iphone-13.png'" />
      </div>
      <div class="product-glass">
        <h3>${p.name}</h3>
        <p>${p.desc}</p>
        <div class="price">$${fmt(p.price)}</div>
        ${colorsHtml}
        <div class="actions"><button class="button button-primary add-button" data-id="${p.id}">Add to cart</button> <button class="button button-outline view-details" data-id="${p.id}">View 360°</button></div>
      </div>
    `;
    container.appendChild(el);

    // wire up color swatches default selection
    if (p.colors && p.colors.length){
      el.dataset.defaultColor = p.colors[0].name;
      el.dataset.selectedColor = p.colors[0].name;
      const swatches = el.querySelectorAll('.color-swatch');
      swatches.forEach((s, idx)=>{
        s.addEventListener('click', (ev)=>{
          swatches.forEach(x=>x.classList.remove('selected'));
          ev.currentTarget.classList.add('selected');
          el.dataset.selectedColor = ev.currentTarget.dataset.color;
        });
        if (idx===0) s.classList.add('selected');
      });
    }
  });
  container.querySelectorAll('button.add-button').forEach(b=>b.addEventListener('click',onAdd));
  container.querySelectorAll('button.view-details').forEach(b=>b.addEventListener('click',e=>{
    const product = products.find(x=>x.id===e.currentTarget.dataset.id);
    openProductViewer(product);
  }));
}

function onAdd(e){
  const id = e.currentTarget.dataset.id;
  const productEl = e.currentTarget.closest('.product');
  const selectedColor = productEl ? (productEl.dataset.selectedColor || productEl.dataset.defaultColor || '') : '';
  const key = selectedColor ? `${id}::${selectedColor}` : id;
  cart[key] = (cart[key]||0)+1;
  saveCart();
  updateCartUI();
}

function saveCart(){localStorage.setItem('cart',JSON.stringify(cart))}

function clearCart(){
  cart = {};
  saveCart();
  updateCartUI();
}


let viewerRotation = 0;
let viewerSpinInterval = null;
let viewerDrag = {active:false,startX:0,startRotation:0};

function openProductViewer(product){
  if(!product) return;
  document.getElementById('viewer-title').textContent = product.name;
  document.getElementById('viewer-description').textContent = product.desc;
  document.getElementById('viewer-price').textContent = `$${fmt(product.price)}`;
  const front = document.getElementById('viewer-front');
  const back = document.getElementById('viewer-back');
  const src = product.image || '';
  front.src = src;
  back.src = src;
  front.alt = `${product.name} front view`;
  back.alt = `${product.name} back view`;
  viewerRotation = 0;
  updateViewerRotation();
  const rotateBtn = document.getElementById('rotate-button');
  if (rotateBtn) rotateBtn.textContent = 'Rotate 360°';
  document.getElementById('viewer-modal').classList.remove('hidden');
}

function closeProductViewer(){
  document.getElementById('viewer-modal').classList.add('hidden');
  stopViewerSpin();
}

function updateViewerRotation(){
  const inner = document.getElementById('viewer-inner');
  if (!inner) return;
  inner.style.transform = `rotateY(${viewerRotation}deg)`;
}

function startViewerSpin(){
  if (viewerSpinInterval) return;
  const button = document.getElementById('rotate-button');
  button.textContent = 'Stop rotation';
  viewerSpinInterval = setInterval(()=>{
    viewerRotation = (viewerRotation + 2) % 360;
    updateViewerRotation();
  }, 16);
}

function stopViewerSpin(){
  if (!viewerSpinInterval) return;
  clearInterval(viewerSpinInterval);
  viewerSpinInterval = null;
  const button = document.getElementById('rotate-button');
  if (button) button.textContent = 'Rotate 360°';
}

function initViewerControls(){
  const stage = document.getElementById('viewer-stage');
  if (!stage) return;
  stage.addEventListener('pointerdown', e => {
    e.preventDefault();
    stopViewerSpin();
    viewerDrag.active = true;
    viewerDrag.startX = e.clientX;
    viewerDrag.startRotation = viewerRotation;
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', e => {
    if (!viewerDrag.active) return;
    const delta = e.clientX - viewerDrag.startX;
    viewerRotation = viewerDrag.startRotation + delta * 0.45;
    updateViewerRotation();
  });
  ['pointerup','pointercancel','pointerleave'].forEach(evt => {
    stage.addEventListener(evt, e => {
      viewerDrag.active = false;
      if (e.pointerId && stage.hasPointerCapture(e.pointerId)) {
        stage.releasePointerCapture(e.pointerId);
      }
    });
  });
}

function toggleViewerRotation(){
  if (viewerSpinInterval) stopViewerSpin();
  else startViewerSpin();
}

function updateHeroScroll(){
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const rect = hero.getBoundingClientRect();
  const start = window.innerHeight * 0.8;
  const end = -rect.height * 0.3;
  const progress = Math.min(Math.max((start - rect.top) / (start - end),0),1);
  const rotateY = 18 - progress * 36;
  const rotateX = 16 - progress * 12;
  const translateY = progress * -36;
  const deconstruct = progress;
  if (products.length){
    const heroIndex = Math.min(products.length - 1, Math.floor(progress * products.length));
    setHeroProduct(products[heroIndex]);
  }
  root.style.setProperty('--hero-rotate-y', `${rotateY}deg`);
  root.style.setProperty('--hero-rotate-x', `${rotateX}deg`);
  root.style.setProperty('--hero-translate-y', `${translateY}px`);
  root.style.setProperty('--hero-deconstruct', deconstruct);
}

function updateCartUI(){
  const count = Object.values(cart).reduce((s,v)=>s+v,0);
  document.getElementById('cart-count').textContent = count;
  const list = document.getElementById('cart-list');
  list.innerHTML = '';
  let total = 0;
  for(const id in cart){
    const qty = cart[id];
    const parts = id.split('::');
    const baseId = parts[0];
    const color = parts[1] || '';
    const p = products.find(x=>x.id===baseId) || {name:baseId,price:0};
    total += (p.price||0)*qty;
    const li = document.createElement('li');
    li.innerHTML = `<span>${p.name}${color? ' ('+color+')':''} × ${qty}</span><span>$${fmt((p.price||0)*qty)}</span>`;
    list.appendChild(li);
  }
  document.getElementById('cart-total').textContent = fmt(total);
}

document.addEventListener('DOMContentLoaded',()=>{
  window.scrollTo(0,0);
  load();
  updateHeroScroll();
  window.addEventListener('scroll', updateHeroScroll);
  window.addEventListener('resize', updateHeroScroll);
  const cartBtn = document.getElementById('cart-btn');
  const cartModal = document.getElementById('cart-modal');
  const closeCart = document.getElementById('close-cart');
  const checkoutBtn = document.getElementById('checkout-btn');
  const checkoutModal = document.getElementById('checkout-modal');
  const closeCheckout = document.getElementById('close-checkout');

  // make the phone shell glow for emphasis
  const phoneShell = document.querySelector('.phone-shell');
  if (phoneShell) phoneShell.classList.add('animate-glow');

  // CTA scroll to products
  const shopNow = document.getElementById('shop-now');
  if (shopNow) shopNow.addEventListener('click', ()=>{
    const productsEl = document.getElementById('products');
    if (productsEl) productsEl.scrollIntoView({behavior:'smooth'});
  });

  cartBtn.addEventListener('click',()=>cartModal.classList.remove('hidden'));

  const clearCartBtn = document.getElementById('clear-cart-btn');
  if (clearCartBtn){
    clearCartBtn.addEventListener('click', ()=>{
      clearCart();
      cartModal && cartModal.classList.add('hidden');
    });
  }
  closeCart.addEventListener('click',()=>cartModal.classList.add('hidden'));
  checkoutBtn.addEventListener('click',()=>{cartModal.classList.add('hidden'); checkoutModal.classList.remove('hidden')});
  closeCheckout.addEventListener('click',()=>checkoutModal.classList.add('hidden'));
  document.getElementById('close-viewer').addEventListener('click', closeProductViewer);
  document.getElementById('rotate-button').addEventListener('click', toggleViewerRotation);
  initViewerControls();

  document.getElementById('checkout-form').addEventListener('submit',e=>{
    e.preventDefault();
    alert('Order placed (demo). Thank you!');
    cart = {};
    saveCart();
    updateCartUI();
    checkoutModal.classList.add('hidden');
  });
});
