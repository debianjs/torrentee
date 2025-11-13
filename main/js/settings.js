document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth()) return;

    const usernameInput = document.getElementById('username');
    const avatarInput = document.getElementById('avatarUrl');
    const avatarFileInput = document.getElementById('avatarFile');
    const avatarPreviewImg = document.getElementById('avatarPreviewImg');
    const avatarPreviewText = document.getElementById('avatarPreviewText');
    const bioInput = document.getElementById('bio');
    const status = document.getElementById('settingsStatus');

    try {
        const { data: user } = await supabase.from('users').select('username, avatar_url, bio').eq('id', currentUser.id).single();
        if (user) {
            usernameInput.value = user.username || '';
            avatarInput.value = user.avatar_url || '';
            bioInput.value = user.bio || '';
            if (user.avatar_url) {
                avatarPreviewImg.src = user.avatar_url;
                avatarPreviewImg.style.display = 'block';
                avatarPreviewText.style.display = 'none';
            }
        }
    } catch (err) {
        console.error('Error cargando settings:', err);
    }

    // Preview imagen seleccionada
    if (avatarFileInput) {
        avatarFileInput.addEventListener('change', () => {
            const f = avatarFileInput.files[0];
            if (!f) {
                avatarPreviewImg.style.display = 'none';
                avatarPreviewText.style.display = 'block';
                return;
            }
            const reader = new FileReader();
            reader.onload = (ev) => {
                avatarPreviewImg.src = ev.target.result;
                avatarPreviewImg.style.display = 'block';
                avatarPreviewText.style.display = 'none';
            };
            reader.readAsDataURL(f);
        });
    }

    document.getElementById('settingsForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        status.textContent = 'Guardando...';
        try {
            let avatarUrl = avatarInput.value.trim() || null;

            // Si hay archivo seleccionado, subir a imgbb
            if (avatarFileInput && avatarFileInput.files && avatarFileInput.files[0]) {
                status.textContent = 'Subiendo avatar...';
                const uploaded = await uploadToImgbb(avatarFileInput.files[0]);
                if (uploaded && uploaded.data && uploaded.data.url) {
                    avatarUrl = uploaded.data.url;
                }
            }

            const updates = {
                username: usernameInput.value.trim(),
                avatar_url: avatarUrl || null,
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

    async function uploadToImgbb(file) {
        try {
            // Leer como base64 y quitar prefijo
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
