// Configuración de Supabase
const SUPABASE_URL = 'https://mudktareaneenqkptcyn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11ZGt0YXJlYW5lZW5xa3B0Y3luIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMTA0NTIsImV4cCI6MjA3Mzg4NjQ1Mn0.5FtKPMIdH0byoXV7c-_x7-G9XmX5K5074Zhi0DIyMRc';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variables globales
let currentUser = null;
let currentFilter = 'recent';
let allPosts = [];

// Check authentication
function checkAuth() {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        window.location.href = '../auth/sign-in/index.html';
        return false;
    }
    currentUser = JSON.parse(userStr);
    return true;
}

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
    if (!checkAuth()) return;
    
    await loadUserData();
    await loadPosts();
    await loadTrendingTopics();
    await loadSuggestedUsers();
    await loadStats();
    
    initializeEventListeners();
});

// Load user data
async function loadUserData() {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('username, avatar_url')
            .eq('id', currentUser.id)
            .single();
        
        if (data) {
            const avatar = data.avatar_url || `https://ui-avatars.com/api/?name=${data.username}&background=000&color=fff`;
            document.getElementById('navbarAvatar').src = avatar;
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Load posts
async function loadPosts(filter = 'recent') {
    const container = document.getElementById('postsContainer');
    container.innerHTML = `
        <div class="loading-spinner">
            <svg class="spinner" viewBox="0 0 50 50">
                <circle class="path" cx="25" cy="25" r="20" fill="none" stroke-width="5"></circle>
            </svg>
            <p>Cargando posts...</p>
        </div>
    `;
    
    try {
        let query = supabase
            .from('posts')
            .select(`
                *,
                users (username, avatar_url),
                post_likes (count),
                replies (count)
            `);
        
        // Apply filters
        if (filter === 'popular') {
            query = query.order('likes', { ascending: false });
        } else if (filter === 'following') {
            // Get following list
            const { data: following } = await supabase
                .from('followers')
                .select('following_id')
                .eq('follower_id', currentUser.id);
            
            if (following && following.length > 0) {
                const followingIds = following.map(f => f.following_id);
                query = query.in('user_id', followingIds);
            }
        }
        
        query = query.order('created_at', { ascending: false }).limit(20);
        
        const { data: posts, error } = await query;
        
        if (error) throw error;
        
        allPosts = posts || [];
        renderPosts(allPosts);
        
    } catch (error) {
        console.error('Error loading posts:', error);
        container.innerHTML = `
            <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <h3>Error al cargar posts</h3>
                <p>Intenta recargar la página</p>
            </div>
        `;
    }
}

// Render posts
function renderPosts(posts) {
    const container = document.getElementById('postsContainer');
    
    if (posts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                </svg>
                <h3>No hay posts aún</h3>
                <p>¡Sé el primero en publicar algo!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = posts.map(post => {
        const user = post.users || {};
        const avatar = user.avatar_url || `https://ui-avatars.com/api/?name=${user.username}&background=000&color=fff`;
        const timeAgo = getTimeAgo(new Date(post.created_at));
        const likeCount = Array.isArray(post.post_likes) ? post.post_likes.length : (post.likes || 0);
        const replyCount = Array.isArray(post.replies) ? post.replies.length : 0;
        
        return `
            <div class="post-card" onclick="goToPost('${post.id}')">
                <div class="post-header">
                    <img src="${avatar}" alt="${user.username}" class="post-avatar">
                    <div class="post-user-info">
                        <a href="profile/index.html?user=${post.user_id}" class="post-username" onclick="event.stopPropagation()">@${user.username}</a>
                        <span class="post-date">${timeAgo}</span>
                    </div>
                </div>
                <div class="post-content">
                    <h2>${escapeHtml(post.title)}</h2>
                    <p>${escapeHtml(truncateText(post.content, 200))}</p>
                </div>
                <div class="post-footer">
                    <button class="post-action" onclick="event.stopPropagation(); toggleLike('${post.id}')">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                        </svg>
                        <span>${likeCount}</span>
                    </button>
                    <button class="post-action">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        <span>${replyCount}</span>
                    </button>
                    <button class="post-action">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="1"></circle>
                            <circle cx="12" cy="5" r="1"></circle>
                            <circle cx="12" cy="19" r="1"></circle>
                        </svg>
                        <span>${post.views || 0} views</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Load trending topics
async function loadTrendingTopics() {
    const container = document.getElementById('trendingTopics');
    
    const mockTopics = [
        { topic: '#NuevoBot', count: '1.2K posts' },
        { topic: '#Comunidad', count: '856 posts' },
        { topic: '#Updates', count: '624 posts' },
        { topic: '#Ayuda', count: '412 posts' }
    ];
    
    container.innerHTML = mockTopics.map(item => `
        <div class="trending-item">
            <div class="trending-topic">${item.topic}</div>
            <div class="trending-count">${item.count}</div>
        </div>
    `).join('');
}

// Load suggested users
async function loadSuggestedUsers() {
    const container = document.getElementById('suggestedUsers');
    
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('id, username, avatar_url')
            .neq('id', currentUser.id)
            .limit(5);
        
        if (error) throw error;
        
        container.innerHTML = users.map(user => {
            const avatar = user.avatar_url || `https://ui-avatars.com/api/?name=${user.username}&background=000&color=fff`;
            return `
                <div class="suggested-user">
                    <img src="${avatar}" alt="${user.username}">
                    <div class="suggested-user-info">
                        <span class="suggested-username">@${user.username}</span>
                        <span class="suggested-followers">Nuevo usuario</span>
                    </div>
                    <button class="follow-btn" onclick="followUser('${user.id}')">Seguir</button>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading suggested users:', error);
    }
}

// Load stats
async function loadStats() {
    try {
        const { count: postsCount } = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true });
        
        const { count: usersCount } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });
        
        document.getElementById('totalPosts').textContent = postsCount || 0;
        document.getElementById('totalUsers').textContent = usersCount || 0;
        document.getElementById('activeToday').textContent = Math.floor((usersCount || 0) * 0.3);
        
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Initialize event listeners
function initializeEventListeners() {
    // User menu dropdown
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdown = document.getElementById('userDropdown');
    
    userMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle('show');
    });
    
    document.addEventListener('click', () => {
        userDropdown.classList.remove('show');
    });
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('user');
        window.location.href = '../auth/sign-in/index.html';
    });
    
    // Filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            loadPosts(currentFilter);
        });
    });
    
    // Search
    const searchInput = document.getElementById('searchInput');
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const query = e.target.value.toLowerCase();
            if (query) {
                const filtered = allPosts.filter(post => 
                    post.title.toLowerCase().includes(query) || 
                    post.content.toLowerCase().includes(query)
                );
                renderPosts(filtered);
            } else {
                renderPosts(allPosts);
            }
        }, 300);
    });
}

// Utility functions
function goToPost(postId) {
    window.location.href = `post/index.html?id=${postId}`;
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    const intervals = {
        año: 31536000,
        mes: 2592000,
        semana: 604800,
        día: 86400,
        hora: 3600,
        minuto: 60
    };
    
    for (const [name, value] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / value);
        if (interval >= 1) {
            return `Hace ${interval} ${name}${interval > 1 ? (name === 'mes' ? 'es' : 's') : ''}`;
        }
    }
    
    return 'Justo ahora';
}

function truncateText(text, length) {
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function toggleLike(postId) {
    // Implement like functionality
    console.log('Toggle like for post:', postId);
}

async function followUser(userId) {
    // Implement follow functionality
    console.log('Follow user:', userId);
}