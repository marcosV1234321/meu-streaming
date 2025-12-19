// Função para abrir o formulário de cadastro Master
function abrirCadastroCustom() {
    const modalHtml = `
    <div id="modal-auth" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:9999; display:flex; align-items:center; justify-content:center;">
        <div style="background:#222; padding:30px; border-radius:10px; width:90%; max-width:350px; text-align:center; border:1px solid #e50914;">
            <h2 style="color:#e50914; margin-bottom:20px;">NOVO CADASTRO</h2>
            <input type="email" id="new-email" placeholder="Seu melhor e-mail" style="width:100%; padding:12px; margin-bottom:10px; background:#333; border:none; color:white; border-radius:5px;">
            <input type="password" id="new-pass" placeholder="Crie uma senha" style="width:100%; padding:12px; margin-bottom:20px; background:#333; border:none; color:white; border-radius:5px;">
            <button onclick="executarCadastroMaster()" style="width:100%; padding:12px; background:#e50914; color:white; border:none; border-radius:5px; font-weight:bold; cursor:pointer;">FINALIZAR E LIBERAR 7 DIAS</button>
            <p onclick="document.getElementById('modal-auth').remove()" style="color:#aaa; margin-top:15px; cursor:pointer; font-size:12px;">Cancelar</p>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// Executa o cadastro e força a criação no Realtime Database
async function executarCadastroMaster() {
    const email = document.getElementById('new-email').value.trim();
    const pass = document.getElementById('new-pass').value.trim();

    if(!email || !pass) return alert("Preencha todos os campos!");

    try {
        const res = await auth.createUserWithEmailAndPassword(email, pass);
        const exp = new Date(); 
        exp.setDate(exp.getDate() + 7);

        // Força a gravação na pasta users que você está procurando
        await db.ref('users/' + res.user.uid).set({
            email: email,
            role: 'user',
            valido_ate: exp.toISOString(),
            last_watched: 'Novo Usuário'
        });

        alert("Conta Master criada! A pasta 'users' agora aparecerá no seu Firebase.");
        location.reload();
    } catch (error) {
        if(error.code === 'auth/email-already-in-use') {
            alert("Este e-mail já existe! Tente apenas fazer LOGIN ou use outro e-mail.");
        } else {
            alert("Erro: " + error.message);
        }
    }
}
