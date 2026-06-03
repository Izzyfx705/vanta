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

    // --- Storefront Products (Firebase powered) ---
    let liveProducts = []; // Updated by real-time listener

    function renderStoreProducts() {
        const grid = document.getElementById('product-grid');
        if (!grid) return;
        const products = liveProducts.filter(p => p.status === 'active');
        
        if (products.length === 0) {
            grid.innerHTML = '<p style="color:var(--text-muted); grid-column: 1/-1; text-align: center;">No products available right now.</p>';
            return;
        }

        grid.innerHTML = products.map(p => {
            const stock = p.stock || { S: 0, M: 0, L: 0, XL: 0 };
            const ts = (stock.S || 0) + (stock.M || 0) + (stock.L || 0) + (stock.XL || 0);
            const isOut = ts === 0;

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
            <div class="product-card" data-id="${p.id}" style="cursor:pointer">
                <div class="product-image-wrap">
                    <img src="${p.image || 'images/product-hoodie.png'}" alt="${p.name}" class="product-image" style="object-fit: cover; width: 100%; height: 100%;">
                    <div class="product-overlay">
                        ${actionHtml}
                    </div>
                </div>
                <div class="product-info">
                    <h3 class="product-name">${p.name}</h3>
                    <p class="product-price">₦${p.price.toLocaleString()}</p>
                </div>
            </div>
            `;
        }).join('');
    }

    // Set up real-time listener so storefront updates live when admin adds/edits products
    VantaDB.onProductsChange((products) => {
        liveProducts = products;
        renderStoreProducts();
    });

    // --- Cart System (stays in localStorage — it's per-user/session) ---
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
                        <div class="cart-item-price">₦${item.price}</div>
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

        cartTotalEl.textContent = '₦' + total.toLocaleString();
        
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

    function getProductStock(productId, size) {
        const p = liveProducts.find(pr => pr.id === productId);
        return p && p.stock ? (p.stock[size] || 0) : 0;
    }

    function addToCart(product, size) {
        const existingItem = cart.find(item => item.id === product.id && item.size === size);
        
        // Validate stock from live Firestore data
        let stockAvailable = getProductStock(product.id, size);
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
                let stockAvailable = getProductStock(item.id, item.size);
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
            if (e.target.closest('.quick-add')) {
                const el = e.target.closest('.quick-add');
                if (!el.disabled) {
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
                return;
            }

            if (e.target.closest('.size-select')) {
                return;
            }

            const card = e.target.closest('.product-card');
            if (card) {
                const id = card.dataset.id;
                const product = liveProducts.find(p => p.id === id);
                if (product) {
                    openProductModal(product);
                }
            }
        });
    }

    // --- Secure Checkout Modal System ---
    const checkoutModalOverlay = document.getElementById('checkout-modal-overlay');
    const closeCheckoutBtn = document.getElementById('close-checkout');
    const checkoutForm = document.getElementById('checkout-form');
    const btnToPayment = document.getElementById('btn-to-payment');
    const btnBackToShipping = document.getElementById('btn-back-to-shipping');
    const stepShippingPanel = document.getElementById('step-shipping-panel');
    const stepPaymentPanel = document.getElementById('step-payment-panel');
    const stepShippingIndicator = document.getElementById('step-shipping-indicator');
    const stepPaymentIndicator = document.getElementById('step-payment-indicator');
    const checkoutSummaryItems = document.getElementById('checkout-summary-items');
    const checkoutSubtotal = document.getElementById('checkout-subtotal');
    const checkoutShipping = document.getElementById('checkout-shipping');
    const checkoutTotal = document.getElementById('checkout-total');
    const checkoutSuccessView = document.getElementById('checkout-success-view');
    const successOrderId = document.getElementById('success-order-id');
    const successOrderTotal = document.getElementById('success-order-total');
    const successEmail = document.getElementById('success-email');
    const btnCloseSuccess = document.getElementById('btn-close-success');
    
    // Step panels navigation
    if (btnToPayment) {
        btnToPayment.addEventListener('click', () => {
            const email = document.getElementById('checkout-email');
            const name = document.getElementById('checkout-name');
            const address = document.getElementById('checkout-address');
            const city = document.getElementById('checkout-city');
            const zip = document.getElementById('checkout-zip');
            const country = document.getElementById('checkout-country');
            
            if (!email.checkValidity()) { email.reportValidity(); return; }
            if (!name.checkValidity()) { name.reportValidity(); return; }
            if (!address.checkValidity()) { address.reportValidity(); return; }
            if (!city.checkValidity()) { city.reportValidity(); return; }
            if (!zip.checkValidity()) { zip.reportValidity(); return; }
            if (!country.checkValidity()) { country.reportValidity(); return; }
            
            // Populate Step 2 review details
            const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const shipping = subtotal > 150 ? 0 : 10;
            const total = subtotal + shipping;

            const summaryCustomer = document.getElementById('payment-summary-customer');
            const summaryAddress = document.getElementById('payment-summary-address');
            const summaryTotal = document.getElementById('payment-summary-total');

            if (summaryCustomer) {
                summaryCustomer.textContent = `${name.value.trim()} (${email.value.trim()})`;
            }
            if (summaryAddress) {
                summaryAddress.textContent = `${address.value.trim()}, ${city.value.trim()} ${zip.value.trim()}, ${country.value}`;
            }
            if (summaryTotal) {
                summaryTotal.textContent = `₦${total.toLocaleString()}`;
            }

            stepShippingPanel.classList.remove('active');
            stepPaymentPanel.classList.add('active');
            stepShippingIndicator.classList.remove('active');
            stepPaymentIndicator.classList.add('active');
        });
    }

    if (btnBackToShipping) {
        btnBackToShipping.addEventListener('click', () => {
            stepPaymentPanel.classList.remove('active');
            stepShippingPanel.classList.add('active');
            stepPaymentIndicator.classList.remove('active');
            stepShippingIndicator.classList.add('active');
        });
    }

    function updateCheckoutSummaryUI() {
        if (!checkoutSummaryItems) return;
        checkoutSummaryItems.innerHTML = cart.map(item => `
            <div class="checkout-summary-item">
                <img src="${item.image || 'images/logo-icon.png'}" alt="${item.name}" class="summary-item-img">
                <div class="summary-item-info">
                    <div class="summary-item-name">${item.name}</div>
                    <div class="summary-item-meta">Size: ${item.size} | Qty: ${item.quantity}</div>
                </div>
                <div class="summary-item-price">₦${item.price * item.quantity}</div>
            </div>
        `).join('');
        
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const shipping = subtotal > 150 ? 0 : 10;
        const total = subtotal + shipping;
        
        checkoutSubtotal.textContent = `₦${subtotal.toLocaleString()}`;
        checkoutShipping.textContent = shipping === 0 ? 'FREE' : `₦${shipping.toFixed(2)}`;
        checkoutTotal.textContent = `₦${total.toLocaleString()}`;
    }

    function openCheckout() {
        if (cart.length === 0) return;
        
        // Hide cart sidebar
        cartSidebar.classList.remove('active');
        cartOverlay.classList.remove('active');
        
        // Open checkout modal
        checkoutModalOverlay.classList.add('active');
        updateCheckoutSummaryUI();
    }

    function closeCheckout() {
        checkoutModalOverlay.classList.remove('active');
        // Reset panels to default step 1
        stepPaymentPanel.classList.remove('active');
        stepShippingPanel.classList.add('active');
        stepPaymentIndicator.classList.remove('active');
        stepShippingIndicator.classList.add('active');
        checkoutSuccessView.classList.remove('active');
        checkoutForm.reset();
    }

    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', openCheckout);
    }
    if (closeCheckoutBtn) {
        closeCheckoutBtn.addEventListener('click', closeCheckout);
    }
    if (checkoutModalOverlay) {
        checkoutModalOverlay.addEventListener('click', (e) => {
            if (e.target === checkoutModalOverlay) closeCheckout();
        });
    }
    if (btnCloseSuccess) {
        btnCloseSuccess.addEventListener('click', closeCheckout);
    }

    if (checkoutForm) {
        checkoutForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btnPlaceOrder = document.getElementById('btn-place-order');
            btnPlaceOrder.disabled = true;
            btnPlaceOrder.textContent = 'Initializing Paystack...';
            
            try {
                // Check stock before charging the user
                for (const cartItem of cart) {
                    const product = liveProducts.find(p => p.id === cartItem.id);
                    if (product && product.stock) {
                        const availableStock = product.stock[cartItem.size] || 0;
                        if (availableStock < cartItem.quantity) {
                            showToast(`Error: ${product.name} in size ${cartItem.size} is out of stock.`, 'error');
                            btnPlaceOrder.disabled = false;
                            btnPlaceOrder.textContent = 'Pay with Paystack';
                            return;
                        }
                    }
                }
                
                const orders = await VantaDB.getOrders();
                const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                const shipping = subtotal > 150 ? 0 : 10;
                const total = subtotal + shipping;
                const orderItems = cart.map(item => ({ name: item.name, qty: item.quantity, size: item.size }));
                
                const customerName = document.getElementById('checkout-name').value.trim();
                const customerEmail = document.getElementById('checkout-email').value.trim();
                const orderId = 'ORD-' + (1000 + orders.length + 1);

                // Initialize Paystack Inline Pop-up
                if (typeof PaystackPop === 'undefined') {
                    showToast('Payment gateway failed to load. Please refresh the page.', 'error');
                    btnPlaceOrder.disabled = false;
                    btnPlaceOrder.textContent = 'Pay with Paystack';
                    return;
                }

                const paystackKey = (typeof PAYMENT_CONFIG !== 'undefined' && PAYMENT_CONFIG.publicKey) || 'pk_live_1edd26841ca8b73279796986a1063e2c4ef8f43b';
                const paystackHandler = PaystackPop.setup({
                    key: paystackKey,
                    email: customerEmail,
                    amount: total * 100, // Paystack expects amount in kobo (kobo = Naira * 100)
                    currency: 'NGN',
                    ref: `${orderId}-${Date.now()}`,
                    callback: async (response) => {
                        btnPlaceOrder.textContent = 'Recording Order...';
                        try {
                            // Deduct stock in Supabase
                            for (const cartItem of cart) {
                                const product = liveProducts.find(p => p.id === cartItem.id);
                                if (product && product.stock) {
                                    const newStock = { ...product.stock };
                                    newStock[cartItem.size] = Math.max(0, (newStock[cartItem.size] || 0) - cartItem.quantity);
                                    await VantaDB.updateProductStock(product.id, newStock);
                                }
                            }
                            
                            // Save Order to Supabase, embedding Paystack payment ref inside customer field securely
                            const newOrder = {
                                id: orderId,
                                customer: `${customerName} [Paystack: ${response.reference}] (${customerEmail})`,
                                items: orderItems,
                                total: total,
                                date: new Date().toISOString().split('T')[0],
                                status: 'pending'
                            };
                            
                            const success = await VantaDB.saveOrder(newOrder);
                            if (success) {
                                successOrderId.textContent = orderId;
                                successOrderTotal.textContent = `₦${total.toLocaleString()}`;
                                successEmail.textContent = customerEmail;
                                
                                checkoutSuccessView.classList.add('active');
                                
                                // Clear cart
                                cart = [];
                                saveCart();
                                updateCartUI();
                                showToast('Transaction successful! Order logged.');
                            } else {
                                showToast('Failed to save order to database. Reference: ' + response.reference, 'error');
                            }
                        } catch (err) {
                            console.error('Checkout recording error:', err);
                            showToast('Failed to complete checkout record. Reference: ' + response.reference, 'error');
                        } finally {
                            btnPlaceOrder.disabled = false;
                            btnPlaceOrder.textContent = 'Pay with Paystack';
                        }
                    },
                    onClose: () => {
                        showToast('Transaction cancelled by user.', 'error');
                        btnPlaceOrder.disabled = false;
                        btnPlaceOrder.textContent = 'Pay with Paystack';
                    }
                });

                paystackHandler.openIframe();

            } catch (err) {
                console.error('Checkout initializing error:', err);
                showToast('Checkout initialization failed.', 'error');
                btnPlaceOrder.disabled = false;
                btnPlaceOrder.textContent = 'Pay with Paystack';
            }
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

    // --- Product Detail Modal & Slideshow Gallery ---
    const productModalOverlay = document.getElementById('product-modal-overlay');
    const closeProductModalBtn = document.getElementById('close-product-modal');
    const modalMainImg = document.getElementById('product-modal-main-img');
    const modalThumbnails = document.getElementById('product-modal-thumbnails');
    const modalCategory = document.getElementById('product-modal-category');
    const modalTitle = document.getElementById('product-modal-title');
    const modalPrice = document.getElementById('product-modal-price');
    const modalDesc = document.getElementById('product-modal-desc');
    const modalSizeButtons = document.getElementById('modal-size-buttons');
    const modalStockIndicator = document.getElementById('modal-stock-indicator');
    const modalAddToCartBtn = document.getElementById('modal-add-to-cart-btn');
    const galleryPrevBtn = document.getElementById('gallery-prev-btn');
    const galleryNextBtn = document.getElementById('gallery-next-btn');

    let currentProduct = null;
    let currentImages = [];
    let activeImageIdx = 0;
    let selectedSize = '';

    function openProductModal(product) {
        currentProduct = product;
        
        // Support multiple images if available, fallback to single image
        if (product.images && product.images.length > 0) {
            currentImages = [...product.images];
        } else {
            currentImages = [product.image || 'images/product-hoodie.png'];
        }

        activeImageIdx = 0;
        selectedSize = '';
        
        modalCategory.textContent = product.category || 'Apparel';
        modalTitle.textContent = product.name;
        modalPrice.textContent = '₦' + product.price.toLocaleString();
        modalDesc.textContent = product.description || 'No description available.';

        renderGallery();
        renderSizes();
        
        productModalOverlay.classList.add('active');
    }

    function closeProductModal() {
        productModalOverlay.classList.remove('active');
        currentProduct = null;
        currentImages = [];
    }

    function renderGallery() {
        modalMainImg.style.opacity = 0;
        setTimeout(() => {
            modalMainImg.src = currentImages[activeImageIdx];
            modalMainImg.style.opacity = 1;
        }, 150);

        // Arrows visibility
        if (currentImages.length > 1) {
            galleryPrevBtn.style.display = 'flex';
            galleryNextBtn.style.display = 'flex';
        } else {
            galleryPrevBtn.style.display = 'none';
            galleryNextBtn.style.display = 'none';
        }

        // Thumbnails rendering
        modalThumbnails.innerHTML = currentImages.map((src, idx) => `
            <img src="${src}" class="modal-thumb ${idx === activeImageIdx ? 'active' : ''}" data-idx="${idx}" alt="Thumbnail ${idx + 1}">
        `).join('');

        // Thumbnail click handlers
        modalThumbnails.querySelectorAll('.modal-thumb').forEach(thumb => {
            thumb.addEventListener('click', (e) => {
                activeImageIdx = parseInt(e.target.dataset.idx);
                renderGallery();
            });
        });
    }

    function renderSizes() {
        const stock = currentProduct.stock || { S: 0, M: 0, L: 0, XL: 0 };
        const sizes = ['S', 'M', 'L', 'XL'];
        
        modalSizeButtons.innerHTML = sizes.map(size => {
            const hasStock = (stock[size] || 0) > 0;
            return `
                <button class="modal-size-btn" data-size="${size}" ${!hasStock ? 'disabled' : ''}>${size}</button>
            `;
        }).join('');

        modalStockIndicator.textContent = '';
        modalAddToCartBtn.disabled = true;
        modalAddToCartBtn.textContent = 'Select Size';

        modalSizeButtons.querySelectorAll('.modal-size-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Clear active states
                modalSizeButtons.querySelectorAll('.modal-size-btn').forEach(b => b.classList.remove('active'));
                
                selectedSize = e.target.dataset.size;
                e.target.classList.add('active');
                
                const sizeStock = stock[selectedSize] || 0;
                if (sizeStock <= 3) {
                    modalStockIndicator.className = 'stock-indicator stock-critical';
                    modalStockIndicator.textContent = `LAST PIECES: ONLY ${sizeStock} LEFT`;
                } else if (sizeStock <= 10) {
                    modalStockIndicator.className = 'stock-indicator stock-low';
                    modalStockIndicator.textContent = `Low stock: ${sizeStock} units remaining`;
                } else {
                    modalStockIndicator.className = 'stock-indicator stock-ok';
                    modalStockIndicator.textContent = 'In stock';
                }

                modalAddToCartBtn.disabled = false;
                modalAddToCartBtn.textContent = 'Add to Cart';
            });
        });
    }

    // Gallery Arrows Listeners
    galleryPrevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        activeImageIdx = (activeImageIdx - 1 + currentImages.length) % currentImages.length;
        renderGallery();
    });

    galleryNextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        activeImageIdx = (activeImageIdx + 1) % currentImages.length;
        renderGallery();
    });

    // Close button & Overlay triggers
    if (closeProductModalBtn) closeProductModalBtn.addEventListener('click', closeProductModal);
    if (productModalOverlay) {
        productModalOverlay.addEventListener('click', (e) => {
            if (e.target === productModalOverlay) closeProductModal();
        });
    }

    // Modal Add to Cart
    modalAddToCartBtn.addEventListener('click', () => {
        if (currentProduct && selectedSize) {
            addToCart(currentProduct, selectedSize);
            closeProductModal();
        }
    });

    // --- Refund Policy Modal ---
    const refundPolicyLink = document.getElementById('refund-policy-link');
    const refundModalOverlay = document.getElementById('refund-modal-overlay');
    const closeRefundBtn = document.getElementById('close-refund');

    function closeRefundModal() {
        if (refundModalOverlay) {
            refundModalOverlay.classList.remove('active');
        }
    }

    if (refundPolicyLink) {
        refundPolicyLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (refundModalOverlay) refundModalOverlay.classList.add('active');
        });
    }

    if (closeRefundBtn) {
        closeRefundBtn.addEventListener('click', closeRefundModal);
    }

    if (refundModalOverlay) {
        refundModalOverlay.addEventListener('click', (e) => {
            if (e.target === refundModalOverlay) {
                closeRefundModal();
            }
        });
    }

    // --- Shipping Policy Modal ---
    const shippingPolicyLink = document.getElementById('shipping-policy-link');
    const shippingModalOverlay = document.getElementById('shipping-modal-overlay');
    const closeShippingBtn = document.getElementById('close-shipping');

    function closeShippingModal() {
        if (shippingModalOverlay) {
            shippingModalOverlay.classList.remove('active');
        }
    }

    if (shippingPolicyLink) {
        shippingPolicyLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (shippingModalOverlay) shippingModalOverlay.classList.add('active');
        });
    }

    if (closeShippingBtn) {
        closeShippingBtn.addEventListener('click', closeShippingModal);
    }

    if (shippingModalOverlay) {
        shippingModalOverlay.addEventListener('click', (e) => {
            if (e.target === shippingModalOverlay) {
                closeShippingModal();
            }
        });
    }

    // Escape Key to close all modals
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeProductModal();
            closeRefundModal();
            closeShippingModal();
            // Also close checkout modal if open
            const checkoutModalOverlay = document.getElementById('checkout-modal-overlay');
            if (checkoutModalOverlay) checkoutModalOverlay.classList.remove('active');
        }
    });

    // Initial render
    updateCartUI();
});
