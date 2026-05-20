// ===== VANTA DATA LAYER (Supabase REST API) =====
// Shared data access module — uses plain fetch(), no SDK needed

const VantaAuth = {
    async login(email, password) {
        try {
            const res = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error_description || data.msg || 'Login failed');
            
            localStorage.setItem('vanta_admin_token', data.access_token);
            supabaseHeaders['Authorization'] = 'Bearer ' + data.access_token;
            return { success: true };
        } catch (e) {
            console.error('[VantaAuth] Error logging in:', e);
            return { success: false, error: e.message };
        }
    },
    
    logout() {
        localStorage.removeItem('vanta_admin_token');
        supabaseHeaders['Authorization'] = 'Bearer ' + SUPABASE_KEY;
        window.location.reload();
    },

    checkSession() {
        const token = localStorage.getItem('vanta_admin_token');
        if (token) {
            supabaseHeaders['Authorization'] = 'Bearer ' + token;
            return true;
        }
        return false;
    }
};

const VantaDB = {
    // ---- PRODUCTS ----
    async getProducts() {
        try {
            const res = await fetch(SUPABASE_URL + '/rest/v1/products?select=*', {
                headers: supabaseHeaders
            });
            if (!res.ok) throw new Error('Failed to fetch products: ' + res.status);
            return await res.json();
        } catch (e) {
            console.error('[VantaDB] Error fetching products:', e);
            return [];
        }
    },

    async saveProduct(product) {
        try {
            // Upsert — insert or update if ID already exists
            const res = await fetch(SUPABASE_URL + '/rest/v1/products', {
                method: 'POST',
                headers: {
                    ...supabaseHeaders,
                    'Prefer': 'resolution=merge-duplicates,return=representation',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(product)
            });
            if (!res.ok) {
                const errText = await res.text();
                console.error('[VantaDB] Save product failed:', res.status, errText);
                throw new Error('Failed to save product: ' + res.status);
            }
            return true;
        } catch (e) {
            console.error('[VantaDB] Error saving product:', e);
            return false;
        }
    },

    async deleteProduct(id) {
        try {
            const res = await fetch(SUPABASE_URL + '/rest/v1/products?id=eq.' + id, {
                method: 'DELETE',
                headers: supabaseHeaders
            });
            if (!res.ok) throw new Error('Failed to delete product: ' + res.status);
            return true;
        } catch (e) {
            console.error('[VantaDB] Error deleting product:', e);
            return false;
        }
    },

    // ---- ORDERS ----
    async getOrders() {
        try {
            const res = await fetch(SUPABASE_URL + '/rest/v1/orders?select=*&order=date.desc', {
                headers: supabaseHeaders
            });
            if (!res.ok) throw new Error('Failed to fetch orders: ' + res.status);
            return await res.json();
        } catch (e) {
            console.error('[VantaDB] Error fetching orders:', e);
            return [];
        }
    },

    async saveOrder(order) {
        try {
            const res = await fetch(SUPABASE_URL + '/rest/v1/orders', {
                method: 'POST',
                headers: {
                    ...supabaseHeaders,
                    'Prefer': 'resolution=merge-duplicates,return=representation'
                },
                body: JSON.stringify(order)
            });
            if (!res.ok) throw new Error('Failed to save order: ' + res.status);
            return true;
        } catch (e) {
            console.error('[VantaDB] Error saving order:', e);
            return false;
        }
    },

    async updateOrderStatus(id, status) {
        try {
            const res = await fetch(SUPABASE_URL + '/rest/v1/orders?id=eq.' + id, {
                method: 'PATCH',
                headers: supabaseHeaders,
                body: JSON.stringify({ status })
            });
            if (!res.ok) throw new Error('Failed to update order: ' + res.status);
            return true;
        } catch (e) {
            console.error('[VantaDB] Error updating order status:', e);
            return false;
        }
    },

    // ---- STOCK UPDATE ----
    async updateProductStock(productId, stockUpdate) {
        try {
            const res = await fetch(SUPABASE_URL + '/rest/v1/products?id=eq.' + productId, {
                method: 'PATCH',
                headers: supabaseHeaders,
                body: JSON.stringify({ stock: stockUpdate })
            });
            if (!res.ok) throw new Error('Failed to update stock: ' + res.status);
            return true;
        } catch (e) {
            console.error('[VantaDB] Error updating stock:', e);
            return false;
        }
    },

    // ---- REAL-TIME via POLLING ----
    // Polls Supabase every few seconds so changes from other devices appear automatically
    onProductsChange(callback) {
        let running = true;
        const poll = async () => {
            const products = await VantaDB.getProducts();
            callback(products);
            if (running) setTimeout(poll, 5000); // Poll every 5 seconds
        };
        poll(); // Initial fetch
        return () => { running = false; }; // Cleanup function
    },

    onOrdersChange(callback) {
        let running = true;
        const poll = async () => {
            const orders = await VantaDB.getOrders();
            callback(orders);
            if (running) setTimeout(poll, 5000);
        };
        poll();
        return () => { running = false; };
    },

    // ---- SEED DEFAULTS ----
    async seedDefaults() {
        try {
            const products = await VantaDB.getProducts();
            if (products.length > 0) return; // Data already exists

            console.log('[VantaDB] Seeding default data...');

            const defaults = [
                { id: 'p1', name: 'Void Overcast Hoodie', sku: 'VNT-HD-001', price: 120, category: 'hoodies', description: 'Oversized black hoodie with embroidered logo.', stock: { S: 12, M: 25, L: 18, XL: 8 }, status: 'active' },
                { id: 'p2', name: 'Dark Matter Graphic Tee', sku: 'VNT-TE-002', price: 55, category: 'tees', description: 'Abstract void-inspired graphic on premium cotton.', stock: { S: 30, M: 40, L: 35, XL: 20 }, status: 'active' },
                { id: 'p3', name: 'Tactical Utility Cargo', sku: 'VNT-BT-003', price: 145, category: 'bottoms', description: 'Black cargo pants with utility pockets and adjustable straps.', stock: { S: 5, M: 10, L: 8, XL: 3 }, status: 'active' },
                { id: 'p4', name: 'Singularity Cap', sku: 'VNT-AC-004', price: 40, category: 'accessories', description: 'Structured black cap with minimal embroidered logo.', stock: { S: 0, M: 0, L: 50, XL: 0 }, status: 'active' },
                { id: 'p5', name: 'Eclipse Windbreaker', sku: 'VNT-OW-005', price: 185, category: 'outerwear', description: 'Techwear windbreaker with reflective details.', stock: { S: 2, M: 4, L: 3, XL: 1 }, status: 'draft' },
                { id: 'p6', name: 'Abyss Long Sleeve', sku: 'VNT-TE-006', price: 65, category: 'tees', description: 'Heavyweight long sleeve with back print.', stock: { S: 0, M: 2, L: 1, XL: 0 }, status: 'active' }
            ];

            const orders = [
                { id: 'ORD-1001', customer: 'Alex Rivera', items: [{ name: 'Void Overcast Hoodie', qty: 1, size: 'M' }], total: 120, date: '2026-05-16', status: 'pending' },
                { id: 'ORD-1002', customer: 'Jordan Kato', items: [{ name: 'Dark Matter Graphic Tee', qty: 2, size: 'L' }, { name: 'Singularity Cap', qty: 1, size: 'L' }], total: 150, date: '2026-05-15', status: 'shipped' },
                { id: 'ORD-1003', customer: 'Sam Okonkwo', items: [{ name: 'Tactical Utility Cargo', qty: 1, size: 'M' }], total: 145, date: '2026-05-14', status: 'delivered' }
            ];

            // Insert products
            await fetch(SUPABASE_URL + '/rest/v1/products', {
                method: 'POST',
                headers: supabaseHeaders,
                body: JSON.stringify(defaults)
            });

            // Insert orders
            await fetch(SUPABASE_URL + '/rest/v1/orders', {
                method: 'POST',
                headers: supabaseHeaders,
                body: JSON.stringify(orders)
            });

            console.log('[VantaDB] Default data seeded successfully');
        } catch (e) {
            console.error('[VantaDB] Error seeding defaults:', e);
        }
    }
};
