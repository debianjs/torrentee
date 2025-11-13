document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth()) return;

    // Determinar usuario a mostrar (query param ?user=ID)
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('user') || currentUser.id;

    try {
        const { data: user } = await supabase.from('users').select('id, username, avatar_url, bio').eq('id', userId).single();
        if (user) {
            document.getElementById('profileAvatar').src = user.avatar_url || `https://ui-avatars.com/api/?name=${user.username}&background=000&color=fff`;
            document.getElementById('profileUsername').textContent = `@${user.username}`;
            document.getElementById('profileBio').textContent = user.bio || '';
        }

        // Cargar posts del usuario
        const { data: posts } = await supabase.from('posts').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
        const container = document.getElementById('profilePosts');
        if (!posts || posts.length === 0) {
            container.innerHTML = `<div class="empty-state"><h3>Sin posts</h3><p>Este usuario aún no ha publicado.</p></div>`;
        } else {
            container.innerHTML = posts.map(p => `
                <div class="post-card" onclick="window.location.href='../post/index.html?id=${p.id}'">
                    <div class="post-header">
                        <img src="https://ui-avatars.com/api/?name=${user.username}&background=000&color=fff" class="post-avatar">
                        <div class="post-user-info">
                            <span class="post-username">@${user.username}</span>
                            <span class="post-date">${new Date(p.created_at).toLocaleString()}</span>
                        </div>
                    </div>
                    <div class="post-content">
                        <h2>${escapeHtml(p.title || '')}</h2>
                        <p>${escapeHtml(truncateText(p.content || '', 200))}</p>
                    </div>
                </div>
            `).join('');
        }

        // Stats básicos
        document.getElementById('profilePostsCount').textContent = posts ? posts.length : 0;

        const { count: followersCount } = await supabase.from('followers').select('*', { head: true, count: 'exact' }).eq('following_id', userId);
        const { count: followingCount } = await supabase.from('followers').select('*', { head: true, count: 'exact' }).eq('follower_id', userId);
        document.getElementById('profileFollowersCount').textContent = followersCount || 0;
        document.getElementById('profileFollowingCount').textContent = followingCount || 0;

    } catch (err) {
        console.error('Error cargando perfil:', err);
    }
});
