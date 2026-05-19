document.addEventListener('DOMContentLoaded', () => {
    // Navbar scroll effect
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Mobile menu toggle
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    const mobileNav = document.querySelector('.mobile-nav');
    const mobileLinks = document.querySelectorAll('.mobile-nav-link');

    mobileBtn.addEventListener('click', () => {
        mobileNav.classList.toggle('active');
        // Animate hamburger to X (simple implementation)
        const spans = mobileBtn.querySelectorAll('span');
        if(mobileNav.classList.contains('active')) {
            spans[0].style.transform = 'translateY(4px) rotate(45deg)';
            spans[1].style.transform = 'translateY(-4px) rotate(-45deg)';
        } else {
            spans[0].style.transform = 'none';
            spans[1].style.transform = 'none';
        }
    });

    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileNav.classList.remove('active');
            const spans = mobileBtn.querySelectorAll('span');
            spans[0].style.transform = 'none';
            spans[1].style.transform = 'none';
        });
    });

    // Simple scroll reveal for sections
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
        if(section.id !== 'hero') { // Hero has its own initial animation
            section.style.opacity = '0';
            section.style.transform = 'translateY(30px)';
            section.style.transition = 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
            observer.observe(section);
        }
    });

    // --- Storefront Products ---
    const PRODUCTS_KEY = 'vanta_products';
    
    function getProducts() {
        try {
            let products = JSON.parse(localStorage.getItem(PRODUCTS_KEY));
            if (!localStorage.getItem('vanta_seeded') && (!products || products.length === 0)) {
                products = [
                    { id: 'p1', name: 'Void Overcast Hoodie', price: 120, image: 'images/product-hoodie.png', status: 'active', stock: { S: 12, M: 25, L: 18, XL: 8 } },
                    { id: 'p2', name: 'Dark Matter Graphic Tee', price: 55, image: 'images/product-hoodie.png', status: 'active', stock: { S: 30, M: 40, L: 35, XL: 20 } },
                    { id: 'p3', name: 'Tactical Utility Cargo', price: 145, image: 'images/product-hoodie.png', status: 'active', stock: { S: 5, M: 10, L: 8, XL: 3 } },
                    { id: 'p4', name: 'Singularity Cap', price: 40, image: 'images/product-hoodie.png', status: 'active', stock: { S: 0, M: 0, L: 50, XL: 0 } }
                ];
                localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
                localStorage.setItem('vanta_seeded', 'true');
            } else if (!products) {
                products = [];
            }
            return products.filter(p => p.status === 'active');
        } catch {
            return [];
        }
    }

    window.getProducts = getProducts; // Export to be usable by update logic

    function renderStoreProducts() {
        const grid = document.getElementById('product-grid');
        if (!grid) return;
        const products = getProducts();
        
        if (products.length === 0) {
            grid.innerHTML = '<p style="color:var(--text-muted); grid-column: 1/-1; text-align: center;">No products available right now.</p>';
            return;
        }

        grid.innerHTML = products.map(p => {
            const stock = p.stock || { S: 0, M: 0, L: 0, XL: 0 };
            const totalStock = stock.S + stock.M + stock.L + stock.XL;
            const isOut = totalStock === 0;

            let sizeOptions = '';
            if (!isOut) {
                ['S', 'M', 'L', 'XL'].forEach(sz => {
                    if (stock[sz] > 0) sizeOptions += `<option value="${sz}">${sz}</option>`;
                });
            }

            const actionHtml = isOut 
                ? `<button class="quick-add disabled" disabled style="background:var(--bg-alt); color:var(--text-muted); cursor:not-allowed;">Sold Out</button>`
                : `
                   <div class="product-actions-wrap" style="display:flex; width:100%; gap:5px;">
                       <select class="size-select" id="size-${p.id}" style="width:35%; background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.2); color:white; padding:0.5rem; text-align:center; border-radius:4px; font-family:var(--font-primary); font-weight:600;">${sizeOptions}</select>
                       <button class="quick-add" data-id="${p.id}" data-name="${p.name}" data-price="${p.price}" data-image="${p.image || 'images/product-hoodie.png'}" style="width:65%;">Add to Cart</button>
                   </div>
                  `;

            return `
            <div class="product-card">
                <div class="product-image-wrap">
                    <img src="${p.image || 'images/product-hoodie.png'}" alt="${p.name}" class="product-image" style="object-fit: cover; width: 100%; height: 100%;">
                    <div class="product-overlay">
                        ${actionHtml}
                    </div>
                </div>
                <div class="product-info">
                    <h3 class="product-name">${p.name}</h3>
                    <p class="product-price">$${p.price.toLocaleString()}</p>
                </div>
            </div>
            `;
        }).join('');
    }

    renderStoreProducts();

    // --- Cart System ---
    const CART_STORAGE_KEY = 'vanta_cart';
    let cart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];

    const cartIcon = document.getElementById('cart-icon');
    const cartIconMobile = document.getElementById('cart-icon-mobile');
    const cartSidebar = document.getElementById('cart-sidebar');
    const cartOverlay = document.getElementById('cart-overlay');
    const closeCartBtn = document.getElementById('close-cart');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalEl = document.getElementById('cart-total');
    const cartBadge = document.getElementById('cart-badge');
    const cartBadgeMobile = document.getElementById('cart-badge-mobile');
    const checkoutBtn = document.getElementById('checkout-btn');
    const quickAddBtns = document.querySelectorAll('.quick-add');

    function saveCart() {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    }

    function toggleCart(e) {
        if(e) e.preventDefault();
        cartSidebar.classList.toggle('active');
        cartOverlay.classList.toggle('active');
    }

    function showToast(msg) {
        const c = document.getElementById('toastContainer');
        const t = document.createElement('div');
        t.className = 'toast';
        t.textContent = msg;
        c.appendChild(t);
        setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3000);
    }

    function updateCartUI() {
        cartItemsContainer.innerHTML = '';
        let total = 0;
        let count = 0;

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p class="empty-cart-msg">Your void is empty.</p>';
        } else {
            cart.forEach((item, index) => {
                total += item.price * item.quantity;
                count += item.quantity;

                const el = document.createElement('div');
                el.className = 'cart-item';
                el.innerHTML = `
                    <img src="${item.image}" alt="${item.name}" class="cart-item-img">
                    <div class="cart-item-details">
                        <div class="cart-item-title">${item.name} <span style="color:var(--text-muted); font-size: 0.85rem;">(${item.size})</span></div>
                        <div class="cart-item-price">$${item.price}</div>
                        <div class="cart-item-actions">
                            <div class="qty-controls">
                                <button class="qty-btn minus" data-index="${index}">-</button>
                                <span class="qty-display">${item.quantity}</span>
                                <button class="qty-btn plus" data-index="${index}">+</button>
                            </div>
                            <button class="remove-item" data-index="${index}">Remove</button>
                        </div>
                    </div>
                `;
                cartItemsContainer.appendChild(el);
            });
        }

        cartTotalEl.textContent = '$' + total.toLocaleString();
        
        if (count > 0) {
            cartBadge.style.display = 'flex';
            cartBadge.textContent = count;
            cartBadgeMobile.textContent = count;
        } else {
            cartBadge.style.display = 'none';
            cartBadgeMobile.textContent = '0';
        }

        document.querySelectorAll('.qty-btn.plus').forEach(btn => {
            btn.addEventListener('click', (e) => updateQuantity(e.target.dataset.index, 1));
        });
        document.querySelectorAll('.qty-btn.minus').forEach(btn => {
            btn.addEventListener('click', (e) => updateQuantity(e.target.dataset.index, -1));
        });
        document.querySelectorAll('.remove-item').forEach(btn => {
            btn.addEventListener('click', (e) => removeFromCart(e.target.dataset.index));
        });
    }

    function addToCart(product, size) {
        const existingItem = cart.find(item => item.id === product.id && item.size === size);
        
        // Validate stock
        let currentProducts = window.getProducts();
        let prodData = currentProducts.find(p => p.id === product.id);
        let stockAvailable = prodData && prodData.stock ? prodData.stock[size] : 0;
        let currentQty = existingItem ? existingItem.quantity : 0;
        
        if (currentQty >= stockAvailable) {
            const c = document.getElementById('toastContainer');
            const t = document.createElement('div');
            t.className = 'toast error';
            t.textContent = 'Not enough stock available for this size';
            c.appendChild(t);
            setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3000);
            return;
        }

        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({ ...product, size, quantity: 1 });
        }
        saveCart();
        updateCartUI();
        showToast(`${product.name} (${size}) added to cart`);
        
        if (!cartSidebar.classList.contains('active')) {
            toggleCart();
        }
    }

    function updateQuantity(index, change) {
        const item = cart[index];
        if (item) {
            if (change > 0) {
                let currentProducts = window.getProducts();
                let prodData = currentProducts.find(p => p.id === item.id);
                let stockAvailable = prodData && prodData.stock ? prodData.stock[item.size] : 0;
                if (item.quantity + change > stockAvailable) {
                    showToast('Maximum stock limit reached');
                    return;
                }
            }

            item.quantity += change;
            if (item.quantity <= 0) {
                removeFromCart(index);
            } else {
                saveCart();
                updateCartUI();
            }
        }
    }

    function removeFromCart(index) {
        cart.splice(index, 1);
        saveCart();
        updateCartUI();
    }

    // Event Listeners
    if(cartIcon) cartIcon.addEventListener('click', toggleCart);
    if(cartIconMobile) cartIconMobile.addEventListener('click', toggleCart);
    if(closeCartBtn) closeCartBtn.addEventListener('click', toggleCart);
    if(cartOverlay) cartOverlay.addEventListener('click', toggleCart);

    const productGrid = document.getElementById('product-grid');
    if (productGrid) {
        productGrid.addEventListener('click', (e) => {
            if (e.target.classList.contains('quick-add') && !e.target.disabled) {
                const el = e.target;
                const sizeSelect = document.getElementById(`size-${el.dataset.id}`);
                const size = sizeSelect ? sizeSelect.value : 'M';
                
                const product = {
                    id: el.dataset.id,
                    name: el.dataset.name,
                    price: parseFloat(el.dataset.price),
                    image: el.dataset.image
                };
                addToCart(product, size);
            }
        });
    }

    if(checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            if(cart.length === 0) return;
            
            checkoutBtn.textContent = 'Processing...';
            checkoutBtn.disabled = true;
            checkoutBtn.style.opacity = '0.7';
            
            setTimeout(() => {
                // Update Inventory
                let products = [];
                try { products = JSON.parse(localStorage.getItem(PRODUCTS_KEY)) || []; } catch(e) {}
                
                if (products.length === 0) {
                    // Seed fallback products if missing in localstorage so we can deduct
                    products = window.getProducts(); 
                }

                cart.forEach(cartItem => {
                    let p = products.find(prod => prod.id === cartItem.id);
                    if (p && p.stock) {
                        p.stock[cartItem.size] = Math.max(0, p.stock[cartItem.size] - cartItem.quantity);
                    }
                });
                localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
                
                // Create Order
                const ORDERS_KEY = 'vanta_orders';
                let orders = [];
                try { orders = JSON.parse(localStorage.getItem(ORDERS_KEY)) || []; } catch(e) {}
                
                const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                const orderItems = cart.map(item => ({ name: item.name, qty: item.quantity, size: item.size }));
                
                const newOrder = {
                    id: 'ORD-' + (1000 + orders.length + 1),
                    customer: 'Guest User',
                    items: orderItems,
                    total: total,
                    date: new Date().toISOString().split('T')[0],
                    status: 'pending'
                };
                
                orders.unshift(newOrder);
                localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
                
                // Clear Cart
                cart = [];
                saveCart();
                updateCartUI();
                renderStoreProducts(); // re-render grid to update stock UI (Sold out states)
                toggleCart();
                showToast('Checkout successful! Order placed.');
                
                checkoutBtn.textContent = 'Checkout';
                checkoutBtn.disabled = false;
                checkoutBtn.style.opacity = '1';
            }, 1200);
        });
    }

    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            showToast('Subscribed to the void!');
            contactForm.reset();
        });
    }

    // Initial render
    updateCartUI();
});
