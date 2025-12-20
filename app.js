// --- CONFIGURAÇÃO FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyCzxrJMumx3lbjsOXv9JHdXrn29jUg3x_0",
    authDomain: "outflix-9e57d.firebaseapp.com",
    projectId: "outflix-9e57d",
    databaseURL: "https://outflix-9e57d-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Inicialização segura
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

let allMedia = [], currentUser = null, activeMedia = null;

// --- SISTEMA DE TRADUÇÃO DE ERROS ---
function traduzirErro(code) {
    switch (code) {
        case 'auth/email-already-in-use': return "⚠️ Este e-mail já está em uso por outra conta.";
        case 'auth/wrong-password': return "🔑 Senha incorreta. Tente novamente.";
        case 'auth/user-not-found': return "👤 Usuário não encontrado. Verifique o e-mail.";
        case 'auth/weak-password': return "🔒 Senha muito fraca. Use pelo menos 6 caracteres.";
        case 'auth/invalid-email': return "📧 O formato do e-mail é inválido.";
        case 'auth/network-request-failed': return "📡 Falha na conexão. Verifique sua internet.";
        default: return "❌ Ocorreu um erro: " + code;
    }
}

// --- INTERFACE DO USUÁRIO (UI) ---
const ui = {
    toggleLoader: (show) => {
        const loader = document.getElementById('loader-screen');
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

    // CORREÇÃO DA ABA LATERAL
    toggleSidebar: () => {
        const sb = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');
        
        sb.classList.toggle('open');
        
        if (sb.classList.contains('open')) {
            overlay.style.display = 'block';
        } else {
            overlay.style.display = 'none';
        }
    },

    openModal: (media) => {
        activeMedia = media;
        document.getElementById('modal-title').innerText = media.title;
        document.getElementById('modal-sinopse').innerText = media.sinopse || "Sem descrição disponível.";
        document.getElementById('modal-video-preview').innerHTML = `
            <video autoplay muted loop playsinline style="width:100%; height:100%; object-fit:cover;">
                <source src="${media.video}">
            </video>`;
        document.getElementById('modal-details').classList.remove('hidden');
    },

    closeModal: () => {
        document.getElementById('modal-details').classList.add('hidden');
        document.getElementById('modal-video-preview').innerHTML = "";
    },

    startPlayer: () => {
        ui.closeModal();
        document.getElementById('player-overlay').classList.remove('hidden');
        document.getElementById('video-container').innerHTML = `
            <video controls autoplay style="width:100%; height:100%;">
                <source src="${activeMedia.video}" type="video/mp4">
            </video>`;
    },

    closePlayer: () => {
        document.getElementById('player-overlay').classList.add('hidden');
        document.getElementById('video-container').innerHTML = "";
    }
};

// --- LÓGICA DO APLICATIVO ---
const app = {
    init: () => {
        // Previne tela preta infinita
        setTimeout(() => ui.toggleLoader(false), 5000);

        auth.onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    const snap = await db.ref('users/' + user.uid).once('value');
                    currentUser = snap.val();
                    app.showApp();
                } catch (e) {
                    console.error("Erro ao carregar usuário:", e);
                    app.showApp();
                }
            } else {
                app.showAuth();
            }
        });
    },

    showApp: () => {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('app-screen').classList.remove('hidden');
        if (currentUser?.role === 'admin') {
            document.getElementById('btn-admin-panel').classList.remove('hidden');
        }
        ui.toggleLoader(false);
        app.loadCatalog();
    },

    showAuth: () => {
        document.getElementById('app-screen').classList.add('hidden');
        document.getElementById('auth-screen').classList.remove('hidden');
        ui.toggleLoader(false);
    },

    login: async () => {
        const e = document.getElementById('login-email').value;
        const p = document.getElementById('login-pass').value;
        if (!e || !p) return alert("Por favor, preencha todos os campos.");

        ui.toggleLoader(true);
        try {
            await auth.signInWithEmailAndPassword(e, p);
        } catch (err) {
            ui.toggleLoader(false);
            alert(traduzirErro(err.code));
        }
    },

    register: async () => {
        const e = document.getElementById('reg-email').value;
        const p = document.getElementById('reg-pass').value;
        if (!e || !p) return alert("Preencha e-mail e senha.");

        ui.toggleLoader(true);
        try {
            const res = await auth.createUserWithEmailAndPassword(e, p);
            await db.ref('users/' + res.user.uid).set({
                email: e,
                role: 'user',
                createdAt: new Date().toISOString()
            });
            location.reload();
        } catch (err) {
            ui.toggleLoader(false);
            alert(traduzirErro(err.code));
        }
    },

    logout: () => auth.signOut().then(() => location.reload()),

    loadCatalog: () => {
        db.ref('catalog').on('value', snap => {
            const rMov = document.getElementById('row-movies');
            const rSer = document.getElementById('row-series');
            const rFeat = document.getElementById('row-featured');
            
            if(rMov) rMov.innerHTML = "";
            if(rSer) rSer.innerHTML = "";
            if(rFeat) rFeat.innerHTML = "";

            allMedia = [];
            snap.forEach(i => {
                const m = i.val();
                m.key = i.key;
                allMedia.push(m);
                
                const card = document.createElement('div');
                card.className = 'card';
                card.style.backgroundImage = `url(${m.img})`;
                card.onclick = () => ui.openModal(m);

                if (m.type === 'movie' && rMov) rMov.appendChild(card);
                else if (rSer) rSer.appendChild(card);

                if (rFeat && allMedia.length <= 6) {
                    const clone = card.cloneNode(true);
                    clone.onclick = () => ui.openModal(m);
                    rFeat.appendChild(clone);
                }
            });
        });
    },

    search: () => {
        const query = document.getElementById('search-input').value.toLowerCase();
        const grid = document.getElementById('search-grid');
        const resultsArea = document.getElementById('search-results-area');
        const catalogArea = document.getElementById('catalog-area');

        if (query.length > 2) {
            catalogArea.classList.add('hidden');
            resultsArea.classList.remove('hidden');
            grid.innerHTML = "";
            allMedia.forEach(m => {
                if (m.title.toLowerCase().includes(query)) {
                    const card = document.createElement('div');
                    card.className = 'card';
                    card.style.backgroundImage = `url(${m.img})`;
                    card.onclick = () => ui.openModal(m);
                    grid.appendChild(card);
                }
            });
        } else {
            catalogArea.classList.remove('hidden');
            resultsArea.classList.add('hidden');
        }
    }
};

window.onload = app.init;
