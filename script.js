const firebaseConfig = {
    apiKey: "AIzaSyCzxrJMumx3lbjsOXv9JHdXrn29jUg3x_0",
    authDomain: "outflix-9e57d.firebaseapp.com",
    projectId: "outflix-9e57d",
    databaseURL: "https://outflix-9e57d-default-rtdb.asia-southeast1.firebasedatabase.app"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

let state = { allMedia: [], activeMedia: null, tempTMDB: null, apiKeys: [] };

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
        event.target.classList.add('active');
        if(tabName === 'users') app.loadUsers();
        if(tabName === 'config') app.renderApiList();
    },
    closeModal: () => document.getElementById('modal-details').classList.add('hidden'),
    startPlayer: () => {
        const media = state.activeMedia;
        if (!media) return;
        ui.closeModal();
        document.getElementById('video-player-overlay').classList.remove('hidden');
        
        // Pega a primeira chave do tipo correspondente
        const keyObj = state.apiKeys.find(k => media.video.includes(k.type === 'gdrive' ? 'drive' : 'dropbox'));
        let finalUrl = media.video;

        if (media.video.includes("drive.google.com")) {
            const id = media.video.split('/d/')[1]?.split('/')[0] || media.video.split('id=')[1];
            finalUrl = keyObj ? `https://www.googleapis.com/drive/v3/files/${id}?alt=media&key=${keyObj.value}` : `https://docs.google.com/get_video_info?docid=${id}&format=google_drive`;
        } else if (media.video.includes("dropbox.com")) {
            finalUrl = media.video.replace("?dl=0", "?raw=1");
        }

        document.getElementById('video-container').innerHTML = `
            <video id="main-video" controls autoplay playsinline style="width:100%; height:100%; background:#000;">
                <source src="${finalUrl}" type="video/mp4">
            </video>`;
    },
    stopPlayer: () => {
        document.getElementById('video-player-overlay').classList.add('hidden');
        document.getElementById('video-container').innerHTML = '';
    }
};

const app = {
    init: () => {
        app.loadCatalog();
        app.loadApiKeys();
    },

    // --- GESTÃO DE APIs ---
    loadApiKeys: () => {
        db.ref('settings/apiKeys').on('value', snap => {
            state.apiKeys = [];
            if(snap.exists()) {
                snap.forEach(child => {
                    state.apiKeys.push({ key: child.key, ...child.val() });
                });
            }
            app.renderApiList();
        });
    },

    saveApiKey: () => {
        const label = document.getElementById('api-label').value;
        const value = document.getElementById('api-value').value;
        const type = document.getElementById('api-type').value;
        if(!label || !value) return alert("Preencha os campos!");

        db.ref('settings/apiKeys').push({ label, value, type }).then(() => {
            document.getElementById('api-label').value = "";
            document.getElementById('api-value').value = "";
            alert("Chave adicionada, Master!");
        });
    },

    deleteApiKey: (id) => {
        if(confirm("Deseja remover esta chave?")) db.ref(`settings/apiKeys/${id}`).remove();
    },

    renderApiList: () => {
        const list = document.getElementById('api-keys-list');
        list.innerHTML = state.apiKeys.map(k => `
            <div style="display:flex; justify-content:space-between; padding:10px; border-bottom:1px solid #222; align-items:center;">
                <div>
                    <strong>${k.label}</strong><br>
                    <small style="color:#666;">${k.type.toUpperCase()} • ****${k.value.slice(-4)}</small>
                </div>
                <button onclick="app.deleteApiKey('${k.key}')" style="background:#ff4444; color:white; border:none; padding:5px 10px; border-radius:3px;">Excluir</button>
            </div>
        `).join('') || '<p style="color:#666;">Nenhuma chave cadastrada.</p>';
    },

    // --- GESTÃO DE USUÁRIOS ---
    loadUsers: () => {
        db.ref('users').on('value', snap => {
            const list = document.getElementById('users-display-list');
            list.innerHTML = '';
            if(!snap.exists()) return list.innerHTML = "Sem usuários.";
            snap.forEach(u => {
                const user = u.val();
                list.innerHTML += `<div style="padding:10px; border-bottom:1px solid #222;">${user.email || 'Usuário Master'}</div>`;
            });
        });
    },

    // --- CATÁLOGO ---
    loadCatalog: () => {
        db.ref('catalog').on('value', (snapshot) => {
            const area = document.getElementById('catalog-area');
            area.innerHTML = '';
            state.allMedia = [];
            if (!snapshot.exists()) return;
            snapshot.forEach((child) => {
                const item = child.val();
                item.key = child.key;
                state.allMedia.push(item);
            });
            const categories = {};
            state.allMedia.forEach(m => {
                const cat = m.category || "Geral";
                if (!categories[cat]) categories[cat] = [];
                categories[cat].push(m);
            });
            Object.keys(categories).forEach(cat => app.renderSection(area, cat, categories[cat]));
        });
    },

    renderSection: (container, title, items) => {
        const section = document.createElement('div');
        section.className = "section-container";
        section.innerHTML = `<h2 class="section-title">${title}</h2><div class="carousel">${items.map(m => `<div class="card" onclick="app.openDetails('${m.key}')" style="background-image: url('${m.img}');"></div>`).join('')}</div>`;
        container.appendChild(section);
    },

    openDetails: (key) => {
        const media = state.allMedia.find(m => m.key === key);
        if (media) {
            state.activeMedia = media;
            document.getElementById('modal-cover').style.backgroundImage = `url('${media.img}')`;
            document.getElementById('modal-title').innerText = media.title;
            document.getElementById('modal-desc').innerText = media.sinopse || "Sem descrição.";
            document.getElementById('modal-cat').innerText = media.category || "Mídia";
            document.getElementById('modal-details').classList.remove('hidden');
        }
    },

    fetchTMDB: async () => {
        const id = document.getElementById('tmdb-id').value;
        try {
            const res = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=2eaf2fd731f81a77741ecb625b588a40&language=pt-BR`);
            const data = await res.json();
            state.tempTMDB = data;
            document.getElementById('preview-area').innerHTML = `<p style="color:green; margin-top:10px;">✅ ${data.title}</p>`;
        } catch(e) { alert("Erro TMDB"); }
    },

    postMedia: () => {
        if(!state.tempTMDB) return;
        const url = document.getElementById('video-url').value;
        const cat = document.getElementById('manual-cat').value;
        db.ref('catalog').push({
            title: state.tempTMDB.title,
            sinopse: state.tempTMDB.overview,
            img: `https://image.tmdb.org/t/p/w500${state.tempTMDB.poster_path}`,
            video: url,
            category: cat
        }).then(() => alert("Mídia Publicada!"));
    },

    search: () => {
        const term = document.getElementById('search-input').value.toLowerCase();
        if(!term) return app.loadCatalog();
        const filtered = state.allMedia.filter(m => m.title.toLowerCase().includes(term));
        document.getElementById('catalog-area').innerHTML = "";
        app.renderSection(document.getElementById('catalog-area'), "Resultados", filtered);
    },

    filterByCat: (catName) => {
        const filtered = state.allMedia.filter(m => m.category === catName);
        document.getElementById('catalog-area').innerHTML = "";
        app.renderSection(document.getElementById('catalog-area'), catName, filtered);
        ui.toggleSidebar();
    }
};

window.onload = app.init;
