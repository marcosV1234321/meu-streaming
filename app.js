const firebaseConfig = {
    apiKey: "AIzaSyCzxrJMumx3lbjsOXv9JHdXrn29jUg3x_0",
    authDomain: "outflix-9e57d.firebaseapp.com",
    projectId: "outflix-9e57d",
    databaseURL: "https://outflix-9e57d-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Inicialização Segura
try {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
} catch (e) {
    console.error("Erro ao iniciar Firebase:", e);
}

const db = firebase.database(), auth = firebase.auth();
let allMedia = [], currentUser = null, activeMedia = null;

const ui = {
    // FORÇA O FECHAMENTO DO CARREGAMENTO
    toggleLoader: (show) => {
        const loader = document.getElementById('loader-screen');
        if (!loader) return;
        if (show) {
            loader.classList.remove('hidden');
            loader.style.opacity = '1';
        } else {
            loader.style.opacity = '0';
            setTimeout(() => loader.classList.add('hidden'), 500);
        }
    },
    toggleAuth: (mode) => {
        document.getElementById('form-login').classList.toggle('hidden', mode === 'register');
        document.getElementById('form-register').classList.toggle('hidden', mode === 'login');
    },
    toggleSidebar: () => {
        const s = document.getElementById('sidebar'), o = document.getElementById('sidebar-overlay');
        s.classList.toggle('open');
        o.style.display = s.classList.contains('open') ? 'block' : 'none';
    },
    toggleAdmin: () => document.getElementById('admin-panel').classList.toggle('hidden')
};

const app = {
    init: () => {
        console.log("Sistema Iniciado...");
        
        // --- TRAVA DE SEGURANÇA (FECHA O LOADER EM 4 SEGUNDOS DE QUALQUER JEITO) ---
        const seguranca = setTimeout(() => {
            console.log("Timeout atingido: Forçando abertura.");
            ui.toggleLoader(false);
            if (!auth.currentUser) app.showAuth();
        }, 4000);

        auth.onAuthStateChanged(async (user) => {
            clearTimeout(seguranca); // Se o Firebase responder rápido, cancela o timeout
            if (user) {
                try {
                    const snap = await db.ref('users/' + user.uid).once('value');
                    currentUser = snap.val() || {};
                    currentUser.uid = user.uid;
                    
                    if (currentUser.blocked) {
                        alert("CONTA BLOQUEADA!");
                        auth.signOut();
                        return;
                    }
                    app.showApp();
                } catch (err) {
                    console.error("Erro ao ler usuário:", err);
                    app.showApp(); 
                }
            } else {
                app.showAuth();
            }
        });
    },

    showApp: () => {
        ui.toggleLoader(false);
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('app-screen').classList.remove('hidden');
        if (currentUser?.role === 'admin') {
            const btn = document.getElementById('btn-admin-panel');
            if(btn) btn.classList.remove('hidden');
        }
        app.loadCatalog();
    },

    showAuth: () => {
        ui.toggleLoader(false);
        document.getElementById('app-screen').classList.add('hidden');
        document.getElementById('auth-screen').classList.remove('hidden');
    },

    loadCatalog: () => {
        db.ref('catalog').on('value', snap => {
            const area = document.getElementById('catalog-area');
            if(!area) return;
            area.innerHTML = "";
            allMedia = [];
            
            snap.forEach(i => {
                const m = i.val(); m.key = i.key;
                allMedia.push(m);
            });

            // Agrupar por categoria
            const categorias = [...new Set(allMedia.map(m => m.category))];
            categorias.forEach(cat => {
                const h2 = document.createElement('h2');
                h2.innerText = cat;
                h2.className = "section-title";
                const row = document.createElement('div');
                row.className = "carousel-cards";
                
                allMedia.filter(m => m.category === cat).forEach(m => {
                    const card = document.createElement('div');
                    card.className = "card";
                    card.style.backgroundImage = `url(${m.img})`;
                    card.onclick = () => app.openDetails(m);
                    row.appendChild(card);
                });
                area.appendChild(h2);
                area.appendChild(row);
            });
        });
    },

    login: async () => {
        const e = document.getElementById('login-email').value;
        const p = document.getElementById('login-pass').value;
        ui.toggleLoader(true);
        try {
            await auth.signInWithEmailAndPassword(e, p);
        } catch (err) {
            ui.toggleLoader(false);
            alert("Erro: " + err.message);
        }
    }
};

window.onload = app.init;
