<script>
// CONFIGURAÇÃO MASTER
const firebaseConfig = {
    apiKey: "AIzaSyCzxrJMumx3lbjsOXv9JHdXrn29jUg3x_0",
    authDomain: "outflix-9e57d.firebaseapp.com",
    projectId: "outflix-9e57d",
    databaseURL: "https://outflix-9e57d-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// INICIALIZAÇÃO SEGURA
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.database();
const auth = firebase.auth();

let allMedia = [];
let currentUser = null;
let activeMedia = null;

const ui = {
    toggleSidebar: () => {
        const s = document.getElementById('sidebar');
        const o = document.getElementById('sidebar-overlay');
        s.classList.toggle('open');
        o.style.display = s.classList.contains('open') ? 'block' : 'none';
    },
    toggleSubmenu: (id) => {
        document.getElementById(id).classList.toggle('active');
    },
    toggleAdmin: () => {
        document.getElementById('admin-panel').classList.toggle('hidden');
    },
    switchTab: (e, tabId) => {
        document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
        document.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active'));
        document.getElementById(tabId).classList.remove('hidden');
        if (e) e.target.classList.add('active');
        
        if(tabId === 'tab-users') app.loadUsers();
    },
    closeModal: () => {
        document.getElementById('modal-details').classList.add('hidden');
    },
    play: (time = 0) => {
        if (!activeMedia) return;
        ui.closeModal();
        document.getElementById('player-overlay').classList.remove('hidden');
        document.getElementById('v-container').innerHTML = `
            <video id="video-core" controls autoplay style="width:100%;height:100%">
                <source src="${activeMedia.video}" type="video/mp4">
            </video>`;
        
        const v = document.getElementById('video-core');
        if(time) v.currentTime = time;
        
        v.ontimeupdate = () => {
            if(Math.floor(v.currentTime) % 10 === 0 && v.currentTime > 5) {
                app.saveProgress(v.currentTime);
            }
        };
    },
    closePlayer: () => {
        document.getElementById('player-overlay').classList.add('hidden');
        document.getElementById('v-container').innerHTML = "";
    }
};

const app = {
    init: () => {
        auth.onAuthStateChanged((user) => {
            if (user) {
                db.ref('users/' + user.uid).on('value', snap => {
                    currentUser = snap.val() || {};
                    currentUser.uid = user.uid;
                    if(currentUser.role === 'admin') {
                        document.getElementById('btn-adm').classList.remove('hidden');
                    }
                    app.loadCatalog();
                });
            } else {
                console.log("Usuário deslogado");
                // Aqui você pode redirecionar para login.html se tiver um
            }
        });
    },
    loadCatalog: () => {
        db.ref('catalog').on('value', snap => {
            const area = document.getElementById('catalog-area');
            if (!area) return;
            area.innerHTML = "";
            allMedia = [];
            
            if (!snap.exists()) {
                area.innerHTML = "<p style='padding:20px'>Nenhum filme cadastrado Master.</p>";
                return;
            }

            snap.forEach(child => {
                const m = child.val();
                m.key = child.key;
                allMedia.push(m);
            });

            // Lógica de Seções
            const groups = {};
            allMedia.forEach(m => {
                const cat = m.genre || m.category || "Destaques";
                if(!groups[cat]) groups[cat] = [];
                groups[cat].push(m);
            });

            for(let name in groups) {
                app.renderSection(area, name, groups[name]);
            }
        });
    },
    renderSection: (container, title, items) => {
        const section = document.createElement('div');
        section.className = "section-container";
        section.innerHTML = `<h2 class="section-title">${title}</h2><div class="carousel-cards"></div>`;
        const row = section.querySelector('.carousel-cards');
        
        items.forEach(m => {
            const card = document.createElement('div');
            card.className = "card";
            card.style.backgroundImage = `url(${m.img})`;
            card.onclick = () => app.details(m);
            row.appendChild(card);
        });
        container.appendChild(section);
    },
    details: (m) => {
        activeMedia = m;
        document.getElementById('m-preview').style.backgroundImage = `url(${m.img})`;
        document.getElementById('m-title').innerText = m.title;
        document.getElementById('m-sinopse').innerText = m.sinopse;
        document.getElementById('modal-details').classList.remove('hidden');
    },
    post: async () => {
        const id = document.getElementById('tmdb-id').value;
        const url = document.getElementById('video-url').value;
        const cat = document.getElementById('sub-cat').value;
        
        if(!id || !url) return alert("Mestre, preencha o ID do TMDB e o Link!");

        try {
            const res = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=2eaf2fd731f81a77741ecb625b588a40&language=pt-BR`);
            const d = await res.json();
            
            db.ref('catalog').push({
                title: d.title || "Sem título",
                img: `https://image.tmdb.org/t/p/w500${d.poster_path}`,
                sinopse: d.overview || "Sem sinopse",
                video: url,
                genre: cat || (d.genres && d.genres[0] ? d.genres[0].name : "Filmes")
            });
            alert("Sucesso! Filme adicionado.");
        } catch(e) {
            alert("Erro ao buscar dados do TMDB.");
        }
    },
    saveProgress: (time) => {
        if(currentUser && activeMedia) {
            db.ref(`users/${currentUser.uid}/progress/${activeMedia.key}`).update({
                time: time,
                lastSeen: Date.now(),
                media: activeMedia
            });
        }
    },
    loadUsers: () => {
        const container = document.getElementById('users-list-container');
        db.ref('users').once('value', snap => {
            container.innerHTML = "";
            snap.forEach(u => {
                const user = u.val();
                container.innerHTML += `
                <div class="user-item">
                    <div class="user-info">
                        <p><strong>${user.email || 'Sem Email'}</strong></p>
                        <p>Status: ${user.blocked ? '🚫 Bloqueado' : '✅ Ativo'}</p>
                    </div>
                    <div class="user-actions">
                        <button class="btn-u" style="background:var(--gold); color:black" onclick="app.setExpiry('${u.key}')">VALIDADE</button>
                    </div>
                </div>`;
            });
        });
    }
};

// Iniciar ao carregar
window.onload = app.init;
</script>
