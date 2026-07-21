/* ===================== 修改与新增：灯箱核心控制逻辑 ===================== */
let currentLightboxIndex = -1; // 记录当前灯箱内图片的索引

function openLightbox(index) {
    if (!window.currentLightboxImages || !window.currentLightboxImages[index]) return;
    
    currentLightboxIndex = index;
    const overlay = document.getElementById('lightboxOverlay');
    const img = document.getElementById('lightboxImg');
    
    // 切换图片时，必须重置上一张图可能存在的双击放大状态
    img.classList.remove('zoomed');
    
    img.src = window.currentLightboxImages[index];
    overlay.classList.add('show');
}

function closeLightbox() {
    const overlay = document.getElementById('lightboxOverlay');
    overlay.classList.remove('show');
    setTimeout(() => {
        const img = document.getElementById('lightboxImg');
        img.src = "";
        img.classList.remove('zoomed');
    }, 350); 
}

// 切换至上一张（循环轮播）
function prevLightboxImage(event) {
    if (event) event.stopPropagation(); // 阻止事件冒泡引发灯箱关闭
    if (!window.currentLightboxImages || window.currentLightboxImages.length <= 1) return;
    
    let newIndex = currentLightboxIndex - 1;
    if (newIndex < 0) {
        newIndex = window.currentLightboxImages.length - 1; // 调转到最后一张
    }
    openLightbox(newIndex);
}

// 切换至下一张（循环轮播）
function nextLightboxImage(event) {
    if (event) event.stopPropagation();
    if (!window.currentLightboxImages || window.currentLightboxImages.length <= 1) return;
    
    let newIndex = currentLightboxIndex + 1;
    if (newIndex >= window.currentLightboxImages.length) {
        newIndex = 0; // 调转到第一张
    }
    openLightbox(newIndex);
}

// 双击图片切换放大模式
function toggleLightboxZoom(event) {
    if (event) event.stopPropagation();
    const img = document.getElementById('lightboxImg');
    img.classList.toggle('zoomed');
}

// 原生原生级加分项：支持键盘左右方向键切换，ESC 键退出
window.addEventListener('keydown', (e) => {
    const overlay = document.getElementById('lightboxOverlay');
    if (!overlay || !overlay.classList.contains('show')) return;
    
    if (e.key === 'ArrowLeft') {
        prevLightboxImage();
    } else if (e.key === 'ArrowRight') {
        nextLightboxImage();
    } else if (e.key === 'Escape') {
        closeLightbox();
    }
});

/* ===================== 修改：视图模式控制与缓存瀑布流渲染 ===================== */
// 瀑布流控制与全局分页变量
let isWaterfallMode = false;
window.currentMediaChunks = [];
window.currentRenderedChunk = 0;
window.myMasonry = null;

function toggleViewMode() {
    isWaterfallMode = !isWaterfallMode;
    const article = document.querySelector('.tl-article');
    const content = document.getElementById('galleryContent');
    const grid = document.getElementById('grid');
    const modeText = document.getElementById('modeText');
    
    // 限制最大为 4 列的响应式栅格属性
    const gridClasses = ['grid', 'grid-cols-2', 'sm:grid-cols-3', 'lg:grid-cols-4', 'gap-4'];
    const itemClasses = ['w-6/12', 'sm:w-4/12', 'lg:w-3/12', 'p-2'];

    if (isWaterfallMode) {
        article.classList.add('waterfall-container');
        content.classList.add('waterfall-mode');
        
        // 挂载网格并初始化 Masonry
        if (grid) {
            grid.classList.add(...gridClasses);
            const items = grid.querySelectorAll('.media-item');
            items.forEach(el => el.classList.add(...itemClasses));
            
            imagesLoaded(grid, function() {
                window.myMasonry = new Masonry(grid, {
                    itemSelector: '.in-loaded',
                    percentPosition: true
                });
            });
        }
        modeText.textContent = "大图预览";
    } else {
        article.classList.remove('waterfall-container');
        content.classList.remove('waterfall-mode');
        
        // 卸载网格与 Masonry
        if (grid) {
            grid.classList.remove(...gridClasses);
            const items = grid.querySelectorAll('.media-item');
            items.forEach(el => el.classList.remove(...itemClasses));
            
            if (window.myMasonry) {
                window.myMasonry.destroy();
                window.myMasonry = null;
            }
        }
        modeText.textContent = "平铺预览";
    }
}

// 全局播放器实例引用
window.apPlayer = null;

/* ===================== 1. 核心渲染入口 ===================== */
/* ===================== 1. 核心渲染入口 ===================== */
function renderGallery(title, mediaArray) {
    document.getElementById('galleryTitle').textContent = title;
    
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' });
    document.getElementById('galleryMeta').innerHTML = `
        <span class="author">Anonymous</span>
        <span class="divider">·</span>
        <time>${dateStr}</time>`;

    const content = document.getElementById('galleryContent');
    const dropdownContainer = document.getElementById('videoDropdownContainer');
    const videoSelect = document.getElementById('videoSelect');
    if (videoSelect) {
        videoSelect.innerHTML = '<option value="">快速跳转到视频...</option>';
    }
    
    const images = [];
    const videos = [];
    const audios = [];
    const videoExts = ['mp4', 'webm', 'ogg', 'mov', 'mkv'];
    const audioExts = ['mp3', 'wav', 'm4a', 'aac', 'flac', 'opus', 'oga', 'weba'];

    mediaArray.forEach(media => {
        const ext = media.split('.').pop().toLowerCase();
        if (videoExts.includes(ext)) {
            videos.push(media);
        } else if (audioExts.includes(ext)) {
            audios.push(media);
        } else {
            images.push(media);
        }
    });

    const allVisualMedia = [...images, ...videos];

    if (videos.length > 0 && dropdownContainer) {
        dropdownContainer.style.display = 'block';
        videos.forEach((vid) => {
            const globalIndex = images.length + videos.indexOf(vid); 
            const targetChunk = Math.floor(globalIndex / 30); 
            const fullName = vid.split('/').pop().split('\\').pop();
            
            const option = document.createElement('option');
            option.value = `media-vid-${globalIndex}`;
            option.dataset.chunk = targetChunk;
            option.textContent = `🎬 ${fullName}`;
            videoSelect.appendChild(option);
        });
    } else if (dropdownContainer) {
        dropdownContainer.style.display = 'none';
    }

    window.currentMediaChunks = [];
    for (let i = 0; i < allVisualMedia.length; i += 30) {
        window.currentMediaChunks.push(allVisualMedia.slice(i, i + 30));
    }

    window.currentLightboxImages = [];
    window.currentRenderedChunk = 0;
    if (window.myMasonry) {
        window.myMasonry.destroy();
        window.myMasonry = null;
    }

    // 【核心修复】：在覆盖 DOM 之前，必须先将旧播放器实例及内部的 Timeout 计时器彻底销毁！
    // 这样就再也不会出现 `classList undefined` 的报错了。
    if (window.aplayerInstance) {
        try {
            window.aplayerInstance.destroy();
        } catch (e) {
            console.warn('[APlayer] 销毁遗留组件:', e);
        }
        window.aplayerInstance = null;
    }

    const gridClasses = isWaterfallMode ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4' : '';
    content.innerHTML = `<div id="grid" class="ajax-container ${gridClasses}"></div>`;

    renderNextChunk();

    if (videoSelect) {
        videoSelect.onchange = function() {
            if (!this.value) return;
            const targetChunk = parseInt(this.options[this.selectedIndex].dataset.chunk, 10);
            
            const grid = document.getElementById('grid');
            grid.innerHTML = ''; 
            if (window.myMasonry) {
                window.myMasonry.destroy();
                window.myMasonry = null;
            }

            window.currentRenderedChunk = targetChunk;
            renderNextChunk();
            
            const targetVidId = this.value;
            const mainContainer = document.querySelector('.main-content');
            
            setTimeout(() => {
                const targetEl = document.getElementById(targetVidId);
                if (!targetEl) return;

                if (mainContainer) {
                    const targetTop = targetEl.offsetTop; 
                    const centerPos = targetTop - (mainContainer.clientHeight / 2) + (targetEl.clientHeight / 2);
                    mainContainer.scrollTo({ top: centerPos, behavior: 'smooth' });
                } else {
                    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }

                let attempts = 0;
                const adjustScroll = setInterval(() => {
                    const el = document.getElementById(targetVidId);
                    if (el) {
                        if (mainContainer) {
                            const targetTop = el.offsetTop; 
                            const centerPos = targetTop - (mainContainer.clientHeight / 2) + (el.clientHeight / 2);
                            mainContainer.scrollTo({ top: centerPos, behavior: 'auto' });
                        } else {
                            el.scrollIntoView({ behavior: 'auto', block: 'center' }); 
                        }
                    }
                    attempts++;
                    if (attempts >= 3) clearInterval(adjustScroll);
                }, 500);

            }, 600); 
        };
    }    
    
    const mainContainer = document.querySelector('.main-content');
    if (mainContainer) {
        mainContainer.scrollTop = 0; 
        mainContainer.onscroll = function() {
            if (mainContainer.scrollTop + mainContainer.clientHeight >= mainContainer.scrollHeight - 300) {
                renderNextChunk();
            }
        };
    }

    // 依然放在最后：渲染完一切后挂载播放器
    window.currentAudios = audios; 
    initAudioPlayer(audios);
}

/* ===================== 2. 缓存块渲染逻辑（专注图频，不再生成 audio 标签） ===================== */
function renderNextChunk() {
    if (window.currentRenderedChunk >= window.currentMediaChunks.length) return;
    
    const chunkData = window.currentMediaChunks[window.currentRenderedChunk];
    const grid = document.getElementById('grid');
    const videoExts = ['mp4', 'webm', 'ogg', 'mov', 'mkv'];
    let htmlStr = '';
    
    const baseIndex = window.currentRenderedChunk * 30;
    
    const itemClasses = isWaterfallMode 
        ? "media-item w-6/12 sm:w-4/12 lg:w-3/12 ajax-post in-load in-loaded p-2" 
        : "media-item ajax-post in-load in-loaded";

    const videoInitTasks = [];

    chunkData.forEach((media, index) => {
        const globalIndex = baseIndex + index;
        const fullName = media.split('/').pop().split('\\').pop();
       
        let encodedPath;
        if (media.toLowerCase().startsWith('http')) {
            encodedPath = media; 
        } else {
            encodedPath = media.replace(/\\/g, '/').split('/').map(segment => encodeURIComponent(segment)).join('/');
        }

        const ext = media.split('.').pop().toLowerCase();
        const isVideo = videoExts.includes(ext);

        if (!isVideo) {
            // 渲染图片
            window.currentLightboxImages.push(encodedPath); 
            const lbIndex = window.currentLightboxImages.length - 1;
            htmlStr += `
                <div class="${itemClasses}" id="media-img-${globalIndex}">
                    <figure style="margin:0; width: 100%;">
                        <div class="media-wrapper">
                            <div class="tg-spinner" id="spinner-${globalIndex}"></div>
                            <img class="shadow-md rounded-sm lazy-image blur-load" src="${encodedPath}" title="${fullName}" loading="lazy" 
                                 onload="
                                    this.style.minHeight='auto'; 
                                    this.classList.remove('lazy-image', 'blur-load'); 
                                    this.classList.add('blur-loaded'); 
                                    const sp = document.getElementById('spinner-${globalIndex}'); if(sp) sp.remove(); 
                                    if(window.myMasonry) window.myMasonry.layout();
                                 " 
                                 onclick="openLightbox(${lbIndex})" style="cursor: zoom-in; width:100%; height:auto; display:block;">
                        </div>
                        <div class="media-caption">${fullName}</div>
                    </figure>
                </div>
            `;
        } else {
            // 渲染视频
            const vidId = `artplayer-${globalIndex}`;
            htmlStr += `
                <div class="${itemClasses}" id="media-vid-${globalIndex}">
                    <figure style="margin:0; width: 100%;">
                        <div class="media-wrapper">
                            <div class="tg-spinner" id="spinner-${globalIndex}"></div>
                            <div id="${vidId}" class="shadow-md rounded-sm" style="width:100%; aspect-ratio: 16/9; background:#000;"></div>
                        </div>
                        <div class="media-caption">${fullName}</div>
                    </figure>
                </div>
            `;

            videoInitTasks.push(() => {
                const art = new Artplayer({
                    container: `#${vidId}`,
                    url: encodedPath,
                    title: fullName,
                    volume: 0.5,
                    isLive: false,
                    muted: false,
                    autoplay: false,
                    pip: true,
                    screenshot: true,
                    setting: true,
                    loop: true,
                    flip: true,
                    playbackRate: true,
                    aspectRatio: true,
                    fullscreen: true,
                    fullscreenWeb: true,
                    lang: 'zh-cn', 
                });
                
                art.on('ready', () => {
                    const video = art.video;
                    if (video && video.videoWidth && video.videoHeight) {
                        const container = document.getElementById(vidId);
                        if (container) {
                            container.style.aspectRatio = `${video.videoWidth}/${video.videoHeight}`;
                        }
                    }
                    const sp = document.getElementById(`spinner-${globalIndex}`);
                    if(sp) sp.remove();
                    if(window.myMasonry) {
                        window.myMasonry.layout();
                    }
                });
            });
        }
    });
        
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlStr;
    const newElements = Array.from(tempDiv.children);
    newElements.forEach(el => grid.appendChild(el));

    videoInitTasks.forEach(task => task());

    if (isWaterfallMode) {
        if (window.myMasonry) {
            window.myMasonry.appended(newElements);
            imagesLoaded(grid, function() {
                window.myMasonry.layout();
            });
        } else {
            imagesLoaded(grid, function() {
                window.myMasonry = new Masonry(grid, {
                    itemSelector: '.in-loaded',
                    percentPosition: true
                });
            });
        }
    }

    window.currentRenderedChunk++;
}



/**
 * 基于数据源直接初始化 APlayer（附带样式美化和自动封面处理）
 */
/**
 * 基于数据源初始化 APlayer (纯前端版本：使用 Fetch HEAD 请求探测封面与歌词)
 */
async function initAudioPlayer(param1, param2) {
    const rawAudios = Array.isArray(param2) ? param2 : (Array.isArray(param1) ? param1 : []);
    
    const gallery = document.getElementById('galleryContent');
    if (!gallery) return;

    if (window.aplayerInstance) {
        try { window.aplayerInstance.destroy(); } catch (e) {}
        window.aplayerInstance = null;
    }
    const oldContainer = document.getElementById('aplayer-container');
    if (oldContainer) oldContainer.remove();

    if (!rawAudios || rawAudios.length === 0) return;

    // 注入全新排版的 macOS 风格美化样式
    if (!document.getElementById('aplayer-custom-style')) {
        const style = document.createElement('style');
        style.id = 'aplayer-custom-style';
        style.innerHTML = `
            #aplayer-container {
                border-radius: 16px !important;
                box-shadow: 0 10px 30px rgba(0,0,0,0.06) !important;
                border: 1px solid rgba(0,0,0,0.05) !important;
                background: rgba(255, 255, 255, 0.8) !important;
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                margin-bottom: 24px;
                clear: both;
                overflow: hidden;
            }
            
            /* 1. 播放器主容器：设为相对定位，为重新排版做准备 */
            .aplayer { background: transparent !important; box-shadow: none !important; margin: 0 !important; position: relative !important; padding-bottom: 0 !important; }
            
            /* 2. 封面图片：固定在左上角 */
            .aplayer .aplayer-body .aplayer-pic {
position: absolute !important;
    left: 0px !important;
    top: 0px !important;
    width: 90px !important;
    height: 90px !important;
    border-radius: 2px !important;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
    background-color: #f5f5f5;
    background-size: cover;
            }

            /* 3. 顶部信息区（标题、作者、进度条）：避开左侧封面，固定高度防错位 */
            .aplayer .aplayer-info {
                margin-left: 100px !important;
                padding: 15px 15px 15px 0 !important;
                height: 90px !important; 
                box-sizing: border-box;
                border-bottom: 1px solid rgba(0,0,0,0.05) !important;
                position: relative !important;
            }
            .aplayer-title { font-weight: 600 !important; font-size: 16px !important; color: #222 !important; }
            .aplayer-author { font-size: 13px !important; color: #888 !important; }
            
            /* 修复进度条位置，使其始终吸附在信息区底部 */
            .aplayer .aplayer-controller {
                position: absolute !important;
                bottom: 12px !important;
                left: 0 !important;
                right: 15px !important;
            }

            /* 4. 歌词区域：将其从顶部抽出，绝对定位覆盖到下方的列表区 */
            .aplayer .aplayer-lrc {
    /* position: absolute !important; */
    /* left: calc(50% - 54px) !important; */
    top: 70px !important;
    /* right: 0 !important; */
    /* width: auto !important; */
    height: 208px !important;
    margin: 0 !important;
    background: transparent !important;
    z-index: 10;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
            }
            .aplayer-lrc:before, .aplayer-lrc:after { display: none !important; }
          .aplayer-lrc p {
    font-size: 14px !important;
    color: #494747 !important;
    text-shadow: none !important;
    transition: all 0.3s ease !important;
    line-height: 26px !important;
    height: 26px !important;
    padding: 0 !important;
    margin: 0 !important;
    opacity: 0.5;
    padding: 1px 0 !important;
    opacity: 0.6;
    overflow: hidden;
}
            .aplayer-lrc p.aplayer-lrc-current { color: #ec2595 !important; font-size: 16px !important; font-weight: 600; opacity: 1; transform: scale(1.05); }

            /* 5. 播放列表：放在右下方 */
            .aplayer .aplayer-list {
                margin-left: 95px !important;
                width: auto !important;
                max-height: 260px !important;
                transition: opacity 0.3s ease;
            }
            .aplayer .aplayer-list ol li { border-top: none !important; border-bottom: 1px solid rgba(0,0,0,0.03); padding: 12px 15px !important; transition: background 0.2s ease; }
            .aplayer .aplayer-list ol li:hover { background: rgba(0,0,0,0.02) !important; }
            .aplayer .aplayer-list ol li.aplayer-list-light { background: rgba(10, 132, 255, 0.08) !important; }
            .aplayer-list::-webkit-scrollbar { width: 6px; }
            .aplayer-list::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 10px; }
            .aplayer-list::-webkit-scrollbar-track { background: transparent; }




            /* 6. 状态切换器：当 #aplayer 拥有 show-lyrics 类时，显示歌词，隐藏列表 */
            .aplayer.show-lyrics .aplayer-lrc {
                opacity: 1 !important;
                pointer-events: auto !important;
            }
            .aplayer.show-lyrics .aplayer-list {
                opacity: 0 !important;
                pointer-events: none !important;
            }

            /* 7. 左侧自定义选项卡按钮 */
.custom-aplayer-tabs {
    position: absolute;
    left: 0px;
    top: 97px;
    width: 90px;
    height: 100%;
    background: #b8d5ff1f;
    display: flex;
    flex-direction: column;
    gap: 12px;
    z-index: 20;
}
            .custom-aplayer-tabs button {
                background: rgba(0,0,0,0.03);
                border: 1px solid rgba(0,0,0,0.05);
                border-radius: 2px;
                padding: 10px 0;
                font-size: 13px;
                color: #666;
                cursor: pointer;
                transition: all 0.2s ease;
                font-weight: 500;
            }
            .custom-aplayer-tabs button:hover {
                background: rgba(0,0,0,0.08);
            }
            .custom-aplayer-tabs button.active {
                background: #0A84FF;
                color: white;
                border-color: #0A84FF;
                box-shadow: 0 4px 10px rgba(10, 132, 255, 0.3);
            }
        `;
        document.head.appendChild(style);
    }

    let playlistRaw = [];
    let dirSet = new Set();
    let songCleanUrls = [];

    rawAudios.forEach((item) => {
        let src = typeof item === 'string' ? item : (item.url || item.src || item.path || '');
        let title = typeof item === 'object' ? (item.title || item.name) : '';

        if (src) {
            let cleanUrl = src.split('?')[0].split('#')[0];
            let rawName = cleanUrl.split('/').pop();
            let songName = title || decodeURIComponent(rawName).replace(/\.[^/.]+$/, "") || '音频文件';

            let lastSlashIndex = cleanUrl.lastIndexOf('/');
            let dirPath = lastSlashIndex !== -1 ? cleanUrl.substring(0, lastSlashIndex) : '.';
            
            dirSet.add(dirPath);
            songCleanUrls.push(cleanUrl);

            playlistRaw.push({
                name: songName,
                artist: '本地音频',
                url: src,
                cleanUrl: cleanUrl,
                dir: dirPath
            });
        }
    });

    if (playlistRaw.length === 0) return;

    let coverMap = {};
    let lyricMap = {};
    const defaultCover = './assets/img/Cover.png';

    // ==========================================
    // 核心逻辑：前端使用 Fetch HEAD 探测资源是否存在
    // ==========================================
    
    // 封装异步探测函数
    async function checkResourceExists(url) {
        try {
            // 使用 HEAD 方法只请求响应头，避免下载实质性文件，速度极快
            const response = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
            return response.ok; // 状态码 200-299 为 true，404 为 false
        } catch (e) {
            return false;
        }
    }

    // 1. 构建验证 Cover.jpg 的任务队列
    const coverChecks = Array.from(dirSet).map(async (dir) => {
        const coverPath = dir === '.' ? './Cover.jpg' : `${dir}/Cover.jpg`;
        const exists = await checkResourceExists(coverPath);
        coverMap[dir] = exists ? coverPath : defaultCover;
    });

    // 2. 构建验证 .lrc 歌词的任务队列
    const lyricChecks = songCleanUrls.map(async (songUrl) => {
        // 将后缀替换为 .lrc
        const lrcPath = songUrl.replace(/\.[^/.]+$/, ".lrc");
        const exists = await checkResourceExists(lrcPath);
        if (exists) {
            lyricMap[songUrl] = lrcPath;
        }
    });

    // 3. 并发执行所有网络探测任务（性能最优）
    await Promise.all([...coverChecks, ...lyricChecks]);

    // 4. 构建最终的数据结构给 APlayer
    const playlist = playlistRaw.map(song => {
        let songData = {
            name: song.name,
            artist: song.artist,
            url: song.url,
            cover: coverMap[song.dir] || defaultCover
        };
        // 如果成功探测到同名 .lrc 文件，则注入
        if (lyricMap[song.cleanUrl]) {
            songData.lrc = lyricMap[song.cleanUrl];
        }
        return songData;
    });

    const playerContainer = document.createElement('div');
    playerContainer.id = 'aplayer-container';
    
    const aplayerDiv = document.createElement('div');
    aplayerDiv.id = 'aplayer';
    playerContainer.appendChild(aplayerDiv);

    gallery.insertBefore(playerContainer, gallery.firstChild);

    if (typeof APlayer === 'undefined') {
        console.error('[APlayer] 未检测到 APlayer 库');
        return;
    }

    window.aplayerInstance = new APlayer({
        container: document.getElementById('aplayer'),
        fixed: false,
        autoplay: false,
        theme: '#0A84FF',
        loop: 'all',
        order: 'list',
        preload: 'metadata',
        volume: 0.7,
        mutex: true,
        listFolded: false, 
        listMaxHeight: 260,
        lrcType: 3, 
        audio: playlist
    });

    // UI 注入逻辑：在播放器渲染完毕后，追加侧边栏选项卡
    const aplayerDOM = document.getElementById('aplayer');
    if (aplayerDOM) {
        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'custom-aplayer-tabs';

const btnList = document.createElement('button');
btnList.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg> 列表';
btnList.className = 'active'; 

const btnLrc = document.createElement('button');
btnLrc.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-file-earmark-text" viewBox="0 0 16 16">
  <path d="M5.5 7a.5.5 0 0 0 0 1h5a.5.5 0 0 0 0-1zM5 9.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1-.5-.5m0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5"/>
  <path d="M9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4.5zm0 1v2A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/>
</svg> 歌词`;
        btnList.addEventListener('click', () => {
            aplayerDOM.classList.remove('show-lyrics');
            btnList.classList.add('active');
            btnLrc.classList.remove('active');
        });

        btnLrc.addEventListener('click', () => {
            aplayerDOM.classList.add('show-lyrics');
            btnLrc.classList.add('active');
            btnList.classList.remove('active');
        });

        tabsContainer.appendChild(btnList);
        tabsContainer.appendChild(btnLrc);
        aplayerDOM.appendChild(tabsContainer);
    }
}


window.galleryData = window.galleryData || {};

/* ===================== UI 交互控制逻辑 ===================== */
function initSidebar(){
    const sidebar=document.getElementById('sidebar'),
    toggleBtn=document.getElementById('sidebarToggle'),
    overlay=document.getElementById('sidebarOverlay');

    if(!sidebar||!toggleBtn||!overlay)return;

    window.toggleSidebar=function(){
        if(window.innerWidth<=768){
            sidebar.classList.toggle('open');
            overlay.classList.toggle('show');
        }else{
            sidebar.classList.toggle('collapsed');
        }
    };

    toggleBtn.addEventListener('click',toggleSidebar);
    overlay.addEventListener('click',()=>{
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
    });
}

if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',initSidebar);
}else{
    initSidebar();
}

/* ===================== 修改：初始化（支持多配置合并） ===================== */
function initializeApp() {
    const menu = document.getElementById('sidebarMenu');
    menu.innerHTML = '<li style="padding:20px;color:#999;">正在加载配置...</li>';

    window.galleryData = {}; // 重置为空对象，作为合并的基座

    // 1. 兼容旧版单文件配置：支持对象或数组形式
    if (window.gallerySettings) {
        const gallerySettingsList = Array.isArray(window.gallerySettings)
            ? window.gallerySettings
            : [window.gallerySettings];

        gallerySettingsList.forEach(config => {
            if (config) {
                deepMergeConfigs(window.galleryData, config);
            }
        });
    }

    // 2. 支持新版本：遍历并合并所有通过新生成器导出的配置文件
    if (window._galleryConfigs && Array.isArray(window._galleryConfigs)) {
        window._galleryConfigs.forEach(config => {
            deepMergeConfigs(window.galleryData, config);
        });
    }

    // 如果合并后没有数据，直接 return，保留页面默认状态
    if (!window.galleryData || Object.keys(window.galleryData).length === 0) {
        menu.innerHTML = '<li style="padding:20px;color:#999;">无可用图库</li>';
        return; 
    }

    renderSidebarTree();
}
// 确保在函数声明后执行
if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',initializeApp);
}else{
    initializeApp();
}

/* ===================== 侧栏渲染逻辑 ===================== */
function renderSidebarTree() {
    const menuContainer = document.getElementById('sidebarMenu');
    menuContainer.innerHTML = '';

    if (!window.galleryData || Object.keys(window.galleryData).length === 0) {
        menuContainer.innerHTML = '<li style="padding:20px;color:#999;">无可用图库</li>';
        return;
    }

    // 【核心修复】：针对 setting2.js 这种图片直接挂在根目录的异常情况
    if (window.galleryData._images && window.galleryData._images.length > 0) {
        window.galleryData._images.forEach(imgPath => {
            const parts = imgPath.split('/');
            const rootName = parts.length > 1 ? parts[0] : '未分类图库'; 
            
            if (!window.galleryData[rootName]) {
                window.galleryData[rootName] = {};
            }
            if (!window.galleryData[rootName]._images) {
                window.galleryData[rootName]._images = [];
            }
            if (!window.galleryData[rootName]._images.includes(imgPath)) {
                window.galleryData[rootName]._images.push(imgPath);
            }
        });
        delete window.galleryData._images; 
    }

    // 正常渲染侧边栏
    for (const [dbName, dbData] of Object.entries(window.galleryData)) {
        if (dbName === '_images') continue; 
        menuContainer.appendChild(buildTreeNodes(dbName, dbData));
    }
}

function buildTreeNodes(name, nodeData) {
    if (typeof nodeData !== 'object' || nodeData === null || Array.isArray(nodeData)) {
        return document.createElement('li');
    }

    const li = document.createElement('li');
    const itemDiv = document.createElement('div');
    itemDiv.className = 'tree-item';

    const hasSubDirs = Object.entries(nodeData).some(([k, v]) => 
        k !== '_images' && typeof v === 'object' && v !== null && !Array.isArray(v)
    );
    const hasImages = nodeData._images && nodeData._images.length > 0;

    itemDiv.innerHTML = `<span class="folder-icon">${hasSubDirs ? '▶' : '•'}</span> <span style="word-break: break-all;">${name}</span>`;
    li.appendChild(itemDiv);

    itemDiv.onclick = (e) => {
        e.stopPropagation();

        if (hasSubDirs) li.classList.toggle('folder-open');

        document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('active'));
        itemDiv.classList.add('active');

        if (hasImages) {
            renderGallery(name, nodeData._images);
            if (window.innerWidth <= 768) {
                const sidebar = document.getElementById('sidebar');
                const overlay = document.getElementById('sidebarOverlay');
                if (sidebar && overlay) {
                    sidebar.classList.remove('open');
                    overlay.classList.remove('show');
                }
            }
        }
    };

    if (hasSubDirs) {
        const ul = document.createElement('ul');
        for (const [subName, subData] of Object.entries(nodeData)) {
            if (subName === '_images') continue;
            
            if (typeof subData !== 'object' || subData === null || Array.isArray(subData)) {
                continue; 
            }
            
            ul.appendChild(buildTreeNodes(subName, subData));
        }
        li.appendChild(ul);
    }

    return li;
}

/* ===================== 图片渲染 ===================== */
function handleFolderSelect(event) {
    const files = event.target.files;
    if (!files.length) return;

    let tree = {};
    let root = "";

    const validExts = ['jpg','jpeg','png','gif','webp','mp4','webm','ogg','mov', 'mkv', 'mp3', 'wav', 'm4a', 'aac', 'flac', 'opus', 'oga', 'weba'];

    for (let file of files) {
        const ext = file.name.split('.').pop().toLowerCase();
        if (!validExts.includes(ext)) continue;
        const parts = file.webkitRelativePath.split('/');

        if (!root) root = parts[0];

        let cur = tree;

        for (let i = 0; i < parts.length - 1; i++) {
            const dir = parts[i];
            if (!cur[dir]) cur[dir] = {};
            cur = cur[dir];
        }

        if (!cur._images) cur._images = [];
        cur._images.push(file.webkitRelativePath);
    }

    function sortTree(node) {
        for (let key in node) {
            if (key === '_images') {
                node[key].sort((a, b) => {
                    const nameA = a.split('/').pop().toLowerCase();
                    const nameB = b.split('/').pop().toLowerCase();
                    return nameA.localeCompare(nameB, undefined, {numeric: true, sensitivity: 'base'});
                });
            } else if (typeof node[key] === 'object' && node[key] !== null) {
                sortTree(node[key]);
            }
        }
    }

    sortTree(tree);

    const js = `window._galleryConfigs = window._galleryConfigs || [];\nwindow._galleryConfigs.push(${JSON.stringify(tree, null, 4)});`;
    
    const fileName = root ? `${root}_config.js` : "setting.js";
    downloadFile(js, fileName);
    alert(`${fileName} 已生成！请替换后刷新页面。`);
}

function downloadFile(content, name) {
    const blob = new Blob([content], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

window.addEventListener('load', () => {
    const consoleInfo = `
发布地址：https://www.ximi.me/post-6044.html
版本：v1.06 
作者：希米
说明：本地图库，支持目录树浏览，原生体验，Telegraph风格，macOS化UI，支持移动端浏览。
更新时间：2036-07-14`;
    
    console.log("%c " + consoleInfo, "color: #555; font-size: 13px; line-height: 1.6; padding: 10px; background: #f0f0f0; border-radius: 5px;");
});

function deepMergeConfigs(target, source) {
    if (typeof source !== 'object' || source === null) return target;

    for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
            if (key === '_images') {
                target[key] = target[key] || [];
                target[key] = [...new Set([...target[key], ...source[key]])];
            } else if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
                target[key] = target[key] || {};
                deepMergeConfigs(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
    }
    return target;
}