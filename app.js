// --- CONFIGURAÇÃO FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyCzxrJMumx3lbjsOXv9JHdXrn29jUg3x_0",
    authDomain: "outflix-9e57d.firebaseapp.com",
    projectId: "outflix-9e57d",
    databaseURL: "https://outflix-9e57d-default-rtdb.asia-southeast1.firebasedatabase.app"
};
// Inicializa apenas se ainda não existir
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();
const auth = firebase.auth();

// --- VARIÁVEIS GLOBAIS ---
let currentUser = null;
let allMedia = [];

// --- UI MANAGER (Interface) ---
const ui = {
    // Controla a tela de carregamento (Tela Preta)
    toggleLoader: (show) => {
        const el = document.getElementById('loader-screen');
        if (show) {
            el.classList.remove('hidden');
        } else {
            // Pequeno delay para suavizar a saída
            setTimeout(() => {
                el.style.opacity = '0';
                setTimeout(() => {
                    el.classList.add('hidden');
                    el.style.opacity = '1'; // Reseta para a próxima vez
                }, 500);
            }, 500);
        }
    },
    
    // Alterna entre Login e Registro
    toggleAuth: (mode) => {
        const loginForm = document.getElementById('form-login');
        const regForm = document.getElementById('form-register');
        
        if (mode === 'register') {
            loginForm.classList.add('hidden');
            regForm.classList.remove('hidden');
        } else {
            loginForm.classList.remove('hidden');
            regForm.classList.add('hidden');
        }
    },

    toggleSidebar: () => {
        document.getElementById('sidebar').classList.toggle('open');
        const overlay = document.getElementById('sidebar-overlay');
        overlay.style.display = document.getElementById('sidebar').classList.contains('open') ? 'block' : 'none';
    },

    toggleAdmin: () => {
        document.getElementById('admin-panel').classList.toggle('hidden');
        if(!document.getElementById('admin-panel').classList.contains('hidden')) app.loadAdminUsers();
    },

    // Modal de Detalhes
    openModal: (media) => {
        app.activeMedia = media;
        document.getElementById('modal-title').innerText = media.title;
        document.getElementById('modal-sinopse').innerText = media.sinopse || "Sem descrição.";
        document.getElementById('modal-video-preview').innerHTML = `<video autoplay muted loop playsinline><source src="${media.video}"></video>`;
        document.getElementById('modal-details').classList.remove('hidden');
    },

    closeModal: () => {
        document.getElementById('modal-details').classList.add('hidden');
        document.getElementById('modal-video-preview').innerHTML = "";
    },

    // Player
    startPlayer: () => {
        ui.closeModal();
        document.getElementById('player-overlay').classList.remove('hidden');
        document.getElementById('video-container').innerHTML = `
            <video controls autoplay width="100%" height="100%">
                <source src="${app.activeMedia.video}" type="video/mp4">
            </video>`;
    },

    closePlayer: () => {
        document.getElementById('player-overlay').classList.add('hidden');
        document.getElementById('video-container').innerHTML = "";
        document.body.classList.remove('lights-off');
    }
};

// --- LÓGICA DO APP ---
const app = {
    activeMedia: null,

    init: () => {
        // SEGURANÇA: Se o loader travar por 5 segundos, força a liberação
        setTimeout(() => ui.toggleLoader(false), 5000);

        auth.onAuthStateChanged(async (user) => {
            if (user) {
                // Usuário logado
                try {
                    const snap = await db.ref('users/' + user.uid).once('value');
                    const val = snap.val();
                    if (val) {
                        currentUser = val;
                        app.showApp();
                    } else {
                        // Logado no Auth mas sem dados no DB
                        app.showApp(); // Libera mesmo assim ou faz logout
                    }
                } catch (e) {
                    console.error(e);
                    app.showApp(); // Libera em caso de erro de rede
                }
            } else {
                // Usuário não logado
                app.showAuth();
            }
        });
    },

    showApp: () => {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('app-screen').classList.remove('hidden');
        if (currentUser && currentUser.role === 'admin') {
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

    // LOGIN
    login: async () => {
        const e = document.getElementById('login-email').value;
        const p = document.getElementById('login-pass').value;
        if (!e || !p) return alert("Preencha e-mail e senha.");
        
        ui.toggleLoader(true);
        try {
            await auth.signInWithEmailAndPassword(e, p);
        } catch (err) {
            ui.toggleLoader(false);
            let msg = "Erro ao entrar.";
            if(err.code === 'auth/wrong-password') msg = "Senha incorreta.";
            if(err.code === 'auth/user-not-found') msg = "Usuário não encontrado.";
            alert(msg);
        }
    },

    // REGISTRO COM CORREÇÃO DE ERRO
    register: async () => {
        const e = document.getElementById('reg-email').value;
        const p = document.getElementById('reg-pass').value;
        const ph = document.getElementById('reg-phone').value;
        
        if (!e || !p) return alert("Preencha os campos.");

        ui.toggleLoader(true);
        try {
            const res = await auth.createUserWithEmailAndPassword(e, p);
            // Salva no banco
            await db.ref('users/' + res.user.uid).set({
                email: e,
                phone: ph || "",
                role: 'user',
                joinDate: new Date().toISOString()
            });
            location.reload();

        } catch (err) {
            ui.toggleLoader(false);
            
            // CORREÇÃO ESPECÍFICA PARA SEU ERRO
            if (err.code === 'auth/email-already-in-use') {
                alert("Este e-mail já possui conta! Redirecionando para Login...");
                ui.toggleAuth('login'); // Muda para a tela de login
                document.getElementById('login-email').value = e; // Preenche o email
                document.getElementById('login-pass').focus(); // Foca na senha
            } else {
                alert("Erro: " + err.message);
            }
        }
    },

    logout: () => auth.signOut().then(() => location.reload()),

    // CATÁLOGO
    loadCatalog: () => {
        db.ref('catalog').on('value', snap => {
            allMedia = [];
            const rMov = document.getElementById('row-movies');
            const rSer = document.getElementById('row-series');
            const rFeat = document.getElementById('row-featured');
            
            if(rMov) rMov.innerHTML = "";
            if(rSer) rSer.innerHTML = "";
            if(rFeat) rFeat.innerHTML = "";

            snap.forEach(i => {
                const m = i.val();
                m.key = i.key;
                allMedia.push(m);
                const card = app.createCard(m);

                if (m.type === 'movie' && rMov) rMov.appendChild(card);
                else if (rSer) rSer.appendChild(card);
                
                // Em alta (fake logic: pega os primeiros)
                if (allMedia.length <= 6 && rFeat) rFeat.appendChild(card.cloneNode(true)).onclick = () => ui.openModal(m);
            });
        });
    },

    createCard: (m) => {
        const d = document.createElement('div');
        d.className = 'card';
        d.style.backgroundImage = `url(${m.img})`;
        d.onclick = () => ui.openModal(m);
        return d;
    },

    search: () => {
        const t = document.getElementById('search-input').value.toLowerCase();
        const grid = document.getElementById('search-grid');
        const resArea = document.getElementById('search-results-area');
        const catArea = document.getElementById('catalog-area');

        if (t.length > 2) {
            catArea.classList.add('hidden');
            resArea.classList.remove('hidden');
            grid.innerHTML = "";
            allMedia.forEach(m => {
                if (m.title.toLowerCase().includes(t)) {
                    grid.appendChild(app.createCard(m));
                }
            });
        } else {
            catArea.classList.remove('hidden');
            resArea.classList.add('hidden');
        }
    },

    // ADMIN
    postContent: async () => {
        const id = document.getElementById('tmdb-id').value;
        const type = document.getElementById('tmdb-type').value;
        const url = document.getElementById('video-url').value;
        
        if (!id || !url) return alert("Faltam dados!");
        
        try {
            const res = await fetch(`https://api.themoviedb.org/3/${type}/${id}?api_key=2eaf2fd731f81a77741ecb625b588a40&language=pt-BR`);
            const data = await res.json();
            await db.ref('catalog').push({
                title: data.title || data.name,
                img: `https://image.tmdb.org/t/p/w500${data.poster_path}`,
                sinopse: data.overview,
                type: type,
                video: url
            });
            alert("Sucesso!");
        } catch (e) { alert("Erro API: " + e.message); }
    },
    
    loadAdminUsers: () => {
        db.ref('users').once('value', snap => {
            const l = document.getElementById('users-list-container');
            l.innerHTML = "";
            snap.forEach(u => {
                const v = u.val();
                l.innerHTML += `<div class="user-item"><b>${v.email}</b> (${v.role})</div>`;
            });
        });
    }
};

window.onload = app.init;
