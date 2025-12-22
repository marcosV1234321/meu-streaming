// 1. CONFIGURAÇÃO DO FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyCzxrJMumx3lbjsOXv9JHdXrn29jUg3x_0",
    authDomain: "outflix-9e57d.firebaseapp.com",
    projectId: "outflix-9e57d",
    databaseURL: "https://outflix-9e57d-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Inicializa apenas se necessário
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

let state = { allMedia: [], activeMedia: null, tempTMDB: null };

// 2. INTERFACE (UI)
const ui = {
    toggleSidebar: () => {
        document.getElementById('sidebar').classList.toggle('active');
        document.getElementById('sidebar-overlay').classList.toggle('active');
    },
    toggleSubmenu: (id) => document.getElementById(id).classList.toggle('open'),
    toggleAdmin: () => document.getElementById('admin-panel').classList.toggle('hidden'),
    
    switchTab: (tabName, event) => {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`tab-${tabName}`).classList.remove('hidden');
        if(event) event.target.classList.add('active');
    },

    closeModal: () => document.getElementById('modal-details').classList.add('hidden'),

    startPlayer: () => {
        const media = state.activeMedia;
        if (!media) return;
        ui.closeModal();
        const playerOverlay = document.getElementById('video-player-overlay');
        playerOverlay.classList.remove('hidden');
        
        document.getElementById('video-container').innerHTML = `
            <video id="main-video" controls autoplay style="width:100%;height:100%;background:black">
                <source src="${media.video}" type="video/mp4">
            </video>`;
    },

    stopPlayer: () => {
        document.getElementById('video-player-overlay').classList.add('hidden');
        document.getElementById('video-container').innerHTML = '';
    }
};

// 3. LÓGICA DO APP (APP)
const app = {
    init: () => {
        console.log("Iniciando App...");
        // Carrega o catálogo IMEDIATAMENTE, sem esperar login
        app.loadCatalog();
    },

    loadCatalog: () => {
        const area = document.getElementById('catalog-area');
        
        db.ref('catalog').on('value', (snapshot) => {
            area.innerHTML = '';
            state.allMedia = [];

            if (!snapshot.exists()) {
                area.innerHTML = '<div style="padding:50px; text-align:center; color:#666">⚠ Banco de dados vazio. Use o botão PAINEL para adicionar filmes.</div>';
                return;
            }

            snapshot.forEach((child) => {
                const item = child.val();
                item.key = child.key;
                state.allMedia.push(item);
            });

            // Agrupar por Categoria
            const categories = {};
            state.allMedia.forEach(m => {
                const cat = m.category || "Geral";
                if (!categories[cat]) categories[cat] = [];
                categories[cat].push(m);
            });

            // Desenhar na tela
            Object.keys(categories).forEach(cat => {
                app.renderSection(area, cat, categories[cat]);
            });
        });
    },

    renderSection: (container, title, items) => {
        const html = `
            <div class="section-container">
                <h2 class="section-title">${title}</h2>
                <div class="carousel">
                    ${items.map(m => `
                        <div class="card" onclick="app.openDetails('${m.key}')" 
                             style="background-image: url('${m.img}');">
                        </div>
                    `).join('')}
                </div>
            </div>`;
        container.innerHTML += html;
    },

    openDetails: (key) => {
        const media = state.allMedia.find(m => m.key === key);
        if (media) {
            state.activeMedia = media;
            document.getElementById('modal-cover').style.backgroundImage = `url('${media.img}')`;
            document.getElementById('modal-title').innerText = media.title;
            document.getElementById('modal-desc').innerText = media.sinopse || "Sem sinopse";
            document.getElementById('modal-cat').innerText = media.category || "Filme";
            document.getElementById('modal-details').classList.remove('hidden');
        }
    },

    // --- FUNÇÕES DE ADMINISTRAÇÃO ---
    fetchTMDB: async () => {
        const id = document.getElementById('tmdb-id').value;
        if(!id) return alert("Por favor, digite o ID do TMDB!");
        
        try {
            const res = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=2eaf2fd731f81a77741ecb625b588a40&language=pt-BR`);
            const data = await res.json();
            
            if(!data.title) throw new Error("Filme não encontrado no TMDB");

            state.tempTMDB = data;
            
            document.getElementById('preview-area').innerHTML = `
                <div style="background:#222; padding:10px; margin-top:10px; border-radius:4px; display:flex; gap:10px; align-items:center;">
                    <img src="https://image.tmdb.org/t/p/w200${data.poster_path}" style="height:60px;">
                    <div>
                        <strong>${data.title}</strong>
                        <p style="font-size:12px; color:#aaa">Pronto para publicar!</p>
                    </div>
                </div>`;
                
        } catch(e) { alert("Erro ao buscar: " + e.message); }
    },

    postMedia: () => {
        if(!state.tempTMDB) return alert("Busque o filme pelo ID primeiro!");
        const url = document.getElementById('video-url').value;
        const cat = document.getElementById('manual-cat').value;
        
        if(!url) return alert("Você precisa colocar o Link do Vídeo!");

        const movieData = state.tempTMDB;

        db.ref('catalog').push({
            title: movieData.title,
            sinopse: movieData.overview,
            img: `https://image.tmdb.org/t/p/w500${movieData.poster_path}`,
            video: url,
            category: cat || "Lançamentos"
        });

        alert("Mídia publicada com sucesso Master!");
        
        // Limpar campos
        document.getElementById('preview-area').innerHTML = "";
        document.getElementById('tmdb-id').value = "";
        document.getElementById('video-url').value = "";
        state.tempTMDB = null;
    },

    search: () => {
        const term = document.getElementById('search-input').value.toLowerCase();
        const area = document.getElementById('catalog-area');
        
        if(!term) {
            app.loadCatalog();
            return;
        }
        
        const filtered = state.allMedia.filter(m => m.title.toLowerCase().includes(term));
        area.innerHTML = "";
        app.renderSection(area, "Resultados da Busca", filtered);
    },
    
    filterByCat: (catName) => {
        const area = document.getElementById('catalog-area');
        const filtered = state.allMedia.filter(m => (m.category && m.category.includes(catName)));
        area.innerHTML = "";
        app.renderSection(area, catName, filtered);
        ui.toggleSidebar();
    }
};

window.onload = app.init;
