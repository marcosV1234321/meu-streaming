const firebaseConfig = {
    apiKey: "AIzaSyCzxrJMumx3lbjsOXv9JHdXrn29jUg3x_0",
    authDomain: "outflix-9e57d.firebaseapp.com",
    projectId: "outflix-9e57d",
    databaseURL: "https://outflix-9e57d-default-rtdb.asia-southeast1.firebasedatabase.app"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

let state = { allMedia: [], activeMedia: null, tempTMDB: null };

// CONVERSOR DE LINKS DRIVE E DROPBOX
const videoTools = {
    formatUrl: (url) => {
        if (!url) return "";
        if (url.includes("drive.google.com")) {
            const id = url.split('/d/')[1]?.split('/')[0] || url.split('id=')[1];
            return `https://docs.google.com/get_video_info?docid=${id}&format=google_drive`;
        }
        if (url.includes("dropbox.com")) {
            return url.replace("?dl=0", "?raw=1").replace("&dl=0", "&raw=1");
        }
        return url;
    }
};

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
    },
    closeModal: () => document.getElementById('modal-details').classList.add('hidden'),
    
    // PLAYER NA MESMA TELA
    startPlayer: () => {
        const media = state.activeMedia;
        if (!media) return;
        ui.closeModal();
        const playerOverlay = document.getElementById('video-player-overlay');
        playerOverlay.classList.remove('hidden');
        
        const finalUrl = videoTools.formatUrl(media.video);
        
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
    init: () => app.loadCatalog(),
    
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
        section.innerHTML = `
            <h2 class="section-title">${title}</h2>
            <div class="carousel">
                ${items.map(m => `<div class="card" onclick="app.openDetails('${m.key}')" style="background-image: url('${m.img}');"></div>`).join('')}
            </div>`;
        container.appendChild(section);
    },

    openDetails: (key) => {
        const media = state.allMedia.find(m => m.key === key);
        if (media) {
            state.activeMedia = media;
            document.getElementById('modal-cover').style.backgroundImage = `url('${media.img}')`;
            document.getElementById('modal-title').innerText = media.title;
            // SINOPSE CORRIGIDA
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
            document.getElementById('preview-area').innerHTML = `<p>✅ ${data.title}</p>`;
        } catch(e) { alert("Erro TMDB"); }
    },

    postMedia: () => {
        if(!state.tempTMDB) return;
        const url = document.getElementById('video-url').value;
        const cat = document.getElementById('manual-cat').value;
        db.ref('catalog').push({
            title: state.tempTMDB.title,
            sinopse: state.tempTMDB.overview, // SALVA A SINOPSE
            img: `https://image.tmdb.org/t/p/w500${state.tempTMDB.poster_path}`,
            video: url,
            category: cat || "Lançamentos"
        });
        alert("Publicado!");
    }
};

window.onload = app.init;
