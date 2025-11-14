// Manejo de creación de post y vista de post individual
document.addEventListener('DOMContentLoaded', () => {
    // Si estamos en la página de crear post
    const createForm = document.getElementById('createPostForm');
    if (createForm) {
        // Preview imagen de post al seleccionarla
        const postImageFileInput = document.getElementById('postImageFile');
        const postImagePreviewImg = document.getElementById('postImagePreviewImg');
        if (postImageFileInput) {
            postImageFileInput.addEventListener('change', () => {
                const f = postImageFileInput.files[0];
                if (!f) {
                    postImagePreviewImg.style.display = 'none';
                    return;
                }
                const fr = new FileReader();
                fr.onload = (ev) => {
                    postImagePreviewImg.src = ev.target.result;
                    postImagePreviewImg.style.display = 'block';
                };
                fr.readAsDataURL(f);
            });
        }
        createForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!checkAuth()) return;
            const title = document.getElementById('title').value.trim();
            const content = document.getElementById('content').value.trim();
            const imageFileInput = document.getElementById('postImageFile');
            const imageFile = imageFileInput && imageFileInput.files && imageFileInput.files[0] ? imageFileInput.files[0] : null;
            let imageUrl = null;
            const status = document.getElementById('statusMessage');
            status.textContent = 'Publicando...';

            try {
                if (imageFile) {
                    status.textContent = 'Subiendo imagen...';
                    const uploaded = await uploadToImgbb(imageFile);
                    if (uploaded && uploaded.data && uploaded.data.url) imageUrl = uploaded.data.url;
                }

                // Intentar insertar incluyendo image_url; si la columna no existe, reintentar sin ella
                let result;
                try {
                    result = await supabase
                        .from('posts')
                        .insert([{ title, content, image_url: imageUrl, user_id: currentUser.id }]);
                } catch (e) {
                    // Algunos errores de la librería vienen aquí
                    console.error('Error durante insert (primero):', e);
                    throw e;
                }

                // Manejar respuesta / error de PostgREST
                if (result && result.error) {
                    // Si la columna image_url no existe, reintentar sin esa columna
                    const msg = (result.error && result.error.message) || '';
                    if (msg.includes("Could not find the 'image_url' column")) {
                        console.warn('La columna image_url no existe en la tabla posts; reintentando sin image_url');
                        const { data: data2, error: error2 } = await supabase
                            .from('posts')
                            .insert([{ title, content, user_id: currentUser.id }]);
                        if (error2) throw error2;
                    } else {
                        throw result.error;
                    }
                }
                status.textContent = 'Publicado correctamente.';
                setTimeout(() => window.location.href = '../index.html', 900);
            } catch (err) {
                console.error('Error creando post:', err);
                // Si fue un problema de red / DNS o CORS, intentar dar feedback útil
                if (err && err.message && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('ERR_NAME_NOT_RESOLVED'))) {
                    status.textContent = 'Error de red: no se pudo conectar a Supabase. Verifica la URL y tu conexión.';
                } else if (err && err.code === 'PGRST204') {
                    status.textContent = 'Error en la API: columna inexistente. Revisa el esquema de la tabla posts.';
                } else {
                    status.textContent = 'Error al publicar. Revisa la consola para más detalles.';
                }
            }
        });
    }

    // Si estamos en la vista de post individual
    const postContainer = document.getElementById('postContainer');
    if (postContainer) {
        const params = new URLSearchParams(window.location.search);
        const postId = params.get('id');
        if (!postId) {
            postContainer.innerHTML = '<p>Post no encontrado.</p>';
            return;
        }

        loadPost(postId);

        // Reply
        const replyBtn = document.getElementById('replyBtn');
        if (replyBtn) {
            replyBtn.addEventListener('click', async () => {
                if (!checkAuth()) return;
                const content = document.getElementById('replyContent').value.trim();
                if (!content) return;
                replyBtn.disabled = true;
                try {
                    const { data, error } = await supabase.from('replies').insert([{
                        post_id: postId,
                        user_id: currentUser.id,
                        content
                    }]);
                    if (error) throw error;
                    document.getElementById('replyContent').value = '';
                    await loadPost(postId);
                } catch (err) {
                    console.error(err);
                } finally {
                    replyBtn.disabled = false;
                }
            });
        }
    }
});

async function loadPost(postId) {
    const container = document.getElementById('postContainer');
    container.innerHTML = `
        <div class="loading-spinner">
            <svg class="spinner" viewBox="0 0 50 50"><circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle></svg>
            <p>Cargando post...</p>
        </div>
    `;

    try {
        const { data: posts } = await supabase
            .from('posts')
            .select('*, users (username, avatar_url), replies(id, content, user_id, created_at, users(username))')
            .eq('id', postId)
            .limit(1)
            .single();

        const post = posts;
        if (!post) {
            container.innerHTML = '<p>Post no encontrado.</p>';
            return;
        }

        const avatar = (post.users && post.users.avatar_url) || `https://ui-avatars.com/api/?name=${post.users ? post.users.username : 'User'}&background=000&color=fff`;

        container.innerHTML = `
            <div class="post-detail">
                <div style="display:flex;gap:1rem;align-items:center;margin-bottom:0.5rem;">
                    <img src="${avatar}" alt="avatar" style="width:48px;height:48px;border-radius:50%;object-fit:cover;">
                    <div>
                        <strong>@${post.users ? post.users.username : 'user'}</strong>
                        <div style="font-size:0.85rem;color:#666;">${new Date(post.created_at).toLocaleString()}</div>
                    </div>
                </div>
                <h2>${escapeHtml(post.title || '')}</h2>
                <p>${escapeHtml(post.content || '')}</p>
                ${post.image_url ? `<img class="post-image" src="${post.image_url}" alt="imagen post">` : ''}
            </div>
        `;

        // Render replies
        const repliesList = document.getElementById('repliesList');
        if (repliesList) {
            const replies = post.replies || [];
            repliesList.innerHTML = replies.map(r => `
                <div class="reply-card">
                    <strong>${r.users ? '@' + r.users.username : 'usuario'}</strong>
                    <div style="font-size:0.85rem;color:#666;">${new Date(r.created_at).toLocaleString()}</div>
                    <p style="margin-top:0.5rem;">${escapeHtml(r.content)}</p>
                </div>
            `).join('');
        }

    } catch (error) {
        console.error('Error cargando post:', error);
        container.innerHTML = '<p>Error al cargar el post.</p>';
    }
}

async function uploadToImgbb(file) {
    try {
        const base64 = await new Promise((resolve, reject) => {
            const fr = new FileReader();
            fr.onload = () => resolve(fr.result.split(',')[1]);
            fr.onerror = reject;
            fr.readAsDataURL(file);
        });

        const key = 'a829ef97aa2f2e24d7871d6b3ef0b52e';
        const form = new FormData();
        form.append('image', base64);

        const res = await fetch(`https://api.imgbb.com/1/upload?key=${key}`, {
            method: 'POST',
            body: form
        });
        return await res.json();
    } catch (err) {
        console.error('Error subiendo a imgbb', err);
        return null;
    }
}
