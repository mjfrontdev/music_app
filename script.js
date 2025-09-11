// Music Player JavaScript
const { ipcRenderer } = require('electron');

class MusicPlayer {
    constructor() {
        this.audio = document.getElementById('audioPlayer');
        this.playlist = [];
        this.favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        this.currentIndex = 0;
        this.isPlaying = false;
        this.isShuffled = false;
        this.isRepeated = false;
        this.volume = 0.7;
        this.showFavorites = false;
        this.equalizerEnabled = false;
        this.lyricsVisible = false;
        this.sidebarWidth = 350;
        this.isResizing = false;
        
        this.initializeElements();
        this.setupEventListeners();
        this.loadAppVersion();
        this.setupResizeHandle();
    }
    
    initializeElements() {
        // Buttons
        this.selectFilesBtn = document.getElementById('selectFilesBtn');
        this.selectFolderBtn = document.getElementById('selectFolderBtn');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.shuffleBtn = document.getElementById('shuffleBtn');
        this.repeatBtn = document.getElementById('repeatBtn');
        this.equalizerBtn = document.getElementById('equalizerBtn');
        this.lyricsBtn = document.getElementById('lyricsBtn');
        this.favoriteBtn = document.getElementById('favoriteBtn');
        this.favoritesBtn = document.getElementById('favoritesBtn');
        this.allSongsBtn = document.getElementById('allSongsBtn');
        this.closeLyricsBtn = document.getElementById('closeLyricsBtn');
        
        // Display elements
        this.playlistContainer = document.getElementById('playlist');
        this.currentSongTitle = document.getElementById('currentSongTitle');
        this.currentSongArtist = document.getElementById('currentSongArtist');
        this.currentTime = document.getElementById('currentTime');
        this.totalTime = document.getElementById('totalTime');
        this.progressBar = document.getElementById('progressBar');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.statusText = document.getElementById('statusText');
        this.trackCount = document.getElementById('trackCount');
        this.playIndicator = document.getElementById('playIndicator');
        this.albumArtwork = document.getElementById('albumArtwork');
        this.equalizerPanel = document.getElementById('equalizerPanel');
        this.lyricsPanel = document.getElementById('lyricsPanel');
        this.lyricsContent = document.getElementById('lyricsContent');
        
        // Equalizer sliders
        this.bassSlider = document.getElementById('bassSlider');
        this.midSlider = document.getElementById('midSlider');
        this.trebleSlider = document.getElementById('trebleSlider');
        
        // Sidebar elements
        this.playlistSidebar = document.getElementById('playlistSidebar');
        this.resizeHandle = document.getElementById('resizeHandle');
    }
    
    setupEventListeners() {
        // File selection
        this.selectFilesBtn.addEventListener('click', () => this.selectMusicFiles());
        this.selectFolderBtn.addEventListener('click', () => this.selectMusicFolder());
        
        // Playback controls
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.prevBtn.addEventListener('click', () => this.previousSong());
        this.nextBtn.addEventListener('click', () => this.nextSong());
        this.shuffleBtn.addEventListener('click', () => this.toggleShuffle());
        this.repeatBtn.addEventListener('click', () => this.toggleRepeat());
        this.equalizerBtn.addEventListener('click', () => this.toggleEqualizer());
        this.lyricsBtn.addEventListener('click', () => this.toggleLyrics());
        this.favoriteBtn.addEventListener('click', () => this.toggleFavorite());
        this.favoritesBtn.addEventListener('click', () => this.toggleFavoritesView());
        this.allSongsBtn.addEventListener('click', () => this.showAllSongs());
        this.closeLyricsBtn.addEventListener('click', () => this.hideLyrics());
        
        // Progress bar
        this.progressBar.addEventListener('click', (e) => this.seekTo(e));
        this.progressBar.addEventListener('mousemove', (e) => this.showProgressHandle(e));
        this.progressBar.addEventListener('mouseleave', () => this.hideProgressHandle());
        
        // Volume control
        this.volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value));
        
        // Equalizer controls
        this.bassSlider.addEventListener('input', (e) => this.updateEqualizer('bass', e.target.value));
        this.midSlider.addEventListener('input', (e) => this.updateEqualizer('mid', e.target.value));
        this.trebleSlider.addEventListener('input', (e) => this.updateEqualizer('treble', e.target.value));
        
        // Audio events
        this.audio.addEventListener('loadedmetadata', () => this.updateDuration());
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('ended', () => this.onSongEnded());
        this.audio.addEventListener('play', () => this.onPlay());
        this.audio.addEventListener('pause', () => this.onPause());
        this.audio.addEventListener('error', (e) => this.onError(e));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }
    
    setupResizeHandle() {
        this.resizeHandle.addEventListener('mousedown', (e) => {
            this.isResizing = true;
            document.addEventListener('mousemove', this.handleResize.bind(this));
            document.addEventListener('mouseup', this.stopResize.bind(this));
            e.preventDefault();
        });
    }
    
    handleResize(e) {
        if (!this.isResizing) return;
        
        const newWidth = e.clientX;
        const minWidth = 250;
        const maxWidth = 600;
        
        if (newWidth >= minWidth && newWidth <= maxWidth) {
            this.sidebarWidth = newWidth;
            this.playlistSidebar.style.width = `${newWidth}px`;
        }
    }
    
    stopResize() {
        this.isResizing = false;
        document.removeEventListener('mousemove', this.handleResize.bind(this));
        document.removeEventListener('mouseup', this.stopResize.bind(this));
    }
    
    async selectMusicFiles() {
        try {
            this.updateStatus('Selecting music files...');
            const files = await ipcRenderer.invoke('select-music-files');
            
            if (files.length > 0) {
                this.playlist = files;
                this.currentIndex = 0;
                this.renderPlaylist();
                this.loadCurrentSong();
                this.showToast('success', `Loaded ${files.length} music file(s)`);
                this.updateStatus('Ready');
            }
        } catch (error) {
            this.showToast('error', 'Failed to load music files');
            console.error('Error selecting files:', error);
        }
    }
    
    async selectMusicFolder() {
        try {
            this.updateStatus('Scanning music folder...');
            const files = await ipcRenderer.invoke('select-music-folder');
            
            if (files.length > 0) {
                this.playlist = files;
                this.currentIndex = 0;
                this.renderPlaylist();
                this.loadCurrentSong();
                this.showToast('success', `Loaded ${files.length} music file(s) from folder`);
                this.updateStatus('Ready');
            }
        } catch (error) {
            this.showToast('error', 'Failed to scan music folder');
            console.error('Error selecting folder:', error);
        }
    }
    
    renderPlaylist() {
        const songsToShow = this.showFavorites ? this.getFavoriteSongs() : this.playlist;
        
        if (songsToShow.length === 0) {
            this.playlistContainer.innerHTML = `
                <div class="empty-playlist">
                    <i class="fas fa-music"></i>
                    <p>${this.showFavorites ? 'No favorite songs' : 'No music selected'}</p>
                    <small>${this.showFavorites ? 'Add songs to favorites' : 'Click "Add Music" to get started'}</small>
                </div>
            `;
            this.trackCount.textContent = '(0)';
            return;
        }
        
        this.trackCount.textContent = `(${songsToShow.length})`;
        this.playlistContainer.innerHTML = songsToShow.map((song, index) => {
            const originalIndex = this.playlist.findIndex(s => s.path === song.path);
            const isFavorite = this.favorites.includes(song.path);
            return `
                <div class="playlist-item ${originalIndex === this.currentIndex ? 'active' : ''}" 
                     data-index="${originalIndex}" onclick="musicPlayer.playSong(${originalIndex})">
                    <div class="song-info">
                        <div class="song-title">${song.name}</div>
                        <div class="song-duration">${this.formatFileSize(song.size)}</div>
                    </div>
                    <button class="favorite-item-btn ${isFavorite ? 'favorited' : ''}" 
                            onclick="event.stopPropagation(); musicPlayer.toggleFavoriteByPath('${song.path}')">
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
            `;
        }).join('');
    }
    
    playSong(index) {
        if (index >= 0 && index < this.playlist.length) {
            this.currentIndex = index;
            this.loadCurrentSong();
            this.play();
            this.renderPlaylist();
        }
    }
    
    loadCurrentSong() {
        if (this.playlist.length === 0) return;
        
        const currentSong = this.playlist[this.currentIndex];
        this.audio.src = currentSong.path;
        this.currentSongTitle.textContent = currentSong.name;
        this.currentSongArtist.textContent = this.formatFileSize(currentSong.size);
        this.updateStatus(`Loading: ${currentSong.name}`);
        this.updateFavoriteButton();
        this.loadAlbumCover();
    }
    
    togglePlayPause() {
        if (this.playlist.length === 0) {
            this.showToast('warning', 'Please select music files first');
            return;
        }
        
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }
    
    play() {
        if (this.playlist.length === 0) return;
        
        this.audio.play().then(() => {
            this.isPlaying = true;
            this.updatePlayPauseButton();
            this.showToast('info', `Now Playing: ${this.playlist[this.currentIndex].name}`);
        }).catch(error => {
            this.showToast('error', 'Failed to play audio');
            console.error('Play error:', error);
        });
    }
    
    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.updatePlayPauseButton();
    }
    
    stop() {
        this.audio.pause();
        this.audio.currentTime = 0;
        this.isPlaying = false;
        this.updatePlayPauseButton();
        this.updateProgress();
    }
    
    previousSong() {
        if (this.playlist.length === 0) return;
        
        this.currentIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
        this.loadCurrentSong();
        this.play();
        this.renderPlaylist();
    }
    
    nextSong() {
        if (this.playlist.length === 0) return;
        
        if (this.isShuffled) {
            this.currentIndex = Math.floor(Math.random() * this.playlist.length);
        } else {
            this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
        }
        
        this.loadCurrentSong();
        this.play();
        this.renderPlaylist();
    }
    
    toggleShuffle() {
        this.isShuffled = !this.isShuffled;
        this.shuffleBtn.classList.toggle('active', this.isShuffled);
        this.showToast('info', `Shuffle ${this.isShuffled ? 'ON' : 'OFF'}`);
    }
    
    toggleRepeat() {
        this.isRepeated = !this.isRepeated;
        this.repeatBtn.classList.toggle('active', this.isRepeated);
        this.showToast('info', `Repeat ${this.isRepeated ? 'ON' : 'OFF'}`);
    }
    
    setVolume(value) {
        this.volume = value / 100;
        this.audio.volume = this.volume;
    }
    
    seekTo(event) {
        if (this.audio.duration) {
            const rect = this.progressBar.getBoundingClientRect();
            const pos = (event.clientX - rect.left) / rect.width;
            this.audio.currentTime = pos * this.audio.duration;
        }
    }
    
    updatePlayPauseButton() {
        const icon = this.playPauseBtn.querySelector('i');
        const playIndicator = this.playIndicator.querySelector('i');
        
        if (this.isPlaying) {
            icon.className = 'fas fa-pause';
            playIndicator.className = 'fas fa-pause';
        } else {
            icon.className = 'fas fa-play';
            playIndicator.className = 'fas fa-play';
        }
    }
    
    updateDuration() {
        this.totalTime.textContent = this.formatTime(this.audio.duration);
    }
    
    updateProgress() {
        if (this.audio.duration) {
            const progress = (this.audio.currentTime / this.audio.duration) * 100;
            const progressFill = this.progressBar.querySelector('.progress-fill');
            progressFill.style.width = `${progress}%`;
            this.currentTime.textContent = this.formatTime(this.audio.currentTime);
        }
    }
    
    showProgressHandle(e) {
        const handle = this.progressBar.querySelector('.progress-handle');
        if (this.audio.duration) {
            const rect = this.progressBar.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            const progress = pos * 100;
            handle.style.left = `${progress}%`;
            handle.style.opacity = '1';
        }
    }
    
    hideProgressHandle() {
        const handle = this.progressBar.querySelector('.progress-handle');
        handle.style.opacity = '0';
    }
    
    onPlay() {
        this.isPlaying = true;
        this.updatePlayPauseButton();
        document.body.classList.add('playing');
    }
    
    onPause() {
        this.isPlaying = false;
        this.updatePlayPauseButton();
        document.body.classList.remove('playing');
    }
    
    onSongEnded() {
        if (this.isRepeated) {
            this.audio.currentTime = 0;
            this.play();
        } else {
            this.nextSong();
        }
    }
    
    onError(event) {
        this.showToast('error', 'Error playing audio file');
        console.error('Audio error:', event);
        this.updateStatus('Error playing audio');
    }
    
    handleKeyboard(event) {
        switch(event.code) {
            case 'Space':
                event.preventDefault();
                this.togglePlayPause();
                break;
            case 'ArrowLeft':
                event.preventDefault();
                this.previousSong();
                break;
            case 'ArrowRight':
                event.preventDefault();
                this.nextSong();
                break;
            case 'KeyS':
                if (event.ctrlKey) {
                    event.preventDefault();
                    this.toggleShuffle();
                }
                break;
            case 'KeyR':
                if (event.ctrlKey) {
                    event.preventDefault();
                    this.toggleRepeat();
                }
                break;
        }
    }
    
    updateStatus(message) {
        this.statusText.textContent = message;
    }
    
    showToast(type, message) {
        toastr.options = {
            positionClass: 'toast-top-right',
            timeOut: 3000,
            extendedTimeOut: 1000,
            closeButton: true,
            progressBar: true,
            preventDuplicates: true
        };
        
        toastr[type](message);
    }
    
    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    async loadAppVersion() {
        try {
            const version = await ipcRenderer.invoke('get-app-version');
            document.getElementById('appVersion').textContent = `v${version}`;
        } catch (error) {
            console.error('Failed to load app version:', error);
        }
    }
    
    // Advanced Features
    toggleFavorite() {
        if (this.playlist.length === 0) return;
        
        const currentSong = this.playlist[this.currentIndex];
        const isFavorite = this.favorites.includes(currentSong.path);
        
        if (isFavorite) {
            this.favorites = this.favorites.filter(path => path !== currentSong.path);
            this.favoriteBtn.classList.remove('favorited');
            this.favoriteBtn.querySelector('i').className = 'far fa-heart';
            this.showToast('info', 'Removed from favorites');
        } else {
            this.favorites.push(currentSong.path);
            this.favoriteBtn.classList.add('favorited');
            this.favoriteBtn.querySelector('i').className = 'fas fa-heart';
            this.showToast('success', 'Added to favorites');
        }
        
        localStorage.setItem('favorites', JSON.stringify(this.favorites));
        this.renderPlaylist();
    }
    
    toggleFavoriteByPath(songPath) {
        const isFavorite = this.favorites.includes(songPath);
        
        if (isFavorite) {
            this.favorites = this.favorites.filter(path => path !== songPath);
            this.showToast('info', 'Removed from favorites');
        } else {
            this.favorites.push(songPath);
            this.showToast('success', 'Added to favorites');
        }
        
        localStorage.setItem('favorites', JSON.stringify(this.favorites));
        this.renderPlaylist();
        this.updateFavoriteButton();
    }
    
    updateFavoriteButton() {
        if (this.playlist.length === 0) return;
        
        const currentSong = this.playlist[this.currentIndex];
        const isFavorite = this.favorites.includes(currentSong.path);
        
        if (isFavorite) {
            this.favoriteBtn.classList.add('favorited');
            this.favoriteBtn.querySelector('i').className = 'fas fa-heart';
        } else {
            this.favoriteBtn.classList.remove('favorited');
            this.favoriteBtn.querySelector('i').className = 'far fa-heart';
        }
    }
    
    getFavoriteSongs() {
        return this.playlist.filter(song => this.favorites.includes(song.path));
    }
    
    toggleFavoritesView() {
        this.showFavorites = !this.showFavorites;
        this.favoritesBtn.classList.toggle('active', this.showFavorites);
        this.allSongsBtn.classList.toggle('active', !this.showFavorites);
        this.renderPlaylist();
    }
    
    showAllSongs() {
        this.showFavorites = false;
        this.favoritesBtn.classList.remove('active');
        this.allSongsBtn.classList.add('active');
        this.renderPlaylist();
    }
    
    toggleEqualizer() {
        this.equalizerEnabled = !this.equalizerEnabled;
        this.equalizerPanel.style.display = this.equalizerEnabled ? 'block' : 'none';
        this.equalizerBtn.classList.toggle('active', this.equalizerEnabled);
    }
    
    updateEqualizer(band, value) {
        // Simple equalizer implementation
        const gain = parseFloat(value);
        console.log(`Equalizer ${band}: ${gain}dB`);
        // Here you would implement actual audio equalization
    }
    
    toggleLyrics() {
        this.lyricsVisible = !this.lyricsVisible;
        this.lyricsPanel.style.display = this.lyricsVisible ? 'block' : 'none';
        this.lyricsBtn.classList.toggle('active', this.lyricsVisible);
        
        if (this.lyricsVisible) {
            this.loadLyrics();
        }
    }
    
    hideLyrics() {
        this.lyricsVisible = false;
        this.lyricsPanel.style.display = 'none';
        this.lyricsBtn.classList.remove('active');
    }
    
    loadLyrics() {
        if (this.playlist.length === 0) {
            this.lyricsContent.innerHTML = '<p class="no-lyrics">No song selected</p>';
            return;
        }
        
        const currentSong = this.playlist[this.currentIndex];
        // For demo purposes, show placeholder lyrics
        this.lyricsContent.innerHTML = `
            <p class="no-lyrics">Lyrics for "${currentSong.name}"</p>
            <p style="text-align: center; color: rgba(255,255,255,0.6);">
                This is a demo lyrics panel.<br>
                In a real implementation, you would load lyrics from a lyrics API or file.
            </p>
        `;
    }
    
    loadAlbumCover() {
        if (this.playlist.length === 0) return;
        
        const currentSong = this.playlist[this.currentIndex];
        // For demo purposes, we'll use a placeholder
        // In a real implementation, you would extract album art from MP3 metadata
        this.albumArtwork.innerHTML = '<i class="fas fa-music"></i>';
    }
}

// Initialize the music player when the page loads
let musicPlayer;
document.addEventListener('DOMContentLoaded', () => {
    musicPlayer = new MusicPlayer();
    
    // Set initial volume
    musicPlayer.setVolume(70);
    
    // Show welcome message
    musicPlayer.showToast('info', 'Welcome to Music Player! Select music files to get started.');
});
