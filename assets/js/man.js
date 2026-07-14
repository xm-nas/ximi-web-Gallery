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

/* ===================== 修改：renderGallery 函数内部拼接逻辑 ===================== */



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
    
    // 123.html 中的响应式栅格属性
    // const gridClasses = ['grid', 'grid-cols-2', 'sm:grid-cols-3', 'lg:grid-cols-4', 'xl:grid-cols-5', '2xl:grid-cols-6', 'gap-4'];
    // const itemClasses = ['w-6/12', 'sm:w-4/12', 'lg:w-3/12', 'xl:w-1/5', '2xl:w-2/12', 'p-2'];
    
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
    
    // 1. 分离图片与视频
    const images = [];
    const videos = [];
    const videoExts = ['mp4', 'webm', 'ogg', 'mov'];

    mediaArray.forEach(media => {
        const ext = media.split('.').pop().toLowerCase();
        if (videoExts.includes(ext)) {
            videos.push(media);
        } else {
            images.push(media);
        }
    });

    // 将视频拼接在图片之后，确保正确排序
    const allMedia = [...images, ...videos];

    // 2. 提前在下拉菜单挂载所有视频导航信息（并记录其所处的块索引）
    if (videos.length > 0 && dropdownContainer) {
        dropdownContainer.style.display = 'block';
        videos.forEach((vid) => {
            const globalIndex = images.length + videos.indexOf(vid); // 对应全量数组中的索引
            const targetChunk = Math.floor(globalIndex / 30); // 计算该视频所在的缓存块
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

    // 3. 将数组切分为每组30个的渲染块
    window.currentMediaChunks = [];
    for (let i = 0; i < allMedia.length; i += 30) {
        window.currentMediaChunks.push(allMedia.slice(i, i + 30));
    }

    // 4. 重置状态、清空容器并注入外部网格 DOM
    window.currentLightboxImages = [];
    window.currentRenderedChunk = 0;
    if (window.myMasonry) {
        window.myMasonry.destroy();
        window.myMasonry = null;
    }

    // const gridClasses = isWaterfallMode ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4' : '';
   const gridClasses = isWaterfallMode ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4' : '';

    content.innerHTML = `<div id="grid" class="ajax-container ${gridClasses}"></div>`;

    // 5. 渲染第一屏数据
    renderNextChunk();

    // // 6. 视频下拉框跳转事件（智能补全缺失页面）
    // if (videoSelect) {
    //     videoSelect.onchange = function() {
    //         if (!this.value) return;
    //         const targetChunk = parseInt(this.options[this.selectedIndex].dataset.chunk, 10);
            
    //         // 如果视频所在的数据块还未被用户滚出来，这里强制依次加载它
    //         while (window.currentRenderedChunk <= targetChunk) {
    //             renderNextChunk();
    //         }
            
    //         // 等待渲染和瀑布流重新布局完成后，执行跳转
    //         setTimeout(() => {
    //             const targetEl = document.getElementById(this.value);
    //             if (targetEl) {
    //                 targetEl.scrollIntoView({behavior: 'smooth', block: 'center'});
    //             }
    //         }, 300);
    //     };
    // }
// 6. 视频下拉框跳转事件（优化版：直接定位，不再顺序加载）
    if (videoSelect) {
        videoSelect.onchange = function() {
            if (!this.value) return;
            const targetChunk = parseInt(this.options[this.selectedIndex].dataset.chunk, 10);
            
            // --- 优化开始 ---
            // 1. 清空当前容器，彻底释放之前的 DOM 和内存
            const grid = document.getElementById('grid');
            grid.innerHTML = ''; 
            
            // 2. 销毁旧的 Masonry 实例，防止产生冗余布局
            if (window.myMasonry) {
                window.myMasonry.destroy();
                window.myMasonry = null;
            }

            // 3. 将全局渲染指针直接拨到目标块
            window.currentRenderedChunk = targetChunk;
            
            // 4. 只渲染目标数据块（这一步完成后，指针会自动自增，后续滚动加载不受影响）
            renderNextChunk();
            // --- 优化结束 ---
            
            // 5. 执行平滑跳转
            setTimeout(() => {
                const targetEl = document.getElementById(this.value);
                if (targetEl) {
                    targetEl.scrollIntoView({behavior: 'smooth', block: 'center'});
                }
            }, 300);
        };
    }

    // 7. 绑定滚动事件用于懒加载
    const mainContainer = document.querySelector('.main-content');
    if (mainContainer) {
        mainContainer.scrollTop = 0; 
        mainContainer.onscroll = function() {
            // 当滚动条距离底部不足 300px 时，加载下一页
            if (mainContainer.scrollTop + mainContainer.clientHeight >= mainContainer.scrollHeight - 300) {
                renderNextChunk();
            }
        };
    }
}

// 缓存块核心渲染逻辑
function renderNextChunk() {
    if (window.currentRenderedChunk >= window.currentMediaChunks.length) return;
    
    const chunkData = window.currentMediaChunks[window.currentRenderedChunk];
    const grid = document.getElementById('grid');
    const videoExts = ['mp4', 'webm', 'ogg', 'mov'];
    let htmlStr = '';
    
    // 定位当前的全局索引起始点
    const baseIndex = window.currentRenderedChunk * 30;
    
    // 如果处于瀑布流模式，赋予响应式断点类名
    // const itemClasses = isWaterfallMode 
    //     ? "media-item w-6/12 sm:w-4/12 lg:w-3/12 xl:w-1/5 2xl:w-2/12 ajax-post in-load in-loaded p-2" 
    //     : "media-item ajax-post in-load in-loaded";
    const itemClasses = isWaterfallMode 
        ? "media-item w-6/12 sm:w-4/12 lg:w-3/12 ajax-post in-load in-loaded p-2" 
        : "media-item ajax-post in-load in-loaded";

chunkData.forEach((media, index) => {
        const globalIndex = baseIndex + index;
        const fullName = media.split('/').pop().split('\\').pop();
       
        // const encodedPath = media.replace(/\\/g, '/').split('/').map(segment => encodeURIComponent(segment)).join('/');
       // 修改后
let encodedPath;
if (media.toLowerCase().startsWith('http')) {
    // 如果是网络链接，直接使用，不需要进行分段转码，防止协议头被破坏
    encodedPath = media; 
} else {
    // 如果是本地路径，保持原有的编码逻辑
    encodedPath = media.replace(/\\/g, '/').split('/').map(segment => encodeURIComponent(segment)).join('/');
}

        const ext = media.split('.').pop().toLowerCase();
        const isVideo = videoExts.includes(ext);

        if (!isVideo) {
            window.currentLightboxImages.push(encodedPath); // 灯箱数组按序累加
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
            htmlStr += `
                <div class="${itemClasses}" id="media-vid-${globalIndex}">
                    <figure style="margin:0; width: 100%;">
                        <div class="media-wrapper">
                            <div class="tg-spinner" id="spinner-${globalIndex}"></div>
                            <video class="lazy-image blur-load" src="${encodedPath}" title="${fullName}" controls preload="metadata" 
                                   onloadeddata="
                                      this.style.minHeight='auto'; 
                                      this.classList.remove('lazy-image', 'blur-load'); 
                                      this.classList.add('blur-loaded'); 
                                      const sp = document.getElementById('spinner-${globalIndex}'); if(sp) sp.remove(); 
                                      if(window.myMasonry) window.myMasonry.layout();
                                   " 
                                   style="width:100%; height:auto; display:block;"></video>
                        </div>
                        <div class="media-caption">${fullName}</div>
                    </figure>
                </div>
            `;
        }
    });
        
    // 解析并追加新的 DOM 节点
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlStr;
    const newElements = Array.from(tempDiv.children);
    newElements.forEach(el => grid.appendChild(el));

    // 通知 Masonry 处理追加的节点并排版
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

    // 块索引自增
    window.currentRenderedChunk++;
}


window.galleryData = window.galleryData || {};

/* ===================== UI 交互控制逻辑 ===================== */
const sidebar = document.getElementById('sidebar');
const toggleBtn = document.getElementById('sidebarToggle');
const overlay = document.getElementById('sidebarOverlay');

function toggleSidebar() {
    if (window.innerWidth <= 768) {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('show');
    } else {
        sidebar.classList.toggle('collapsed');
    }
}

// 绑定折叠按钮与遮罩层点击事件
toggleBtn.addEventListener('click', toggleSidebar);
overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
});


/* ===================== 修改：初始化（支持多配置合并） ===================== */
function initializeApp() {
    const menu = document.getElementById('sidebarMenu');
    menu.innerHTML = '<li style="padding:20px;color:#999;">正在加载配置...</li>';

    window.galleryData = {}; // 重置为空对象，作为合并的基座

    // 1. 兼容老版本：如果页面还引入了旧的单文件 setting.js
    if (window.gallerySettings) {
        deepMergeConfigs(window.galleryData, window.gallerySettings);
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
initializeApp();

/* ===================== 侧栏渲染逻辑 ===================== */
/* ===================== 修改：侧栏渲染逻辑（兼容并自动修复根目录游离的图片） ===================== */
function renderSidebarTree() {
    const menuContainer = document.getElementById('sidebarMenu');
    menuContainer.innerHTML = '';

    if (!window.galleryData || Object.keys(window.galleryData).length === 0) {
        menuContainer.innerHTML = '<li style="padding:20px;color:#999;">无可用图库</li>';
        return;
    }

    // 【核心修复】：针对 setting2.js 这种图片直接挂在根目录的异常情况
    // 自动从路径提取顶级文件夹名称，帮它们重新建好目录结构
    if (window.galleryData._images && window.galleryData._images.length > 0) {
        window.galleryData._images.forEach(imgPath => {
            const parts = imgPath.split('/');
            // 提取真实的顶级文件夹名称（例如："秀人网..."）
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
        // 数据归位后，清理掉游离的 _images 数组，避免干扰后续渲染
        delete window.galleryData._images; 
    }

    // 正常渲染侧边栏
    for (const [dbName, dbData] of Object.entries(window.galleryData)) {
        if (dbName === '_images') continue; // 额外保险
        menuContainer.appendChild(buildTreeNodes(dbName, dbData));
    }
}
/* ===================== 修改：侧栏节点渲染（带防死循环安全守卫） ===================== */
function buildTreeNodes(name, nodeData) {
    // 【安全守卫 1】：如果当前节点不是对象，或者是数组/null，直接返回空，防止基础类型数据引发无限递归
    if (typeof nodeData !== 'object' || nodeData === null || Array.isArray(nodeData)) {
        return document.createElement('li');
    }

    const li = document.createElement('li');
    const itemDiv = document.createElement('div');
    itemDiv.className = 'tree-item';

    // 【安全守卫 2】：严格检查，只有子属性是“纯对象”时，才承认它是子目录
    const hasSubDirs = Object.entries(nodeData).some(([k, v]) => 
        k !== '_images' && typeof v === 'object' && v !== null && !Array.isArray(v)
    );
    const hasImages = nodeData._images && nodeData._images.length > 0;

    // 使用干净的符号替代 Emoji
    itemDiv.innerHTML = `<span class="folder-icon">${hasSubDirs ? '▶' : '•'}</span> <span style="word-break: break-all;">${name}</span>`;
    li.appendChild(itemDiv);

    itemDiv.onclick = (e) => {
        e.stopPropagation();

        if (hasSubDirs) li.classList.toggle('folder-open');

        document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('active'));
        itemDiv.classList.add('active');

        if (hasImages) {
            renderGallery(name, nodeData._images);
            // 【手机端交互优化】：点击渲染图库后，自动收起侧边栏
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('open');
                overlay.classList.remove('show');
            }
        }
    };

    if (hasSubDirs) {
        const ul = document.createElement('ul');
        for (const [subName, subData] of Object.entries(nodeData)) {
            if (subName === '_images') continue;
            
            // 【安全守卫 3】：核心卡点，只对真正的子目录对象进行递归渲染
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

/* ===================== 修改：生成配置逻辑（修复顶级文件夹名称丢失 BUG） ===================== */
function handleFolderSelect(event) {
    const files = event.target.files;
    if (!files.length) return;

    let tree = {};
    let root = "";

    for (let file of files) {
        const ext = file.name.split('.').pop().toLowerCase();
        if (!['jpg','jpeg','png','gif','webp','mp4','webm','ogg','mov'].includes(ext)) continue;
        const parts = file.webkitRelativePath.split('/');

        if (!root) root = parts[0];

        let cur = tree;

        // 【核心修复】：将原本的 let i = 1 改为 let i = 0 
        // 强制把用户选择的顶级文件夹也作为目录树的一层节点！
        for (let i = 0; i < parts.length - 1; i++) {
            const dir = parts[i];
            if (!cur[dir]) cur[dir] = {};
            cur = cur[dir];
        }

        if (!cur._images) cur._images = [];
        cur._images.push(file.webkitRelativePath);
    }

    // 递归排序函数
    function sortTree(node) {
        for (let key in node) {
            if (key === '_images') {
                // 对图片路径按文件名进行自然排序
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
    
    // 生成配置名时，使用提取到的根目录名，避免互相覆盖
    const fileName = root ? `${root}_config.js` : "setting.js";
    downloadFile(js, fileName);
    alert(`${fileName} 已生成！请替换后刷新页面。`);
}

/* ===================== download ===================== */
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

/* ===================== 控制台致敬信息 ===================== */
window.addEventListener('load', () => {
    const consoleInfo = `
发布地址：https://www.ximi.me/post-6044.html
版本：v1.06 
作者：希米
说明：本地图库，支持目录树浏览，原生体验，Telegraph风格，macOS化UI，支持移动端浏览。
更新时间：2036-07-14`;
    
    console.log("%c " + consoleInfo, "color: #555; font-size: 13px; line-height: 1.6; padding: 10px; background: #f0f0f0; border-radius: 5px;");
});

/* ===================== 修改：深度合并多文件配置（强化类型过滤） ===================== */
function deepMergeConfigs(target, source) {
    if (typeof source !== 'object' || source === null) return target;

    for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
            if (key === '_images') {
                target[key] = target[key] || [];
                // 合并图片数组并去重
                target[key] = [...new Set([...target[key], ...source[key]])];
            } else if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
                // 【核心修改】：必须确保源数据是纯对象（非数组），才建立子树进行深层合并
                target[key] = target[key] || {};
                deepMergeConfigs(target[key], source[key]);
            } else {
                // 如果是字符串、数字或普通属性，直接覆盖，不作为目录树递归
                target[key] = source[key];
            }
        }
    }
    return target;
}
