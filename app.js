// --- CONFIGURAÇÃO DO FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyCzxrJMumx3lbjsOXv9JHdXrn29jUg3x_0",
    authDomain: "outflix-9e57d.firebaseapp.com",
    projectId: "outflix-9e57d",
    databaseURL: "https://outflix-9e57d-default-rtdb.asia-southeast1.firebasedatabase.app"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

// --- VARIÁVEIS GLOBAIS ---
let currentUser = null;
let allMedia = [];
let activeMedia = null;

// --- GERENCIADOR DE UI (Interface) ---
const ui = {
    toggleLoader: (show) => {
        const el = document.getElementById('loader-screen');
        if (show) el.classList.remove('hidden');
        else {
            el.style.opacity = '0';
            setTimeout(() => el.classList.add('hidden'), 500);
        }
    },
    
    toggleAuth: (mode) => {
        document.getElementById('form-login').classList.toggle('hidden', mode === 'register');
        document.getElementById('form-register').classList.toggle('hidden', mode === 'login');
    },

    toggleSidebar: () => {
        const sb = document.getElementById('sidebar');
        sb.classList.toggle('open');
        const overlay = document.getElementById('sidebar-overlay');
        overlay.style.display = sb.classList.contains('open') ? 'block' : 'none';
    },

    toggleAdmin: () => {
        document.getElementById('admin-panel').classList.toggle('hidden');
        if(!document.getElementById('admin-panel').classList.contains('hidden')) {
            app.loadAdminUsers();
        }
    },

    scrollTo: (id) => {
        const el = document.getElementById(id);
        if(el) {
            window.scrollTo({ top: el.offsetTop - 80, behavior: 'smooth' });
            ui.toggleSidebar();
        }
    },

    openModal: (media) => {
        activeMedia = media;
        document.getElementById('modal-title').innerText = media.title;
        document.getElementById('modal-sinopse').innerText = media.sinopse || "Sem descrição disponível.";
        
        // Preview Video (Muted Loop)
        const previewHTML = `<video autoplay muted loop playsinline><source src="${media.video}"></video>`;
        document.getElementById('modal-video-preview').innerHTML = previewHTML;
        
        document.getElementById('modal-details').classList.remove('hidden');
    },

    closeModal: () => {
        document.getElementById('modal-details').classList.add('hidden');
        document.getElementById('modal-video-preview').innerHTML = ""; // Stop video
    },

    toggleLights: () => {
        document.body.classList.toggle('lights-off');
    },

    closePlayer: () => {
        document.getElementById('player-overlay').classList.add('hidden');
        document.getElementById('video-container').innerHTML = "";
        document.body.classList.remove('lights-off');
    }
};

// --- LÓGICA DO APP (Back-end + Funcionalidades) ---
const app = {
    // 1. Inicialização e Monitoramento de Sessão
    init: () => {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    const snap = await db.ref('users/' + user.uid).once('value');
                    const userData = snap.val();
                    
                    if (userData) {
                        // Verificação de Validade da Conta
                        const now = new Date();
                        const validUntil = new Date(userData.valido_ate);
                        
                        if (now > validUntil && userData.role !== 'admin') {
                            alert("Sua assinatura expirou. Entre em contato com o suporte.");
                            app.logout();
                            return;
                        }

                        currentUser = userData;
                        app.showApp(user.uid);
                    } else {
                        // Usuário no Auth mas sem dados no DB (Erro raro)
                        app.logout();
                    }
                } catch (error) {
                    console.error("Erro DB:", error);
                    alert("Erro ao conectar.");
                }
            } else {
                app.showAuth();
            }
        });
    },

    showApp: (uid) => {
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('app-screen').classList.remove('hidden');
        ui.toggleLoader(false);

        // Se for Admin, mostra botão
        if (currentUser.role === 'admin') {
            document.getElementById('btn-admin-panel').classList.remove('hidden');
        }

        app.loadCatalog();
    },

    showAuth: () => {
        document.getElementById('app-screen').classList.add('hidden');
        document.getElementById('auth-screen').classList.remove('hidden');
        ui.toggleLoader(false);
    },

    // 2. Autenticação
    login: async () => {
        const e = document.getElementById('login-email').value;
        const p = document.getElementById('login-pass').value;
        if (!e || !p) return alert("Preencha todos os campos.");
        
        ui.toggleLoader(true);
        try {
            await auth.signInWithEmailAndPassword(e, p);
        } catch (err) {
            ui.toggleLoader(false);
            alert("Erro: " + err.message);
        }
    },

    register: async () => {
        const e = document.getElementById('reg-email').value;
        const p = document.getElementById('reg-pass').value;
        const phone = document.getElementById('reg-phone').value;
        const addr = document.getElementById('reg-addr').value;

        if (!e || !p || !phone) return alert("Campos obrigatórios vazios.");

        ui.toggleLoader(true);
        try {
            const res = await auth.createUserWithEmailAndPassword(e, p);
            const exp = new Date();
            exp.setDate(exp.getDate() + 7); // 7 Dias Grátis

            const newUser = {
                email: e,
                phone: phone.replace(/\D/g, ''), // Salva só números
                address: addr,
                role: 'user',
                valido_ate: exp.toISOString()
            };

            await db.ref('users/' + res.user.uid).set(newUser);
            location.reload();
        } catch (err) {
            ui.toggleLoader(false);
            alert("Erro no registro: " + err.message);
        }
    },

    logout: () => {
        auth.signOut().then(() => location.reload());
    },

    // 3. Catálogo e Busca
    loadCatalog: () => {
        db.ref('catalog').on('value', (snap) => {
            allMedia = [];
            const rFeat = document.getElementById('row-featured');
            const rMov = document.getElementById('row-movies');
            const rSer = document.getElementById('row-series');
            
            rFeat.innerHTML = ""; rMov.innerHTML = ""; rSer.innerHTML = "";

            snap.forEach((child) => {
                const m = child.val();
                m.key = child.key;
                allMedia.push(m);

                const card = app.createCard(m);

                // Organização
                if (m.type === 'movie') rMov.appendChild(card);
                else rSer.appendChild(card);

                // Featured Fake (Pega os 8 primeiros)
                if (allMedia.length <= 8) {
                    const featCard = app.createCard(m);
                    rFeat.appendChild(featCard);
                }
            });
        });
    },

    createCard: (media) => {
        const el = document.createElement('div');
        el.className = 'card';
        el.style.backgroundImage = `url(${media.img})`;
        el.onclick = () => ui.openModal(media);
        return el;
    },

    search: () => {
        const term = document.getElementById('search-input').value.toLowerCase();
        const resultsArea = document.getElementById('search-results-area');
        const catalogArea = document.getElementById('catalog-area');
        const grid = document.getElementById('search-grid');

        if (term.length > 2) {
            resultsArea.classList.remove('hidden');
            catalogArea.classList.add('hidden');
            grid.innerHTML = "";

            const filtered = allMedia.filter(m => m.title.toLowerCase().includes(term));
            filtered.forEach(m => grid.appendChild(app.createCard(m)));
        } else {
            resultsArea.classList.add('hidden');
            catalogArea.classList.remove('hidden');
        }
    },

    // 4. Player
    startPlayer: () => {
        ui.closeModal();
        const player = document.getElementById('player-overlay');
        const container = document.getElementById('video-container');
        
        player.classList.remove('hidden');
        
        // Video Full com Controles
        container.innerHTML = `
            <video controls autoplay width="100%" height="100%">
                <source src="${activeMedia.video}" type="video/mp4">
                Seu navegador não suporta vídeos HTML5.
            </video>
        `;
    },

    // 5. Funções Administrativas
    loadAdminUsers: () => {
        const list = document.getElementById('users-list-container');
        list.innerHTML = "Atualizando...";
        
        db.ref('users').once('value', (snap) => {
            list.innerHTML = "";
            snap.forEach((u) => {
                const user = u.val();
                const isAdmin = user.role === 'admin';
                const color = isAdmin ? '#ffc107' : '#007bff';
                
                const html = `
                    <div class="user-item">
                        <div>
                            <span class="badge-role" style="background:${color}; color:${isAdmin?'black':'white'}">${user.role}</span>
                            <strong>${user.email}</strong>
                            <div style="font-size:0.8rem; color:#888;">${user.address || 'Sem endereço'}</div>
                        </div>
                        <a href="https://wa.me/55${user.phone}" target="_blank" style="color:#25d366; font-size:1.5rem;"><i class="fab fa-whatsapp"></i></a>
                    </div>
                `;
                list.innerHTML += html;
            });
        });
    },

    postContent: async () => {
        const id = document.getElementById('tmdb-id').value;
        const type = document.getElementById('tmdb-type').value;
        const videoUrl = document.getElementById('video-url').value;

        if (!id || !videoUrl) return alert("Preencha o ID e a URL do vídeo.");

        try {
            const apiKey = "2eaf2fd731f81a77741ecb625b588a40";
            const res = await fetch(`https://api.themoviedb.org/3/${type}/${id}?api_key=${apiKey}&language=pt-BR`);
            
            if (!res.ok) throw new Error("ID não encontrado no TMDB.");
            
            const data = await res.json();
            
            const newContent = {
                title: data.title || data.name,
                img: `https://image.tmdb.org/t/p/w500${data.poster_path}`,
                sinopse: data.overview,
                type: type,
                video: videoUrl,
                date: new Date().toISOString()
            };

            await db.ref('catalog').push(newContent);
            alert("Conteúdo postado com sucesso!");
            document.getElementById('tmdb-id').value = "";
            document.getElementById('video-url').value = "";
            
        } catch (error) {
            alert(error.message);
        }
    }
};

// Iniciar Aplicação
window.onload = app.init;
