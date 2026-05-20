// ===== VANTA ADMIN DASHBOARD - JS (Firebase Firestore) =====

// ---- Cached Data (updated by real-time listeners) ----
let cachedProducts = [];
let cachedOrders = [];

// ---- Utility ----
function uid() { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function totalStock(s) { return (s.S || 0) + (s.M || 0) + (s.L || 0) + (s.XL || 0); }
function formatMoney(v) { return '₦' + Number(v).toLocaleString('en-NG', { minimumFractionDigits: 0 }); }

function showToast(msg, type = 'success') {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3000);
}

// ---- Navigation ----
const navItems = document.querySelectorAll('.nav-item[data-view]');
const views = document.querySelectorAll('.view');

// Global Search
document.getElementById('globalSearch').addEventListener('input', () => {
    const activeView = document.querySelector('.nav-item.active').dataset.view;
    if (activeView === 'dashboard') renderDashboard();
    if (activeView === 'products') renderProducts();
    if (activeView === 'inventory') renderInventory();
    if (activeView === 'orders') renderOrders();
});

function switchView(viewId) {
    views.forEach(v => v.classList.remove('active'));
    navItems.forEach(n => n.classList.remove('active'));
    const target = document.getElementById('view-' + viewId);
    const navTarget = document.querySelector(`.nav-item[data-view="${viewId}"]`);
    if (target) target.classList.add('active');
    if (navTarget) navTarget.classList.add('active');

    if (viewId === 'dashboard') renderDashboard();
    if (viewId === 'products') renderProducts();
    if (viewId === 'inventory') renderInventory();
    if (viewId === 'orders') renderOrders();
}

navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        switchView(item.dataset.view);
    });
});

// Mobile sidebar
document.getElementById('sidebarToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
});

// Close sidebar on nav click (mobile)
document.querySelectorAll('.sidebar .nav-item').forEach(item => {
    item.addEventListener('click', () => {
        if (window.innerWidth <= 900) document.getElementById('sidebar').classList.remove('open');
    });
});

// ---- DASHBOARD ----
function renderDashboard() {
    const products = cachedProducts;
    const orders = cachedOrders;
    const revenue = orders.reduce((s, o) => s + o.total, 0);
    const lowStockItems = products.filter(p => totalStock(p.stock) <= 10 && p.status !== 'archived');

    document.getElementById('stat-revenue').textContent = formatMoney(revenue);
    document.getElementById('stat-orders').textContent = orders.length;
    document.getElementById('stat-products').textContent = products.filter(p => p.status === 'active').length;
    document.getElementById('stat-lowstock').textContent = lowStockItems.length;

    const searchTerm = (document.getElementById('globalSearch').value || '').toLowerCase();
    
    let filteredOrders = orders;
    if (searchTerm) {
        filteredOrders = filteredOrders.filter(o => o.id.toLowerCase().includes(searchTerm) || o.customer.toLowerCase().includes(searchTerm));
    }

    // Recent orders
    const roList = document.getElementById('recent-orders-list');
    if (filteredOrders.length === 0) {
        roList.innerHTML = '<p class="empty-state">No orders found.</p>';
    } else {
        roList.innerHTML = filteredOrders.slice(0, 5).map(o => `
            <div class="recent-order-item">
                <div class="ro-info">
                    <span class="ro-id">${o.id}</span>
                    <span class="ro-customer">${o.customer}</span>
                </div>
                <span class="status-badge status-${o.status}">${o.status}</span>
                <span class="ro-total">${formatMoney(o.total)}</span>
            </div>
        `).join('');
    }

    // Low stock
    const lsList = document.getElementById('low-stock-list');
    if (lowStockItems.length === 0) {
        lsList.innerHTML = '<p class="empty-state">All items well-stocked.</p>';
    } else {
        lsList.innerHTML = lowStockItems.map(p => `
            <div class="low-stock-item">
                <span class="ls-name">${p.name}</span>
                <span class="ls-count">${totalStock(p.stock)} left</span>
            </div>
        `).join('');
    }
}

// ---- PRODUCTS ----
function renderProducts() {
    const products = cachedProducts;
    const catFilter = document.getElementById('categoryFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    const searchTerm = (document.getElementById('globalSearch').value || '').toLowerCase();

    let filtered = products;
    if (catFilter !== 'all') filtered = filtered.filter(p => p.category === catFilter);
    if (statusFilter !== 'all') filtered = filtered.filter(p => p.status === statusFilter);
    if (searchTerm) {
        filtered = filtered.filter(p => p.name.toLowerCase().includes(searchTerm) || p.sku.toLowerCase().includes(searchTerm));
    }

    const tbody = document.getElementById('productsTableBody');
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No products found.</td></tr>';
        return;
    }
    tbody.innerHTML = filtered.map(p => {
        const ts = totalStock(p.stock);
        const stockClass = ts === 0 ? 'stock-critical' : ts <= 10 ? 'stock-low' : 'stock-ok';
        return `
        <tr>
            <td>
                <div class="product-cell">
                    <div class="product-thumb">${p.image ? `<img src="${p.image}" alt="${p.name}" style="width:100%; height:100%; object-fit:cover; border-radius:4px;">` : p.name.charAt(0)}</div>
                    <span>${p.name}</span>
                </div>
            </td>
            <td style="text-transform:capitalize">${p.category}</td>
            <td>${formatMoney(p.price)}</td>
            <td class="${stockClass}">${ts}</td>
            <td><span class="status-badge status-${p.status}">${p.status}</span></td>
            <td>
                <div class="action-btns">
                    <button class="btn btn-sm btn-secondary" onclick="editProduct('${p.id}')">Edit</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteProduct('${p.id}')">Delete</button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

document.getElementById('categoryFilter').addEventListener('change', renderProducts);
document.getElementById('statusFilter').addEventListener('change', renderProducts);

// ---- PRODUCT MODAL ----
const modal = document.getElementById('productModal');
const form = document.getElementById('productForm');
// ---- Multi-image state ----
let productImages = [];
function openModal(product = null) {
    form.reset();
    productImages = [];
    if (product) {
        document.getElementById('modalTitle').textContent = 'Edit Product';
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name;
        document.getElementById('productSKU').value = product.sku;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productCategory').value = product.category;
        document.getElementById('productDesc').value = product.description || '';
        document.getElementById('stockS').value = product.stock.S || 0;
        document.getElementById('stockM').value = product.stock.M || 0;
        document.getElementById('stockL').value = product.stock.L || 0;
        document.getElementById('stockXL').value = product.stock.XL || 0;
        document.getElementById('productStatus').value = product.status;
        // Load existing images (support both old single `image` and new `images` array)
        if (product.images && product.images.length > 0) {
            productImages = [...product.images];
        } else if (product.image) {
            productImages = [product.image];
        }
    } else {
        document.getElementById('modalTitle').textContent = 'Add Product';
        document.getElementById('productId').value = '';
    }
    renderImagePreviews();
    modal.classList.add('active');
}

function closeModal() { modal.classList.remove('active'); }

document.getElementById('addProductBtn').addEventListener('click', () => openModal());
document.getElementById('closeModal').addEventListener('click', closeModal);
document.getElementById('cancelModal').addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

// ---- Multi-image upload system ----
const uploadZone = document.getElementById('imageUploadZone');
const fileInput = document.getElementById('productImageFiles');

// Click to upload
uploadZone.addEventListener('click', () => fileInput.click());

// Drag and drop
uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.style.borderColor = 'var(--blue)';
    uploadZone.style.background = 'rgba(56, 139, 253, 0.05)';
});
uploadZone.addEventListener('dragleave', () => {
    uploadZone.style.borderColor = 'var(--border)';
    uploadZone.style.background = 'var(--bg-alt)';
});
uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.style.borderColor = 'var(--border)';
    uploadZone.style.background = 'var(--bg-alt)';
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length) processImageFiles(files);
});

// File input change
fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    if (files.length) processImageFiles(files);
    fileInput.value = ''; // reset so the same files can be re-selected
});

function processImageFiles(files) {
    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 800;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                } else {
                    if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                productImages.push(dataUrl);
                renderImagePreviews();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function renderImagePreviews() {
    const container = document.getElementById('imagePreviews');
    if (productImages.length === 0) {
        container.innerHTML = '';
        return;
    }
    container.innerHTML = productImages.map((src, idx) => `
        <div class="img-thumb-wrap" draggable="true" data-idx="${idx}" style="position: relative; width: 80px; height: 80px; border-radius: 6px; overflow: hidden; border: 2px solid ${idx === 0 ? 'var(--blue)' : 'var(--border)'}; cursor: grab; flex-shrink: 0; transition: border-color 0.2s;">
            <img src="${src}" alt="Image ${idx + 1}" style="width: 100%; height: 100%; object-fit: cover;">
            ${idx === 0 ? '<span style="position: absolute; top: 2px; left: 2px; background: var(--blue); color: #fff; font-size: 0.6rem; padding: 1px 5px; border-radius: 3px; font-weight: 600;">COVER</span>' : ''}
            <button type="button" onclick="removeProductImage(${idx})" style="position: absolute; top: 2px; right: 2px; background: rgba(0,0,0,0.7); color: #fff; border: none; width: 20px; height: 20px; border-radius: 50%; cursor: pointer; font-size: 12px; line-height: 20px; text-align: center; padding: 0;">&times;</button>
        </div>
    `).join('');

    // Drag-to-reorder
    const thumbs = container.querySelectorAll('.img-thumb-wrap');
    thumbs.forEach(thumb => {
        thumb.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', thumb.dataset.idx);
            thumb.style.opacity = '0.4';
        });
        thumb.addEventListener('dragend', () => { thumb.style.opacity = '1'; });
        thumb.addEventListener('dragover', (e) => {
            e.preventDefault();
            thumb.style.borderColor = 'var(--blue)';
        });
        thumb.addEventListener('dragleave', () => {
            const idx = parseInt(thumb.dataset.idx);
            thumb.style.borderColor = idx === 0 ? 'var(--blue)' : 'var(--border)';
        });
        thumb.addEventListener('drop', (e) => {
            e.preventDefault();
            const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
            const toIdx = parseInt(thumb.dataset.idx);
            if (fromIdx !== toIdx) {
                const [moved] = productImages.splice(fromIdx, 1);
                productImages.splice(toIdx, 0, moved);
                renderImagePreviews();
            }
        });
    });
}

window.removeProductImage = function(idx) {
    productImages.splice(idx, 1);
    renderImagePreviews();
};

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('saveProductBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    const id = document.getElementById('productId').value || uid();
    const data = {
        id: id,
        name: document.getElementById('productName').value.trim(),
        sku: document.getElementById('productSKU').value.trim(),
        price: parseFloat(document.getElementById('productPrice').value),
        category: document.getElementById('productCategory').value,
        description: document.getElementById('productDesc').value.trim(),

        stock: {
            S: parseInt(document.getElementById('stockS').value) || 0,
            M: parseInt(document.getElementById('stockM').value) || 0,
            L: parseInt(document.getElementById('stockL').value) || 0,
            XL: parseInt(document.getElementById('stockXL').value) || 0
        },
        status: document.getElementById('productStatus').value,
        image: productImages[0] || '',
        images: productImages,
    };

    const isEdit = !!document.getElementById('productId').value;
    const success = await VantaDB.saveProduct(data);
    
    if (success) {
        showToast(isEdit ? 'Product updated successfully' : 'Product added successfully');
        closeModal();
    } else {
        showToast('Error saving product. Try again.', 'error');
    }

    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Product';
});

window.editProduct = function(id) {
    const product = cachedProducts.find(p => p.id === id);
    if (product) openModal(product);
};

window.deleteProduct = async function(id) {
    const success = await VantaDB.deleteProduct(id);
    if (success) {
        showToast('Product deleted', 'success');
    } else {
        showToast('Error deleting product', 'error');
    }
};

// ---- INVENTORY ----
function renderInventory() {
    const products = cachedProducts.filter(p => p.status !== 'archived');
    const totalUnits = products.reduce((s, p) => s + totalStock(p.stock), 0);
    const lowCount = products.filter(p => totalStock(p.stock) <= 10).length;
    const outCount = products.filter(p => totalStock(p.stock) === 0).length;

    document.getElementById('inventorySummary').innerHTML = `
        <div class="inv-summary-card"><span class="inv-num">${totalUnits}</span><span class="inv-label">Total Units</span></div>
        <div class="inv-summary-card"><span class="inv-num">${products.length}</span><span class="inv-label">SKUs Tracked</span></div>
        <div class="inv-summary-card"><span class="inv-num" style="color:var(--orange)">${lowCount}</span><span class="inv-label">Low Stock</span></div>
        <div class="inv-summary-card"><span class="inv-num" style="color:var(--red)">${outCount}</span><span class="inv-label">Out of Stock</span></div>
    `;

    const searchTerm = (document.getElementById('globalSearch').value || '').toLowerCase();
    let filtered = products;
    if (searchTerm) {
        filtered = filtered.filter(p => p.name.toLowerCase().includes(searchTerm) || p.sku.toLowerCase().includes(searchTerm));
    }

    const tbody = document.getElementById('inventoryTableBody');
    tbody.innerHTML = filtered.map(p => {
        const ts = totalStock(p.stock);
        const statusClass = ts === 0 ? 'stock-critical' : ts <= 10 ? 'stock-low' : 'stock-ok';
        const statusText = ts === 0 ? 'Out of stock' : ts <= 10 ? 'Low stock' : 'In stock';
        return `
        <tr>
            <td><div class="product-cell"><div class="product-thumb">${p.image ? `<img src="${p.image}" alt="${p.name}" style="width:100%; height:100%; object-fit:cover; border-radius:4px;">` : p.name.charAt(0)}</div><span>${p.name}</span></div></td>
            <td style="color:var(--text-muted)">${p.sku}</td>
            <td>${p.stock.S}</td>
            <td>${p.stock.M}</td>
            <td>${p.stock.L}</td>
            <td>${p.stock.XL}</td>
            <td class="${statusClass}" style="font-weight:600">${ts}</td>
            <td><span class="status-badge ${ts === 0 ? 'status-archived' : ts <= 10 ? 'status-pending' : 'status-active'}">${statusText}</span></td>
            <td><button class="btn btn-sm btn-secondary" onclick="restockProduct('${p.id}')">Restock</button></td>
        </tr>`;
    }).join('');
}

window.restockProduct = async function(id) {
    const p = cachedProducts.find(pr => pr.id === id);
    if (!p) return;
    // Simple restock: add 20 to each size
    const newStock = {
        S: (p.stock.S || 0) + 20,
        M: (p.stock.M || 0) + 20,
        L: (p.stock.L || 0) + 20,
        XL: (p.stock.XL || 0) + 20
    };
    const success = await VantaDB.updateProductStock(id, newStock);
    if (success) {
        showToast(`Restocked ${p.name} (+20 each size)`, 'info');
    } else {
        showToast('Error restocking product', 'error');
    }
};

document.getElementById('exportInventoryBtn').addEventListener('click', () => {
    const products = cachedProducts;
    let csv = 'Name,SKU,S,M,L,XL,Total,Status\n';
    products.forEach(p => {
        const ts = totalStock(p.stock);
        csv += `"${p.name}","${p.sku}",${p.stock.S},${p.stock.M},${p.stock.L},${p.stock.XL},${ts},${p.status}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vanta_inventory.csv';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Inventory exported as CSV', 'info');
});

// ---- ORDERS ----
function renderOrders() {
    const orders = cachedOrders;
    const searchTerm = (document.getElementById('globalSearch').value || '').toLowerCase();
    
    let filtered = orders;
    if (searchTerm) {
        filtered = filtered.filter(o => o.id.toLowerCase().includes(searchTerm) || o.customer.toLowerCase().includes(searchTerm));
    }

    const tbody = document.getElementById('ordersTableBody');
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No orders found.</td></tr>';
        return;
    }
    tbody.innerHTML = filtered.map(o => `
        <tr>
            <td style="font-weight:600">${o.id}</td>
            <td>${o.customer}</td>
            <td>${o.items.map(i => `${i.qty}x ${i.name} (${i.size})`).join(', ')}</td>
            <td style="font-weight:600">${formatMoney(o.total)}</td>
            <td style="color:var(--text-muted)">${o.date}</td>
            <td><span class="status-badge status-${o.status}">${o.status}</span></td>
            <td>
                <select class="btn btn-sm btn-secondary" onchange="updateOrderStatus('${o.id}', this.value)" style="cursor:pointer">
                    <option value="pending" ${o.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="shipped" ${o.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                    <option value="delivered" ${o.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                </select>
            </td>
        </tr>
    `).join('');
}

window.updateOrderStatus = async function(id, status) {
    const success = await VantaDB.updateOrderStatus(id, status);
    if (success) {
        showToast(`Order ${id} marked as ${status}`);
    } else {
        showToast('Error updating order', 'error');
    }
};

// Simulate a random order
const mockCustomers = ['Yuki Tanaka', 'Dev Patel', 'Nia Brooks', 'Leo Martinez', 'Freya Olsen'];
document.getElementById('addMockOrderBtn').addEventListener('click', async () => {
    let products = cachedProducts.filter(p => p.status === 'active');
    products = products.filter(p => totalStock(p.stock) > 0);
    
    if (products.length === 0) { showToast('No active products with stock available', 'error'); return; }
    
    const pick = products[Math.floor(Math.random() * products.length)];
    
    const availableSizes = ['S', 'M', 'L', 'XL'].filter(s => pick.stock[s] > 0);
    const size = availableSizes[Math.floor(Math.random() * availableSizes.length)];
    const maxQty = pick.stock[size];
    const qty = Math.min(Math.floor(Math.random() * 3) + 1, maxQty);
    
    // Deduct stock in Firestore
    const newStock = { ...pick.stock };
    newStock[size] -= qty;
    await VantaDB.updateProductStock(pick.id, newStock);
    
    const orderId = 'ORD-' + (1000 + cachedOrders.length + 1);
    const order = {
        id: orderId,
        customer: mockCustomers[Math.floor(Math.random() * mockCustomers.length)],
        items: [{ name: pick.name, qty, size }],
        total: pick.price * qty,
        date: new Date().toISOString().split('T')[0],
        status: 'pending'
    };
    
    const success = await VantaDB.saveOrder(order);
    if (success) {
        showToast(`New order ${order.id} created!`);
    } else {
        showToast('Error creating order', 'error');
    }
});

// ---- AUTHENTICATION ----
const loginForm = document.getElementById('loginForm');
const loginScreen = document.getElementById('login-screen');
const appContent = document.getElementById('app-content');
const logoutBtn = document.getElementById('logoutBtn');
const loginError = document.getElementById('loginError');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminPassword').value;
        const btn = document.getElementById('loginBtn');
        
        btn.disabled = true;
        btn.textContent = 'Signing in...';
        loginError.style.display = 'none';

        const res = await VantaAuth.login(email, password);
        if (res.success) {
            startAdminSession();
        } else {
            loginError.textContent = res.error || 'Invalid credentials';
            loginError.style.display = 'block';
        }

        btn.disabled = false;
        btn.textContent = 'Sign In';
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        VantaAuth.logout();
    });
}

function startAdminSession() {
    if (loginScreen) loginScreen.classList.remove('active');
    if (appContent) appContent.style.display = 'block';
    initAdmin();
}

// ---- INIT ----
// Seed defaults if Firestore is empty, then set up real-time listeners
async function initAdmin() {
    showToast('Connecting to database...', 'info');
    
    await VantaDB.seedDefaults();

    // Set up real-time listeners — UI auto-updates whenever data changes on ANY device
    VantaDB.onProductsChange((products) => {
        cachedProducts = products;
        const activeView = document.querySelector('.nav-item.active')?.dataset?.view;
        if (activeView === 'dashboard') renderDashboard();
        if (activeView === 'products') renderProducts();
        if (activeView === 'inventory') renderInventory();
    });

    VantaDB.onOrdersChange((orders) => {
        cachedOrders = orders;
        const activeView = document.querySelector('.nav-item.active')?.dataset?.view;
        if (activeView === 'dashboard') renderDashboard();
        if (activeView === 'orders') renderOrders();
    });

    switchView('dashboard');
    showToast('Connected! Data syncs across all devices.', 'success');
}

if (VantaAuth.checkSession()) {
    startAdminSession();
} else {
    if (loginScreen) loginScreen.classList.add('active');
    if (appContent) appContent.style.display = 'none';
}
