// Configuración de Supabase
const SUPABASE_URL = 'https://mudktareaneenqkptcyn.supabase.co'; // Reemplazar con tu URL de Supabase
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11ZGt0YXJlYW5lZW5xa3B0Y3luIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMTA0NTIsImV4cCI6MjA3Mzg4NjQ1Mn0.5FtKPMIdH0byoXV7c-_x7-G9XmX5K5074Zhi0DIyMRc'; // Reemplazar con tu Anon Key

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Toggle password visibility
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const button = input.parentElement.querySelector('.toggle-password');
    
    if (input.type === 'password') {
        input.type = 'text';
        button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
            </svg>
        `;
    } else {
        input.type = 'password';
        button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="eye-icon">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
            </svg>
        `;
    }
}

// Show message
function showMessage(message, type) {
    const errorDiv = document.getElementById('errorMessage');
    const successDiv = document.getElementById('successMessage');
    
    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';
    
    if (type === 'error') {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    } else {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
    }
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        errorDiv.style.display = 'none';
        successDiv.style.display = 'none';
    }, 5000);
}

// Loading state
function setLoadingState(button, isLoading) {
    const btnText = button.querySelector('.btn-text');
    const btnLoader = button.querySelector('.btn-loader');
    
    if (isLoading) {
        btnText.style.display = 'none';
        btnLoader.style.display = 'block';
        button.disabled = true;
    } else {
        btnText.style.display = 'block';
        btnLoader.style.display = 'none';
        button.disabled = false;
    }
}

// Validate Turnstile
function validateTurnstile() {
    const turnstileResponse = document.querySelector('[name="cf-turnstile-response"]');
    if (!turnstileResponse || !turnstileResponse.value) {
        showMessage('Por favor completa el captcha', 'error');
        return false;
    }
    return true;
}

// Sign Up
async function handleSignUp(event) {
    event.preventDefault();
    
    if (!validateTurnstile()) return;
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const button = document.getElementById('signUpBtn');
    
    // Validaciones
    if (username.length < 3 || username.length > 20) {
        showMessage('El nombre de usuario debe tener entre 3 y 20 caracteres', 'error');
        return;
    }
    
    if (password.length < 8) {
        showMessage('La contraseña debe tener al menos 8 caracteres', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showMessage('Las contraseñas no coinciden', 'error');
        return;
    }
    
    setLoadingState(button, true);
    
    try {
        // Verificar si el usuario ya existe
        const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('username')
            .eq('username', username)
            .single();
        
        if (existingUser) {
            showMessage('Este nombre de usuario ya está en uso', 'error');
            setLoadingState(button, false);
            return;
        }
        
        // Hash password (en producción deberías usar bcrypt en el backend)
        const hashedPassword = btoa(password); // Esto es solo para demostración
        
        // Crear usuario
        const { data, error } = await supabase
            .from('users')
            .insert([
                {
                    username: username,
                    password: hashedPassword,
                    created_at: new Date().toISOString()
                }
            ])
            .select();
        
        if (error) throw error;
        
        showMessage('¡Cuenta creada exitosamente! Redirigiendo...', 'success');
        
        // Guardar sesión
        localStorage.setItem('user', JSON.stringify({ username: username, id: data[0].id }));
        
        // Redireccionar después de 2 segundos
        setTimeout(() => {
            window.location.href = '../../main/index.html';
        }, 2000);
        
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error al crear la cuenta. Intenta nuevamente.', 'error');
    } finally {
        setLoadingState(button, false);
    }
}

// Sign In
async function handleSignIn(event) {
    event.preventDefault();
    
    if (!validateTurnstile()) return;
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const button = document.getElementById('signInBtn');
    
    if (!username || !password) {
        showMessage('Por favor completa todos los campos', 'error');
        return;
    }
    
    setLoadingState(button, true);
    
    try {
        // Hash password para comparar
        const hashedPassword = btoa(password);
        
        // Buscar usuario
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .eq('password', hashedPassword)
            .single();
        
        if (error || !data) {
            showMessage('Usuario o contraseña incorrectos', 'error');
            setLoadingState(button, false);
            return;
        }
        
        showMessage('¡Inicio de sesión exitoso! Redirigiendo...', 'success');
        
        // Guardar sesión
        localStorage.setItem('user', JSON.stringify({ username: data.username, id: data.id }));
        
        // Redireccionar después de 2 segundos
        setTimeout(() => {
            window.location.href = '../../main/index.html';
        }, 2000);
        
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error al iniciar sesión. Intenta nuevamente.', 'error');
    } finally {
        setLoadingState(button, false);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    const authMode = window.authMode;
    
    if (authMode === 'signup') {
        const form = document.getElementById('signUpForm');
        form.addEventListener('submit', handleSignUp);
    } else if (authMode === 'signin') {
        const form = document.getElementById('signInForm');
        form.addEventListener('submit', handleSignIn);
    }
    
    // Check if already logged in
    const user = localStorage.getItem('user');
    if (user) {
        // Opcional: redirigir automáticamente si ya está logueado
        window.location.href = '../../main/index.html';
    }
});