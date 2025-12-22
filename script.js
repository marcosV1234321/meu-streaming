// 1. CONFIGURAÇÃO DO FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyCzxrJMumx3lbjsOXv9JHdXrn29jUg3x_0",
    authDomain: "outflix-9e57d.firebaseapp.com",
    projectId: "outflix-9e57d",
    databaseURL: "https://outflix-9e57d-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Inicialização Segura
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();
const auth = firebase.auth();

// 2. ESTADO DA APLICAÇÃO (MEMÓRIA)
let state = {
    allMedia: [],
    user: null,
    activeMedia: null
};

// 3. CONTROLE DE INTERFACE (UI)
const ui = {
    toggleSidebar: () => {
        document.getElementById('sidebar').classList.toggle('active');
        document.getElementById('sidebar-overlay').classList.toggle('active');
    },
    toggleSubmenu: (id) => {
        document.getElementById(id).classList.toggle('open');
    },
    toggleAdmin: () => {
        document.getElementById('admin-panel').classList.toggle('hidden');
    },
    switchTab: (tabName, event) => {
        // Esconde todas as abas
        document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        
        // Mostra a selecionada
        document.getElementById(`tab-${tabName}`).classList.remove('hidden');
        event.target.classList.add('active');

        if(tabName === 'users') app.loadUsers();
    },
    closeModal: () => {
        document.getElementById('modal-details').classList.add('hidden');
    },
    startPlayer: () => {
        const media = state.activeMedia;
        if (!media) return;

        ui.closeModal();
        const playerOverlay = document.getElementById('video-player-overlay');
        const container = document.getElementById('video-container');
        
        playerOverlay.classList.remove('hidden');
        container.innerHTML = `
            <video id="main-video" controls autoplay controlsList="nodownload">
                <source src="${media.video}" type="video/mp4">
                Seu navegador não suporta vídeos.
            </video>
        `;

        const videoEl = document.getElementById('main-video');
        
        // Se já assistiu antes, recupera o tempo
        if (media.savedTime) {
            videoEl.currentTime = media.savedTime;
        }

        // Salva o progresso a cada 5 segundos
        videoEl.ontimeupdate = () => {
            if (state.user && Math.floor(videoEl.currentTime) % 5 === 0) {
                app.saveProgress(media.key, videoEl.currentTime);
            }
        };
    },
    stopPlayer: () => {
        document.getElementById('video-player-overlay').classList.add('hidden');
        document.getElementById('video-container').innerHTML = ''; // Para o vídeo e limpa memória
    }
};

// 4. LÓGICA PRINCIPAL (APP)
const app = {
    init: () => {
        // Ouve se o usuário está logado ou não
        auth.onAuthStateChanged((firebaseUser) => {
            if (firebaseUser) {
                console.log("Usuário detectado:", firebaseUser.uid);
                
                // Busca dados do usuário no banco
                db.ref(`users/${firebaseUser.uid}`).on('value', (snapshot) => {
                    state.user = snapshot.val() || {};
                    state.user.uid = firebaseUser.uid;

                    // Se for admin, libera o botão
                    if (state.user.role === 'admin') {
                        document.getElementById('btn-master').classList.remove('hidden');
                    }
                    
                    // Carrega o catálogo
                    app.loadCatalog();
                });
            } else {
                console.log("Nenhum usuário logado.");
                // Opcional: Redirecionar para login.html
            }
        });
    },

    loadCatalog: () => {
        db.ref('catalog').on('value', (snapshot) => {
            const area = document.getElementById('catalog-area');
            area.innerHTML = ''; // Limpa tela
            state.allMedia = []; // Limpa memória local

            if (!snapshot.exists()) {
                area.innerHTML = '<p style="padding:20px; color:#666">Catálogo vazio Master.</p>';
                return;
            }

            // Converte objeto do Firebase para Array
            snapshot.forEach((child) => {
                const item = child.val();
                item.key = child.key;
                state.allMedia.push(item);
            });

            // 1. Renderiza seção "Continuar Assistindo" (Prioridade)
            db.ref(`users/${state.user.uid}/progress`).once('value', (progSnap) => {
                if (progSnap.exists()) {
                    const progressList = [];
                    progSnap.forEach(p => {
                        const progData = p.val();
                        // Encontra o filme correspondente nos dados carregados
                        const mediaMatch = state.allMedia.find(m => m.key === p.key);
                        if (mediaMatch) {
                            mediaMatch.savedTime = progData.time; // Injeta o tempo
                            progressList.push(mediaMatch);
                        }
                    });
                    
                    if (progressList.length > 0) {
                        app.renderSection(area, "Continuar Assistindo", progressList, true);
                    }
                }

                // 2. Renderiza Categorias Normais
                const categories = {};
                state.allMedia.forEach(media => {
                    const catName = media.category || "Outros"; // Evita "undefined"
                    if (!categories[catName]) categories[catName] = [];
                    categories[catName].push(media);
                });

                // Desenha cada fileira
                Object.keys(categories).forEach(cat => {
                    app.renderSection(area, cat, categories[cat]);
                });
            });
        });
    },

    renderSection: (container, title, items, showProgress = false) => {
        const section = document.createElement('div');
        section.innerHTML = `
            <h2 class="section-title">${title}</h2>
            <div class="carousel">
                ${items.map(m => `
                    <div class="card" 
                         style="background-image: url('${m.img}')"
                         onclick="app.openDetails('${m.key}')">
                         ${showProgress ? '<div class="progress-bar" style="width:50%"></div>' : ''}
                    </div>
                `).join('')}
            </div>
        `;
        container.appendChild(section);
    },

    openDetails: (key) => {
        const media = state.allMedia.find(m => m.key === key);
        if (media) {
            state.activeMedia = media;
            
            // Preenche o modal
            document.getElementById('modal-cover').style.backgroundImage = `url('${media.img}')`;
            document.getElementById('modal-title').innerText = media.title;
            document.getElementById('modal-desc').innerText = media.sinopse || "Sem descrição.";
            document.getElementById('modal-cat').innerText = media.category || "Filme";
            
            document.getElementById('modal-details').classList.remove('hidden');
        }
    },

    saveProgress: (mediaKey, time) => {
        if (state.user) {
            db.ref(`users/${state.user.uid}/progress/${mediaKey}`).update({
                time: time,
                lastUpdated: Date.now()
            });
        }
    },

    // FUNÇÕES DO PAINEL MASTER (ADMIN)
    fetchTMDB: async () => {
        const id = document.getElementById('tmdb-id').value;
        if (!id) return alert("Digite um ID!");

        try {
            const res = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=2eaf2fd731f81a77741ecb625b588a40&language=pt-BR`);
            const data = await res.json();
            
            if (data.success === false) throw new Error("Filme não encontrado");

            // Preview para o Admin
            document.getElementById('preview-area').innerHTML = `
                <div style="display:flex; gap:10px; margin:10px 0; background:#000; padding:10px; border-radius:4px;">
                    <img src="https://image.tmdb.org/t/p/w200${data.poster_path}" style="height:100px;">
                    <div>
                        <strong>${data.title}</strong>
                        <p style="font-size:12px; margin-top:5px;">${data.overview.substring(0, 100)}...</p>
                    </div>
                </div>
            `;
            
            // Guarda dados temporários para postar
            state.tempTMDB = data;
            
        } catch (error) {
            alert("Erro: " + error.message);
        }
    },

    postMedia: () => {
        if (!state.tempTMDB) return alert("Primeiro busque o filme pelo ID!");
        const videoUrl = document.getElementById('video-url').value;
        const manualCat = document.getElementById('manual-cat').value;

        if (!videoUrl) return alert("Falta o link do vídeo!");

        const movieData = state.tempTMDB;
        
        db.ref('catalog').push({
            title: movieData.title,
            sinopse: movieData.overview,
            img: `https://image.tmdb.org/t/p/w500${movieData.poster_path}`,
            backdrop: `https://image.tmdb.org/t/p/original${movieData.backdrop_path}`,
            video: videoUrl,
            category: manualCat || (movieData.genres && movieData.genres[0] ? movieData.genres[0].name : "Geral"),
            dateAdded: Date.now()
        }, (error) => {
            if (error) alert("Erro no Firebase");
            else {
                alert("Filme Postado com Sucesso Master!");
                document.getElementById('preview-area').innerHTML = "";
                document.getElementById('tmdb-id').value = "";
                document.getElementById('video-url').value = "";
                state.tempTMDB = null;
            }
        });
    },

    loadUsers: () => {
        const listDiv = document.getElementById('users-list');
        listDiv.innerHTML = "Carregando...";
        
        db.ref('users').once('value', (snap) => {
            listDiv.innerHTML = "";
            snap.forEach(u => {
                const user = u.val();
                const uid = u.key;
                
                listDiv.innerHTML += `
                    <div style="background:#000; padding:15px; margin-bottom:5px; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <strong>${user.email || "Sem Email"}</strong><br>
                            <small style="color:${user.blocked ? 'red' : 'green'}">
                                ${user.blocked ? 'BLOQUEADO' : 'ATIVO'}
                            </small>
                        </div>
                        <div>
                            <button onclick="app.blockUser('${uid}', ${!user.blocked})" style="padding:5px 10px; cursor:pointer;">
                                ${user.blocked ? 'Desbloquear' : 'Bloquear'}
                            </button>
                        </div>
                    </div>
                `;
            });
        });
    },

    blockUser: (uid, shouldBlock) => {
        db.ref(`users/${uid}`).update({ blocked: shouldBlock });
        setTimeout(() => app.loadUsers(), 500); // Recarrega a lista
    },

    search: () => {
        const term = document.getElementById('search-input').value.toLowerCase();
        const area = document.getElementById('catalog-area');
        
        if (term.length < 2) {
            app.loadCatalog(); // Restaura tudo se apagar a busca
            return;
        }

        const filtered = state.allMedia.filter(m => m.title.toLowerCase().includes(term));
        area.innerHTML = "";
        app.renderSection(area, `Resultados para "${term}"`, filtered);
    },
    
    filterByCat: (catName) => {
        const area = document.getElementById('catalog-area');
        const filtered = state.allMedia.filter(m => (m.category && m.category.includes(catName)));
        area.innerHTML = "";
        app.renderSection(area, catName, filtered);
        ui.toggleSidebar(); // Fecha o menu
    }
};

// Iniciar Aplicação
window.onload = app.init;
