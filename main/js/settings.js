document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth()) return;

    const usernameInput = document.getElementById('username');
    const avatarInput = document.getElementById('avatarUrl');
    const bioInput = document.getElementById('bio');
    const status = document.getElementById('settingsStatus');

    try {
        const { data: user } = await supabase.from('users').select('username, avatar_url, bio').eq('id', currentUser.id).single();
        if (user) {
            usernameInput.value = user.username || '';
            avatarInput.value = user.avatar_url || '';
            bioInput.value = user.bio || '';
        }
    } catch (err) {
        console.error('Error cargando settings:', err);
    }

    document.getElementById('settingsForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        status.textContent = 'Guardando...';
        try {
            const updates = {
                username: usernameInput.value.trim(),
                avatar_url: avatarInput.value.trim() || null,
                bio: bioInput.value.trim() || null
            };

            const { data, error } = await supabase.from('users').update(updates).eq('id', currentUser.id);
            if (error) throw error;
            status.textContent = 'Guardado correctamente.';
        } catch (err) {
            console.error(err);
            status.textContent = 'Error al guardar.';
        }
    });

    document.getElementById('deleteAccount').addEventListener('click', async () => {
        if (!confirm('¿Eliminar cuenta? Esta acción no se puede deshacer.')) return;
        try {
            await supabase.from('users').delete().eq('id', currentUser.id);
            localStorage.removeItem('user');
            window.location.href = '../auth/sign-in/index.html';
        } catch (err) {
            console.error('Error eliminando cuenta', err);
            status.textContent = 'Error al eliminar la cuenta.';
        }
    });
});
