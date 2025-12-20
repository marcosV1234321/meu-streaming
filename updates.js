/**
 * MASTER FLIX - MODULO DE CONTROLE DE USUARIOS
 * Este arquivo injeta as abas de ADM dinamicamente.
 */

app.initAdminTabs = () => {
    const adminPanel = document.getElementById('admin-panel');
    if (!adminPanel || document.getElementById('admin-tabs')) return;

    // Injeta o menu de abas
    const tabsHTML = `
        <div id="admin-tabs" style="display:flex; gap:10px; margin-bottom:20px; border-bottom:1px solid #333; padding-bottom:10px;">
            <button onclick="app.switchTab('m')" style="background:none; color:white; border:none; cursor:pointer; font-weight:bold; padding:10px;">Mídias</button>
            <button onclick="app.switchTab('u')" style="background:none; color:var(--gold); border:none; cursor:pointer; font-weight:bold; padding:10px;">Usuários</button>
        </div>
        <div id="tab-users" class="hidden">
            <div id="users-list-container" style="display:grid; gap:10px;"></div>
        </div>
    `;

    const title = adminPanel.querySelector('h3');
    const defaultContent = document.getElementById('admin-content-default');
    
    title.insertAdjacentHTML('afterend', tabsHTML);
};

app.switchTab = (tab) => {
    const mediaTab = document.getElementById('admin-content-default');
    const userTab = document.getElementById('tab-users');
    
    if (tab === 'm') {
        mediaTab.classList.remove('hidden');
        userTab.classList.add('hidden');
    } else {
        mediaTab.classList.add('hidden');
        userTab.classList.remove('hidden');
        app.loadUsers();
    }
};

app.loadUsers = () => {
    const container = document.getElementById('users-list-container');
    container.innerHTML = "<p>Carregando Master...</p>";

    db.ref('users').on('value', snap => {
        container.innerHTML = "";
        snap.forEach(child => {
            const user = child.val();
            const uid = child.key;
            
            // Lógica de Validade
            const validade = user.expiry ? new Date(user.expiry).toLocaleDateString('pt-BR') : "Eterno";
            const statusColor = user.blocked ? "#ff4444" : "#00ff00";

            const userCard = `
                <div style="background:#000; padding:15px; border-radius:5px; border-left:4px solid ${statusColor};">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <p style="font-weight:bold; margin:0;">${user.email || 'Novo Master'}</p>
                            <small style="color:gray;">Vence em: ${validade}</small>
                        </div>
                        <div style="display:flex; gap:5px;">
                            <button onclick="app.setExpiry('${uid}')" title="Validade" style="background:#222; border:none; color:white; padding:8px; border-radius:4px;"><i class="fas fa-calendar"></i></button>
                            <button onclick="app.toggleBlock('${uid}', ${user.blocked})" title="Bloqueio" style="background:#222; border:none; color:${statusColor}; padding:8px; border-radius:4px;"><i class="fas fa-ban"></i></button>
                            <a href="https://wa.me/${user.phone || ''}" target="_blank" style="background:#25D366; color:white; padding:8px; border-radius:4px; text-decoration:none;"><i class="fab fa-whatsapp"></i></a>
                        </div>
                    </div>
                </div>
            `;
            container.innerHTML += userCard;
        });
    });
};

app.toggleBlock = (uid, current) => {
    db.ref('users/' + uid).update({ blocked: !current });
};

app.setExpiry = (uid) => {
    const dias = prompt("Quantos dias de acesso liberar?");
    if (dias) {
        const dataFim = new Date();
        dataFim.setDate(dataFim.getDate() + parseInt(dias));
        db.ref('users/' + uid).update({ expiry: dataFim.getTime() });
        alert("Acesso Master liberado!");
    }
};

console.log("Sistema Master Flix Pro Finalizado com Sucesso!");
