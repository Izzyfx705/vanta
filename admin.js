// ===== VANTA ADMIN DASHBOARD - JS =====

// ---- Data Layer (localStorage) ----
const DB_KEYS = { products: 'vanta_products', orders: 'vanta_orders' };

function loadData(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch { return []; }
}
function saveData(key, data) { 
    try {
        localStorage.setItem(key, JSON.stringify(data)); 
    } catch (e) {
        console.error("Storage error:", e);
        if (typeof showToast === 'function') {
            showToast('Error saving data! Image might be too large.', 'error');
        } else {
            alert('Error saving data! Image might be too large.');
        }
    }
}

// Seed default products if empty
function seedDefaults() {
    if (localStorage.getItem('vanta_seeded')) return;
    if (loadData(DB_KEYS.products).length > 0) {
        localStorage.setItem('vanta_seeded', 'true');
        return;
    }
    const defaults = [
        { id: 'p1', name: 'Void Overcast Hoodie', sku: 'VNT-HD-001', price: 120, category: 'hoodies', description: 'Oversized black hoodie with embroidered logo.', stock: { S: 12, M: 25, L: 18, XL: 8 }, status: 'active' },
        { id: 'p2', name: 'Dark Matter Graphic Tee', sku: 'VNT-TE-002', price: 55, category: 'tees', description: 'Abstract void-inspired graphic on premium cotton.', stock: { S: 30, M: 40, L: 35, XL: 20 }, status: 'active' },
        { id: 'p3', name: 'Tactical Utility Cargo', sku: 'VNT-BT-003', price: 145, category: 'bottoms', description: 'Black cargo pants with utility pockets and adjustable straps.', stock: { S: 5, M: 10, L: 8, XL: 3 }, status: 'active' },
        { id: 'p4', name: 'Singularity Cap', sku: 'VNT-AC-004', price: 40, category: 'accessories', description: 'Structured black cap with minimal embroidered logo.', stock: { S: 0, M: 0, L: 50, XL: 0 }, status: 'active' },
        { id: 'p5', name: 'Eclipse Windbreaker', sku: 'VNT-OW-005', price: 185, category: 'outerwear', description: 'Techwear windbreaker with reflective details.', stock: { S: 2, M: 4, L: 3, XL: 1 }, status: 'draft' },
        { id: 'p6', name: 'Abyss Long Sleeve', sku: 'VNT-TE-006', price: 65, category: 'tees', description: 'Heavyweight long sleeve with back print.', stock: { S: 0, M: 2, L: 1, XL: 0 }, status: 'active' }
    ];
    saveData(DB_KEYS.products, defaults);

    const orders = [
        { id: 'ORD-1001', customer: 'Alex Rivera', items: [{ name: 'Void Overcast Hoodie', qty: 1, size: 'M' }], total: 120, date: '2026-05-16', status: 'pending' },
        { id: 'ORD-1002', customer: 'Jordan Kato', items: [{ name: 'Dark Matter Graphic Tee', qty: 2, size: 'L' }, { name: 'Singularity Cap', qty: 1, size: 'L' }], total: 150, date: '2026-05-15', status: 'shipped' },
        { id: 'ORD-1003', customer: 'Sam Okonkwo', items: [{ name: 'Tactical Utility Cargo', qty: 1, size: 'M' }], total: 145, date: '2026-05-14', status: 'delivered' }
    ];
    saveData(DB_KEYS.orders, orders);
    localStorage.setItem('vanta_seeded', 'true');
}

// ---- Utility ----
function uid() { return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function totalStock(s) { return (s.S || 0) + (s.M || 0) + (s.L || 0) + (s.XL || 0); }
function formatMoney(v) { return '$' + Number(v).toLocaleString('en-US', { minimumFractionDigits: 0 }); }

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
const mobileLinks = document.querySelectorAll('.mobile-nav-link');
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
    const products = loadData(DB_KEYS.products);
    const orders = loadData(DB_KEYS.orders);
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
    const products = loadData(DB_KEYS.products);
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

function openModal(product = null) {
    form.reset();
    const imagePreview = document.getElementById('imagePreview');
    const imageBase64 = document.getElementById('productImageBase64');
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
        if (product.image) {
            imagePreview.src = product.image;
            imagePreview.style.display = 'block';
            imageBase64.value = product.image;
        } else {
            imagePreview.src = '';
            imagePreview.style.display = 'none';
            imageBase64.value = '';
        }
    } else {
        document.getElementById('modalTitle').textContent = 'Add Product';
        document.getElementById('productId').value = '';
        imagePreview.src = '';
        imagePreview.style.display = 'none';
        imageBase64.value = '';
    }
    modal.classList.add('active');
}

function closeModal() { modal.classList.remove('active'); }

document.getElementById('addProductBtn').addEventListener('click', () => openModal());
document.getElementById('closeModal').addEventListener('click', closeModal);
document.getElementById('cancelModal').addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

document.getElementById('productImage').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
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
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Compress as JPEG to save huge amounts of space
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                document.getElementById('productImageBase64').value = dataUrl;
                
                const imgPreview = document.getElementById('imagePreview');
                imgPreview.src = dataUrl;
                imgPreview.style.display = 'block';
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    } else {
        document.getElementById('productImageBase64').value = '';
        const imgPreview = document.getElementById('imagePreview');
        imgPreview.src = '';
        imgPreview.style.display = 'none';
    }
});

form.addEventListener('submit', (e) => {
    e.preventDefault();
    const products = loadData(DB_KEYS.products);
    const id = document.getElementById('productId').value;
    const data = {
        id: id || uid(),
        name: document.getElementById('productName').value.trim(),
        sku: document.getElementById('productSKU').value.trim(),
        price: parseFloat(document.getElementById('productPrice').value),
        category: document.getElementById('productCategory').value,
        description: document.getElementById('productDesc').value.trim(),
        image: document.getElementById('productImageBase64').value,
        stock: {
            S: parseInt(document.getElementById('stockS').value) || 0,
            M: parseInt(document.getElementById('stockM').value) || 0,
            L: parseInt(document.getElementById('stockL').value) || 0,
            XL: parseInt(document.getElementById('stockXL').value) || 0
        },
        status: document.getElementById('productStatus').value
    };

    if (id) {
        const idx = products.findIndex(p => p.id === id);
        if (idx !== -1) products[idx] = data;
        showToast('Product updated successfully');
    } else {
        products.push(data);
        showToast('Product added successfully');
    }

    saveData(DB_KEYS.products, products);
    closeModal();
    renderProducts();
});

window.editProduct = function(id) {
    const products = loadData(DB_KEYS.products);
    const product = products.find(p => p.id === id);
    if (product) openModal(product);
};

window.deleteProduct = function(id) {
    let products = loadData(DB_KEYS.products);
    products = products.filter(p => p.id !== id);
    saveData(DB_KEYS.products, products);
    showToast('Product deleted', 'success');
    renderProducts();
};

// ---- INVENTORY ----
function renderInventory() {
    const products = loadData(DB_KEYS.products).filter(p => p.status !== 'archived');
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

window.restockProduct = function(id) {
    const products = loadData(DB_KEYS.products);
    const p = products.find(pr => pr.id === id);
    if (!p) return;
    // Simple restock: add 20 to each size
    p.stock.S += 20;
    p.stock.M += 20;
    p.stock.L += 20;
    p.stock.XL += 20;
    saveData(DB_KEYS.products, products);
    showToast(`Restocked ${p.name} (+20 each size)`, 'info');
    renderInventory();
};

document.getElementById('exportInventoryBtn').addEventListener('click', () => {
    const products = loadData(DB_KEYS.products);
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
    const orders = loadData(DB_KEYS.orders);
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

window.updateOrderStatus = function(id, status) {
    const orders = loadData(DB_KEYS.orders);
    const o = orders.find(or => or.id === id);
    if (o) {
        o.status = status;
        saveData(DB_KEYS.orders, orders);
        showToast(`Order ${id} marked as ${status}`);
        renderOrders();
    }
};

// Simulate a random order
const mockCustomers = ['Yuki Tanaka', 'Dev Patel', 'Nia Brooks', 'Leo Martinez', 'Freya Olsen'];
document.getElementById('addMockOrderBtn').addEventListener('click', () => {
    let products = loadData(DB_KEYS.products).filter(p => p.status === 'active');
    products = products.filter(p => totalStock(p.stock) > 0);
    
    if (products.length === 0) { showToast('No active products with stock available', 'error'); return; }
    
    const orders = loadData(DB_KEYS.orders);
    const pick = products[Math.floor(Math.random() * products.length)];
    
    const availableSizes = ['S', 'M', 'L', 'XL'].filter(s => pick.stock[s] > 0);
    const size = availableSizes[Math.floor(Math.random() * availableSizes.length)];
    const maxQty = pick.stock[size];
    const qty = Math.min(Math.floor(Math.random() * 3) + 1, maxQty);
    
    // Deduct stock
    const allProducts = loadData(DB_KEYS.products);
    const prodToUpdate = allProducts.find(p => p.id === pick.id);
    if (prodToUpdate) {
        prodToUpdate.stock[size] -= qty;
        saveData(DB_KEYS.products, allProducts);
    }
    
    const order = {
        id: 'ORD-' + (1000 + orders.length + 1),
        customer: mockCustomers[Math.floor(Math.random() * mockCustomers.length)],
        items: [{ name: pick.name, qty, size }],
        total: pick.price * qty,
        date: new Date().toISOString().split('T')[0],
        status: 'pending'
    };
    orders.unshift(order);
    saveData(DB_KEYS.orders, orders);
    showToast(`New order ${order.id} created!`);
    renderOrders();
});

// ---- INIT ----
seedDefaults();
switchView('dashboard');
