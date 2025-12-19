// Monitor de Catálogo, Estatísticas e Player Pro
const PlayerCore = {
    init() {
        this.renderCatalog();
        this.renderAdminStats();
        console.log("Sistema Master Flix: Online");
    },

    // 1. RENDERIZAR VITRINE DO USUÁRIO
    renderCatalog() {
        const rows = {
            movie: document.getElementById('row-movies'),
            tv: document.getElementById('row-series')
        };

        db.ref('catalog').on('value', (snapshot) => {
            rows.movie.innerHTML = "";
            rows.tv.innerHTML = "";
            if (!snapshot.exists()) return;

            snapshot.forEach((item) => {
                const media = item.val();
                const card = document.createElement('div');
                card.className = 'card';
                card.style.backgroundImage = `url(${media.img})`;
                // Ao clicar, conta a visualização e abre o player
                card.onclick = () => {
                    this.countView(item.key);
                    this.openAdvancedPlayer(media);
                };
                
                if (rows[media.type]) rows[media.type].appendChild(card);
            });
        });
    },

    // 2. SISTEMA DE VISUALIZAÇÕES (MAIS ASSISTIDOS)
    countView(mediaId) {
        const viewRef = db.ref(`catalog/${mediaId}/views`);
        viewRef.transaction((currentViews) => {
            return (currentViews || 0) + 1;
        });
    },

    // 3. ÁREA EXCLUSIVA DO ADM (Mídias e Estatísticas)
    renderAdminStats() {
        const adminView = document.getElementById('admin-view');
        if (!adminView) return;

        // Criar container de mídias se não existir
        let statsBox = document.getElementById('admin-stats-box');
        if (!statsBox) {
            statsBox = document.createElement('div');
            statsBox.id = 'admin-stats-box';
            statsBox.style.marginTop = "20px";
            statsBox.innerHTML = `<h4>📊 MÍDIAS ADICIONADAS E PERFORMANCE</h4><div id="media-list-adm"></div>`;
            adminView.appendChild(statsBox);
        }

        db.ref('catalog').on('value', (snapshot) => {
            const list = document.getElementById('media-list-adm');
            list.innerHTML = "";
            
            let mídias = [];
            snapshot.forEach(child => {
                mídias.push({ key: child.key, ...child.val() });
            });

            // Ordenar por mais assistidos
            mídias.sort((a, b) => (b.views || 0) - (a.views || 0));

            mídias.forEach(m => {
                list.innerHTML += `
                    <div style="background:#333; margin-bottom:5px; padding:10px; border-radius:4px; display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:13px;"><b>${m.title}</b> | 👁️ ${m.views || 0} views</span>
                        <button onclick="PlayerCore.deleteMedia('${m.key}')" style="background:red; color:white; border:none; border-radius:3px; cursor:pointer;">Remover</button>
                    </div>
                `;
            });
        });
    },

    // 4. REMOVER MÍDIA DO BANCO
    deleteMedia(key) {
        if(confirm("Deseja remover esta mídia definitivamente?")) {
            db.ref(`catalog/${key}`).remove();
        }
    },

    // 5. PLAYER PRO
    openAdvancedPlayer(media) {
        const playerModal = document.getElementById('player-modal');
        const container = document.getElementById('video-container');
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        const quality = (connection && connection.saveData) ? "480p (Reduzida)" : "1080p (Auto)";

        container.innerHTML = `
            <div style="position:relative; width:100%; height:100%;">
                <video id="main-video" controls autoplay style="width:100%; height:100%;">
                    <source src="${media.video}" type="video/mp4">
                    <track label="Português" kind="subtitles" srclang="pt" src="${media.subtitle || ''}" default>
                </video>
                <div style="position:absolute; bottom:70px; left:20px; z-index:2200;">
                    <span style="background:rgba(229, 9, 20, 0.9); padding:5px 10px; border-radius:4px; font-size:11px;">
                        📶 ${quality} | CC: Ativado
                    </span>
                </div>
            </div>
        `;
        playerModal.style.display = 'block';
    }
};

// --- FUNÇÕES GLOBAIS ---
function closePlayer() {
    document.getElementById('player-modal').style.display = 'none';
    document.getElementById('video-container').innerHTML = "";
}

async function addMedia() {
    const id = document.getElementById('adm-id').value;
    const type = document.getElementById('adm-type').value;
    const url = document.getElementById('adm-url').value;
    const sub = document.getElementById('adm-sub').value;
    const TMDB_KEY = "2eaf2fd731f81a77741ecb625b588a40";

    if(!id || !url) return alert("Preencha ID e Link!");

    try {
        const res = await fetch(`https://api.themoviedb.org/3/${type}/${id}?api_key=${TMDB_KEY}&language=pt-BR`);
        const d = await res.json();

        await db.ref('catalog').push({
            title: d.title || d.name,
            img: `https://image.tmdb.org/t/p/w500${d.poster_path}`,
            video: url,
            subtitle: sub,
            type: type,
            views: 0 // Inicia com zero visualizações
        });

        alert("Publicado com Sucesso!");
        document.getElementById('adm-id').value = "";
        document.getElementById('adm-url').value = "";
    } catch(e) { alert("Erro TMDB!"); }
}

PlayerCore.init();
