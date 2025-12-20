const firebaseConfig = {
    apiKey: "AIzaSyCzxrJMumx3lbjsOXv9JHdXrn29jUg3x_0",
    authDomain: "outflix-9e57d.firebaseapp.com",
    projectId: "outflix-9e57d",
    databaseURL: "https://outflix-9e57d-default-rtdb.asia-southeast1.firebasedatabase.app"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database(), auth = firebase.auth();

let allMedia = [], currentUser = null, activeMedia = null;

// TRADUTOR DE ERROS
function traduzirErro(code) {
    const erros = {
        'auth/email-already-in-use': "⚠️ E-mail já cadastrado.",
        'auth/wrong-password': "🔑 Senha incorreta.",
        'auth/user-disabled': "🚫 Sua conta foi BLOQUEADA pelo administrador.",
        'auth/user-not-found': "👤 Usuário inexistente."
    };
    return erros[code] || "❌ Erro: " + code;
}

const ui = {
    toggleLoader: (s) => document.getElementById('loader-screen').classList.toggle('hidden', !s),
    toggleSidebar: () => {
        const s = document.getElementById('sidebar'), o = document.getElementById('sidebar-overlay');
        s.classList.toggle('open');
        o.style.display = s.classList.contains('open') ? 'block' : 'none';
    },
    toggleAdmin: () => {
        document.getElementById('admin-panel').classList.toggle('hidden');
        app.loadUsersList();
    },
    switchAdminTab: (tab) => {
        document.getElementById('tab-media').classList.toggle('hidden', tab !== 'media');
        document.getElementById('tab-users').classList.toggle('hidden', tab !== 'users');
    },
    closeModal: () => document.getElementById('modal-details').classList.add('hidden'),
    startPlayer: () => {
        ui.closeModal();
        document.getElementById('player-overlay').classList.remove('hidden');
        document.getElementById('video-container').innerHTML = `<video controls autoplay src="${activeMedia.video}"></video>`;
    }
};

const app = {
    init: () => {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                const snap = await db.ref('users/' + user.uid).once('value');
                currentUser = snap.val();
                if(currentUser?.blocked) { 
                    alert("CONTA BLOQUEADA!"); 
                    auth.signOut(); 
                    return; 
                }
                currentUser.uid = user.uid;
                app.showApp();
                // Marca como online
                db.ref('users/' + user.uid).update({ lastSeen: Date.now(), online: true });
            } else app.showAuth();
        });
    },

    showApp: () => {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('app-screen').classList.remove('hidden');
        if(currentUser?.role === 'admin') document.getElementById('btn-admin-panel').classList.remove('hidden');
        app.loadCatalog();
    },

    showAuth: () => {
        document.getElementById('app-screen').classList.add('hidden');
        document.getElementById('auth-screen').classList.remove('hidden');
        ui.toggleLoader(false);
    },

    // --- GESTÃO DE USUÁRIOS (ADM) ---
    loadUsersList: () => {
        db.ref('users').on('value', snap => {
            const container = document.getElementById('users-list');
            container.innerHTML = "<h4>Usuários Cadastrados:</h4>";
            snap.forEach(u => {
                const user = u.val();
                const isOnline = (Date.now() - user.lastSeen) < 60000;
                container.innerHTML += `
                    <div class="user-card">
                        <div>
                            <b>${user.email}</b> ${isOnline ? '<span class="status-online">● Online</span>' : ''}
                            <br><small>Papel: ${user.role}</small>
                        </div>
                        <div>
                            <button class="btn-block" onclick="app.toggleBlockUser('${u.key}', ${user.blocked})">
                                ${user.blocked ? 'Desbloquear' : 'Bloquear'}
                            </button>
                            <button class="btn-del" onclick="app.deleteUser('${u.key}')">Excluir</button>
                        </div>
                    </div>
                `;
            });
        });
    },

    toggleBlockUser: (uid, currentStatus) => {
        db.ref('users/' + uid).update({ blocked: !currentStatus });
    },

    deleteUser: (uid) => {
        if(confirm("Deseja realmente excluir este usuário?")) db.ref('users/' + uid).remove();
    },

    // --- CATÁLOGO E CATEGORIAS ---
    loadCatalog: () => {
        db.ref('catalog').on('value', snap => {
            allMedia = [];
            const area = document.getElementById('catalog-area');
            area.innerHTML = "";
            const cats = {};

            snap.forEach(i => {
                const m = i.val(); m.key = i.key;
                allMedia.push(m);
                if(!cats[m.category]) cats[m.category] = [];
                cats[m.category].push(m);
            });

            // Cria Seções Automáticas
            for(let cat in cats) {
                const h2 = document.createElement('h2'); h2.innerText = cat; h2.className = "section-title";
                const row = document.createElement('div'); row.className = "carousel-cards";
                cats[cat].forEach(m => {
                    const card = document.createElement('div');
                    card.className = "card"; card.style.backgroundImage = `url(${m.img})`;
                    card.onclick = () => app.openDetails(m);
                    row.appendChild(card);
                });
                area.appendChild(h2); area.appendChild(row);
            }
            app.updateMenu(Object.keys(cats));
        });
    },

    updateMenu: (categories) => {
        const menu = document.querySelector('.menu-list');
        const fixos = `
            <li onclick="location.reload()"><i class="fas fa-home"></i> Início</li>
            <li onclick="app.filter('Favoritos')"><i class="fas fa-heart"></i> Favoritos</li>
        `;
        const dinamicos = categories.map(c => `<li onclick="app.filter('${c}')"><i class="fas fa-play-circle"></i> ${c}</li>`).join('');
        menu.innerHTML = fixos + dinamicos + `<li onclick="app.logout()"><i class="fas fa-sign-out-alt"></i> Sair</li>`;
    },

    postContent: async () => {
        const id = document.getElementById('tmdb-id').value;
        const manualCat = document.getElementById('manual-cat').value;
        const url = document.getElementById('video-url').value;

        const res = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=2eaf2fd731f81a77741ecb625b588a40&language=pt-BR`);
        const d = await res.json();

        const categoriaFinal = manualCat || (d.genres ? d.genres[0].name : "Geral");

        db.ref('catalog').push({
            title: d.title || d.name,
            img: `https://image.tmdb.org/t/p/w500${d.poster_path}`,
            sinopse: d.overview,
            video: url,
            category: categoriaFinal,
            rating: d.vote_average
        });
        alert("Publicado em: " + categoriaFinal);
    },

    openDetails: (m) => {
        activeMedia = m;
        document.getElementById('modal-title').innerText = m.title;
        document.getElementById('modal-sinopse').innerText = m.sinopse;
        document.getElementById('modal-video-preview').innerHTML = `<video autoplay muted loop playsinline src="${m.video}"></video>`;
        document.getElementById('modal-details').classList.remove('hidden');
    },

    login: async () => {
        const e = document.getElementById('login-email').value, p = document.getElementById('login-pass').value;
        try { await auth.signInWithEmailAndPassword(e, p); } catch(e) { alert(traduzirErro(e.code)); }
    },

    register: async () => {
        const e = document.getElementById('reg-email').value, p = document.getElementById('reg-pass').value;
        try {
            const res = await auth.createUserWithEmailAndPassword(e, p);
            await db.ref('users/' + res.user.uid).set({ email: e, role: 'user', blocked: false, lastSeen: Date.now() });
            location.reload();
        } catch(e) { alert(traduzirErro(e.code)); }
    },

    logout: () => auth.signOut().then(() => location.reload())
};

window.onload = app.init;
