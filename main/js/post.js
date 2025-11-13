// Manejo de creación de post y vista de post individual
document.addEventListener('DOMContentLoaded', () => {
    // Si estamos en la página de crear post
    const createForm = document.getElementById('createPostForm');
    if (createForm) {
        createForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!checkAuth()) return;
            const title = document.getElementById('title').value.trim();
            const content = document.getElementById('content').value.trim();
            const imageUrl = document.getElementById('imageUrl').value.trim() || null;
            const status = document.getElementById('statusMessage');
            status.textContent = 'Publicando...';

            try {
                const { data, error } = await supabase
                    .from('posts')
                    .insert([{ title, content, image_url: imageUrl, user_id: currentUser.id }]);

                if (error) throw error;
                status.textContent = 'Publicado correctamente.';
                setTimeout(() => window.location.href = '../index.html', 900);
            } catch (err) {
                console.error(err);
                status.textContent = 'Error al publicar.';
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
